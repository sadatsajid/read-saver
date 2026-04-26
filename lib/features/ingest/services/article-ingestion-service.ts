import type { PrismaClient } from '@prisma/client';
import { extractArticle } from '@/lib/features/ingest/extraction';
import {
  generateSummary,
  type ArticleSummary,
} from '@/lib/features/ingest/summarization';
import { INGEST_CONFIG } from '@/lib/features/ingest/config';
import { createUserArticleRelationship } from '@/lib/features/articles/repositories/user-article-repository';
import { prisma as defaultPrisma } from '@/lib/platform/db/prisma';
import {
  createVectorizationService,
  type VectorizationService,
} from '@/lib/features/vectorization/services/vectorization-service';
import { logger } from '@/lib/shared/logger/logger';

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

export interface ArticleIngestionServiceDeps {
  vectorizationService?: VectorizationService;
}

class LocalArticleIngestionService implements ArticleIngestionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly vectorizationService: VectorizationService
  ) {}

  async ingest({
    url,
    userId,
  }: IngestArticleInput): Promise<IngestArticleResult> {
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
    logger.info({ url }, 'Extracting article');
    const article = await extractArticle(url);

    // 3. Guardrail: content size
    const contentSizeBytes = Buffer.byteLength(article.content, 'utf8');
    const contentSizeMB = contentSizeBytes / (1024 * 1024);

    logger.debug({ contentSizeMB }, 'Extracted article size calculated');

    if (contentSizeMB > INGEST_CONFIG.MAX_CONTENT_MB) {
      throw new Error(
        `Article content is too large (${contentSizeMB.toFixed(1)}MB). Maximum supported size is ${INGEST_CONFIG.MAX_CONTENT_MB}MB. Please try a shorter article.`
      );
    }

    // 4. Summarize
    logger.info({ title: article.title }, 'Generating article summary');
    const summary = await generateSummary(article.title, article.content);

    // 5. Save article metadata
    logger.info({ title: article.title }, 'Saving article metadata');
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

    // 6. Chunk + embed + store vectors
    logger.info(
      { articleId: savedArticle.id },
      'Starting article vectorization'
    );
    const vectorizationResult = await this.vectorizationService.processAndStore(
      {
        articleId: savedArticle.id,
        content: article.content,
      }
    );

    if (userId) {
      const created = await createUserArticleRelationship(
        this.prisma,
        userId,
        savedArticle.id
      );
      if (created) {
        logger.info(
          {
            userId,
            articleId: savedArticle.id,
          },
          'User-article relationship created'
        );
      }
    }

    logger.info(
      {
        articleId: savedArticle.id,
        processedChunks: vectorizationResult.processedChunks,
        chunkCount: vectorizationResult.chunkCount,
      },
      'Article processed successfully'
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
  prismaClient: PrismaClient = defaultPrisma,
  deps: ArticleIngestionServiceDeps = {}
): ArticleIngestionService {
  const vectorizationService =
    deps.vectorizationService ?? createVectorizationService(prismaClient);

  return new LocalArticleIngestionService(prismaClient, vectorizationService);
}
