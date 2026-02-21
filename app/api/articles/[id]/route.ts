import { createClient } from '@/lib/platform/auth/supabase/server';
import { prisma } from '@/lib/platform/db/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * DELETE /api/articles/[id]
 * Remove article from user's collection (delete UserArticle relationship)
 * The article itself remains in the database for other users
 * Requires authentication
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // 1. Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // 3. Check if user has this article in their collection
    const userArticle = await prisma.userArticle.findUnique({
      where: {
        userId_articleId: {
          userId: user.id,
          articleId: id,
        },
      },
    });

    if (!userArticle) {
      return NextResponse.json(
        { error: 'Article not found in your collection' },
        { status: 404 }
      );
    }

    // 4. Delete the user-article relationship (article remains for other users)
    await prisma.userArticle.delete({
      where: {
        userId_articleId: {
          userId: user.id,
          articleId: id,
        },
      },
    });

    console.log(
      `[Articles] Article removed from collection: ${user.id} -> ${id}`
    );

    return NextResponse.json({
      message: 'Article removed from your collection',
      articleId: id,
    });
  } catch (error) {
    console.error('[Articles] Delete error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to remove article',
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

/**
 * GET /api/articles/[id]
 * Get article details
 * Public access, but checks ownership for additional metadata
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 1. Get authenticated user (if any)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Fetch article from database
    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        url: true,
        summary: true,
        takeaways: true,
        outline: true,
        createdAt: true,
        userId: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // 3. Parse summary JSON (stored as string in database)
    let parsedSummary;
    try {
      parsedSummary = JSON.parse(article.summary);
    } catch {
      // Fallback if summary is invalid JSON
      parsedSummary = { tldr: [], takeaways: [], outline: [] };
    }

    // 4. Check if user is the owner
    const isOwner = user && article.userId === user.id;

    // 5. Return article with parsed summary
    return NextResponse.json({
      id: article.id,
      title: article.title,
      url: article.url,
      summary: parsedSummary,
      takeaways: article.takeaways,
      outline: article.outline,
      createdAt: article.createdAt,
      isOwner,
    });
  } catch (error) {
    console.error('[Articles] Get error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to get article',
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
