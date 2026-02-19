import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractArticle } from '@/lib/extraction';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddings } from '@/lib/embedding';
import { generateSummary } from '@/lib/summarization';
import { createClient } from '@/lib/supabase/server';
import { INGEST_CONFIG } from '@/lib/ingest-config';
import {
  insertChunk,
  createUserArticleRelationship,
} from '@/lib/chunk-storage';

const IngestRequestSchema = z.object({
  url: z.string().url('Please provide a valid URL'),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const { url, userId: requestUserId } = IngestRequestSchema.parse(body);

    // 2. Get authenticated user (if any)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2a. Ensure user exists in local database (sync Supabase Auth -> Prisma)
    const userId: string | undefined = user?.id || requestUserId;

    if (userId && user?.email) {
      // Upsert user to ensure they exist in local database
      await prisma.user.upsert({
        where: { id: userId },
        update: { email: user.email },
        create: {
          id: userId,
          email: user.email,
        },
      });
    }

    // 3. Check if article already exists
    const existing = await prisma.article.findFirst({
      where: { url },
      select: {
        id: true,
        title: true,
        summary: true,
        takeaways: true,
        outline: true,
      },
    });

    // 4. Handle existing article - create relationship if user is authenticated
    if (existing) {
      if (userId) {
        await createUserArticleRelationship(prisma, userId, existing.id);
      }

      return NextResponse.json({
        articleId: existing.id,
        title: existing.title,
        summary: JSON.parse(existing.summary),
        cached: true,
      });
    }

    // 5. Extract article content
    console.log('[Ingest] Extracting article from:', url);
    const article = await extractArticle(url);

    // 6. Validate content size (prevent OOM)
    const contentSizeBytes = Buffer.byteLength(article.content, 'utf8');
    const contentSizeMB = contentSizeBytes / (1024 * 1024);

    console.log(`[Ingest] Article size: ${contentSizeMB.toFixed(2)}MB`);

    if (contentSizeMB > INGEST_CONFIG.MAX_CONTENT_MB) {
      throw new Error(
        `Article content is too large (${contentSizeMB.toFixed(1)}MB). Maximum supported size is ${INGEST_CONFIG.MAX_CONTENT_MB}MB. Please try a shorter article.`
      );
    }

    // 7. Generate summary
    console.log('[Ingest] Generating summary...');
    const summary = await generateSummary(article.title, article.content);

    // 8. Create article in database first (without chunks)
    console.log('[Ingest] Saving article metadata...');
    const savedArticle = await prisma.article.create({
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

    // 9. Process chunks in batches to avoid memory exhaustion
    console.log('[Ingest] Chunking content...');
    const chunks = chunkText(article.content, {
      maxChars: INGEST_CONFIG.CHUNK_MAX_CHARS,
      overlap: INGEST_CONFIG.CHUNK_OVERLAP,
    });
    console.log(`[Ingest] Created ${chunks.length} chunks`);

    // Process and store chunks in batches
    let processedChunks = 0;

    for (let i = 0; i < chunks.length; i += INGEST_CONFIG.BATCH_SIZE) {
      const batchEnd = Math.min(i + INGEST_CONFIG.BATCH_SIZE, chunks.length);
      const batch = chunks.slice(i, batchEnd);

      console.log(
        `[Ingest] Processing chunks ${i + 1}-${batchEnd} of ${chunks.length}...`
      );

      // Generate embeddings for this batch
      const embeddings = await generateEmbeddings(
        batch.map((c) => c.content)
      );

      // Store this batch to database using safe parameterized queries
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];

        await insertChunk(
          prisma,
          savedArticle.id,
          chunk.content,
          embedding,
          chunk.index
        );
      }

      processedChunks += batch.length;

      // Explicit cleanup hint for V8 garbage collector
      if (global.gc) {
        global.gc();
      }
    }

    console.log(
      `[Ingest] Article processed successfully: ${savedArticle.id} (${processedChunks} chunks)`
    );

    // 10. Track user-article relationship if user is authenticated
    if (userId) {
      const created = await createUserArticleRelationship(
        prisma,
        userId,
        savedArticle.id
      );
      if (created) {
        console.log(
          `[Ingest] User-article relationship created: ${userId} -> ${savedArticle.id}`
        );
      }
    }

    return NextResponse.json({
      articleId: savedArticle.id,
      title: savedArticle.title,
      summary,
      cached: false,
    });
  } catch (error) {
    console.error('[Ingest] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to process article',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Increase timeout for article processing (Vercel Pro allows up to 300s)
export const maxDuration = 60;
