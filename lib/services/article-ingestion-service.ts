import type { PrismaClient } from '@prisma/client';
import { extractArticle } from '@/lib/extraction';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddings } from '@/lib/embedding';
import { generateSummary, type ArticleSummary } from '@/lib/summarization';
import { INGEST_CONFIG } from '@/lib/ingest-config';
import {
  createUserArticleRelationship,
  insertChunk,
} from '@/lib/chunk-storage';
import { prisma as defaultPrisma } from '@/lib/db';

export interface IngestArticleInput {
  url: string;
  userId?: string;
}

export interface IngestArticleResult {
  articleId: string;
  title: string;
  summary: ArticleSummary;
  cached: boolean;
}

export interface ArticleIngestionService {
  ingest(input: IngestArticleInput): Promise<IngestArticleResult>;
}

class LocalArticleIngestionService implements ArticleIngestionService {
  constructor(private readonly prisma: PrismaClient) {}

  async ingest({ url, userId }: IngestArticleInput): Promise<IngestArticleResult> {
    // 1. Check cache first
    const existing = await this.prisma.article.findFirst({
      where: { url },
      select: {
        id: true,
        title: true,
        summary: true,
      },
    });

    if (existing) {
      if (userId) {
        await createUserArticleRelationship(this.prisma, userId, existing.id);
      }

      return {
        articleId: existing.id,
        title: existing.title,
        summary: JSON.parse(existing.summary) as ArticleSummary,
        cached: true,
      };
    }

    // 2. Extract content
    console.log('[IngestService] Extracting article from:', url);
    const article = await extractArticle(url);

    // 3. Guardrail: content size
    const contentSizeBytes = Buffer.byteLength(article.content, 'utf8');
    const contentSizeMB = contentSizeBytes / (1024 * 1024);

    console.log(`[IngestService] Article size: ${contentSizeMB.toFixed(2)}MB`);

    if (contentSizeMB > INGEST_CONFIG.MAX_CONTENT_MB) {
      throw new Error(
        `Article content is too large (${contentSizeMB.toFixed(1)}MB). Maximum supported size is ${INGEST_CONFIG.MAX_CONTENT_MB}MB. Please try a shorter article.`
      );
    }

    // 4. Summarize
    console.log('[IngestService] Generating summary...');
    const summary = await generateSummary(article.title, article.content);

    // 5. Save article metadata
    console.log('[IngestService] Saving article metadata...');
    const savedArticle = await this.prisma.article.create({
      data: {
        url: article.url,
        title: article.title,
        content: article.content,
        summary: JSON.stringify(summary),
        takeaways: summary.takeaways,
        outline: summary.outline,
        userId: userId || null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    // 6. Chunking
    console.log('[IngestService] Chunking content...');
    const chunks = chunkText(article.content, {
      maxChars: INGEST_CONFIG.CHUNK_MAX_CHARS,
      overlap: INGEST_CONFIG.CHUNK_OVERLAP,
    });

    console.log(`[IngestService] Created ${chunks.length} chunks`);

    // 7. Embeddings + storage in batches
    let processedChunks = 0;

    for (let i = 0; i < chunks.length; i += INGEST_CONFIG.BATCH_SIZE) {
      const batchEnd = Math.min(i + INGEST_CONFIG.BATCH_SIZE, chunks.length);
      const batch = chunks.slice(i, batchEnd);

      console.log(
        `[IngestService] Processing chunks ${i + 1}-${batchEnd} of ${chunks.length}...`
      );

      const embeddings = await generateEmbeddings(batch.map((c) => c.content));

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];

        await insertChunk(
          this.prisma,
          savedArticle.id,
          chunk.content,
          embedding,
          chunk.index
        );
      }

      processedChunks += batch.length;

      // Optional V8 cleanup hint in long-running Node processes
      if (global.gc) {
        global.gc();
      }
    }

    if (userId) {
      const created = await createUserArticleRelationship(
        this.prisma,
        userId,
        savedArticle.id
      );
      if (created) {
        console.log(
          `[IngestService] User-article relationship created: ${userId} -> ${savedArticle.id}`
        );
      }
    }

    console.log(
      `[IngestService] Article processed successfully: ${savedArticle.id} (${processedChunks} chunks)`
    );

    return {
      articleId: savedArticle.id,
      title: savedArticle.title,
      summary,
      cached: false,
    };
  }
}

export function createArticleIngestionService(
  prismaClient: PrismaClient = defaultPrisma
): ArticleIngestionService {
  return new LocalArticleIngestionService(prismaClient);
}
