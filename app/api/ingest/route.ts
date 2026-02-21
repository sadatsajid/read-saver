import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { createArticleIngestionService } from '@/lib/services/article-ingestion-service';

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

    // 3. Delegate ingest pipeline to dedicated service.
    const ingestionService = createArticleIngestionService(prisma);
    const result = await ingestionService.ingest({
      url,
      userId,
    });

    return NextResponse.json({
      articleId: result.articleId,
      title: result.title,
      summary: result.summary,
      cached: result.cached,
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
