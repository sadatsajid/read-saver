import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/dashboard
 * Get dashboard statistics and user's articles
 */
export async function GET() {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in local database (sync Supabase Auth -> Prisma)
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email! },
      create: {
        id: user.id,
        email: user.email!,
      },
    });

    // Get user's articles through UserArticle relationship
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
      take: 50,
    });

    // Calculate statistics
    const articles = userArticles.map((ua: typeof userArticles[0]) => ua.article);
    const totalInsights = articles.reduce(
      (sum: number, a: typeof articles[0]) => sum + a.takeaways.length,
      0
    );
    const avgInsights =
      articles.length > 0 ? Math.round(totalInsights / articles.length) : 0;

    // Get total count (for pagination)
    const totalCount = await prisma.userArticle.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      stats: {
        articlesAnalyzed: articles.length,
        totalInsights,
        avgInsightsPerArticle: avgInsights,
        totalCount,
      },
      articles: articles.map((article: typeof articles[0]) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        insightsCount: article.takeaways.length,
        createdAt: article.createdAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

