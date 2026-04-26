import { createClient } from '@/lib/platform/auth/supabase/server';
import { prisma } from '@/lib/platform/db/prisma';
import { NextResponse } from 'next/server';
import { DASHBOARD_CONFIG } from '@/lib/features/dashboard/config';
import { logger } from '@/lib/shared/logger/logger';

/**
 * GET /api/dashboard
 * Get dashboard statistics and user's articles
 */
export async function GET() {
  const start = Date.now();

  try {
    // 1. Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Ensure user exists in local database (sync Supabase Auth -> Prisma)
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email! },
      create: {
        id: user.id,
        email: user.email!,
      },
    });

    // 3. Get user's articles through UserArticle relationship
    const userArticles = await prisma.userArticle.findMany({
      where: { userId: user.id },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            takeaways: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: DASHBOARD_CONFIG.ARTICLES_PER_PAGE,
    });

    // 4. Calculate statistics
    const articles = userArticles.map((ua) => ua.article);
    const totalInsights = articles.reduce(
      (sum, article) => sum + article.takeaways.length,
      0
    );
    const avgInsights =
      articles.length > 0 ? Math.round(totalInsights / articles.length) : 0;

    // 5. Get total count (for pagination)
    const totalCount = await prisma.userArticle.count({
      where: { userId: user.id },
    });

    logger.debug(
      {
        userId: user.id,
        articlesCount: articles.length,
        totalCount,
        durationMs: Date.now() - start,
      },
      'Dashboard data fetched'
    );

    // 6. Format response
    return NextResponse.json({
      stats: {
        articlesAnalyzed: articles.length,
        totalInsights,
        avgInsightsPerArticle: avgInsights,
        totalCount,
      },
      articles: articles.map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        insightsCount: article.takeaways.length,
        createdAt: article.createdAt,
      })),
    });
  } catch (error) {
    logger.error(
      {
        err: error,
        durationMs: Date.now() - start,
      },
      'Dashboard request failed'
    );

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to fetch dashboard data',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
