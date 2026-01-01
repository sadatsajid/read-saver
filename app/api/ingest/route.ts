import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractArticle } from '@/lib/extraction';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddings } from '@/lib/embedding';
import { generateSummary } from '@/lib/summarization';
import { createClient } from '@/lib/supabase/server';

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

    // 4. Track user-article relationship if user is authenticated and article exists
    if (userId && existing) {
      try {
        // Attempt to create relationship (will fail silently if already exists)
        await prisma.userArticle.create({
          data: {
            userId,
            articleId: existing.id,
          },
        });
      } catch (relationError: unknown) {
        // Ignore unique constraint errors (relationship already exists)
        if (
          relationError instanceof Error &&
          'code' in relationError &&
          relationError.code !== 'P2002'
        ) {
          console.error('Error creating user-article relationship:', relationError);
        }
      }

      return NextResponse.json({
        articleId: existing.id,
        title: existing.title,
        summary: JSON.parse(existing.summary),
        cached: true,
      });
    }

    if (existing) {
      return NextResponse.json({
        articleId: existing.id,
        title: existing.title,
        summary: JSON.parse(existing.summary),
        cached: true,
      });
    }

    // 4. Extract article content
    console.log('Extracting article from:', url);
    const article = await extractArticle(url);

    // 5. Validate content size (prevent OOM)
    const contentSizeBytes = Buffer.byteLength(article.content, 'utf8');
    const contentSizeMB = contentSizeBytes / (1024 * 1024);
    const MAX_CONTENT_MB = 2;

    console.log(`Article size: ${contentSizeMB.toFixed(2)}MB`);

    if (contentSizeMB > MAX_CONTENT_MB) {
      throw new Error(
        `Article content is too large (${contentSizeMB.toFixed(1)}MB). Maximum supported size is ${MAX_CONTENT_MB}MB. Please try a shorter article.`
      );
    }

    // 6. Generate summary
    console.log('Generating summary...');
    const summary = await generateSummary(article.title, article.content);

    // 7. Create article in database first (without chunks)
    console.log('Saving article metadata...');
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

    // 8. Process chunks in batches to avoid memory exhaustion
    console.log('Chunking content...');
    const chunks = chunkText(article.content, {
      maxChars: 1000,
      overlap: 200,
    });
    console.log(`Created ${chunks.length} chunks`);

    // Process and store chunks in batches
    const BATCH_SIZE = 100;
    let processedChunks = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, chunks.length);
      const batch = chunks.slice(i, batchEnd);

      console.log(
        `Processing chunks ${i + 1}-${batchEnd} of ${chunks.length}...`
      );

      // Generate embeddings for this batch
      const embeddings = await generateEmbeddings(batch.map((c) => c.content));

      // Store this batch to database using raw SQL (Prisma doesn't support pgvector in createMany)
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];

        // Format embedding array as pgvector-compatible string: [0.1,0.2,0.3,...]
        // Escape single quotes in content to prevent SQL injection
        const embeddingString = '[' + embedding.join(',') + ']';
        const escapedContent = chunk.content.replace(/'/g, "''");
        
        // Use $executeRawUnsafe with all values interpolated
        // (embedding is a numeric array, so safe from SQL injection)
        await prisma.$executeRawUnsafe(
          `INSERT INTO "chunks" ("id", "articleId", "content", "embedding", "chunkIndex")
           VALUES (
             gen_random_uuid(),
             '${savedArticle.id.replace(/'/g, "''")}',
             '${escapedContent}',
             '${embeddingString}'::vector,
             ${chunk.index}
           )`
        );
      }

      processedChunks += batch.length;

      // Explicit cleanup hint for V8 garbage collector
      if (global.gc) {
        global.gc();
      }
    }

    console.log(
      `Article processed successfully: ${savedArticle.id} (${processedChunks} chunks)`
    );

    // 9. Track user-article relationship if user is authenticated
    if (userId) {
      try {
        await prisma.userArticle.create({
          data: {
            userId,
            articleId: savedArticle.id,
          },
        });
        console.log(`User-article relationship created: ${userId} -> ${savedArticle.id}`);
      } catch (relationError: unknown) {
        // Ignore unique constraint errors (relationship already exists)
        if (
          relationError instanceof Error &&
          'code' in relationError &&
          relationError.code !== 'P2002'
        ) {
          console.error('Error creating user-article relationship:', relationError);
        }
      }
    }

    return NextResponse.json({
      articleId: savedArticle.id,
      title: savedArticle.title,
      summary,
      cached: false,
    });
  } catch (error) {
    console.error('Ingestion error:', error);

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
export const maxDuration = 60; // 60 seconds

