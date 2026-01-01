import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
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

    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if user has this article in their collection
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

    // Delete the user-article relationship (article remains for other users)
    await prisma.userArticle.delete({
      where: {
        userId_articleId: {
          userId: user.id,
          articleId: id,
        },
      },
    });

    // Optional: If article has no more user relationships and no userId, consider deleting it
    // For now, we'll keep articles even if no users reference them (for caching)

    return NextResponse.json({
      message: 'Article removed from your collection',
      articleId: id,
    });
  } catch (error) {
    console.error('Delete article error:', error);
    return NextResponse.json(
      { error: 'Failed to remove article' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/articles/[id]
 * Get article details
 * Public for now, but checks ownership for additional metadata
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if user is the owner
    const isOwner = user && article.userId === user.id;

    return NextResponse.json({
      ...article,
      isOwner,
    });
  } catch (error) {
    console.error('Get article error:', error);
    return NextResponse.json(
      { error: 'Failed to get article' },
      { status: 500 }
    );
  }
}

