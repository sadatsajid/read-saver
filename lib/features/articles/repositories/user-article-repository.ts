import { PrismaClient } from '@prisma/client';

/**
 * Helper to safely create user-article relationship
 * Silently handles duplicate constraint errors
 */
export async function createUserArticleRelationship(
  prisma: PrismaClient,
  userId: string,
  articleId: string
): Promise<boolean> {
  try {
    await prisma.userArticle.create({
      data: {
        userId,
        articleId,
      },
    });
    return true;
  } catch (error: unknown) {
    // Ignore unique constraint errors (relationship already exists)
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return false; // Already exists
    }
    // Re-throw other errors
    throw error;
  }
}
