import { PrismaClient } from '@prisma/client';

/**
 * Safely insert a chunk with embedding into the database
 * Uses parameterized queries to prevent SQL injection
 * Note: Embedding string is validated numeric data, formatted for pgvector compatibility
 */
export async function insertChunk(
  prisma: PrismaClient,
  articleId: string,
  content: string,
  embedding: number[],
  chunkIndex: number
): Promise<void> {
  // Validate embedding is numeric array
  if (
    !Array.isArray(embedding) ||
    embedding.some((v) => typeof v !== 'number' || !isFinite(v))
  ) {
    throw new Error('Invalid embedding: must be array of finite numbers');
  }

  // Format embedding array as pgvector-compatible string: [0.1,0.2,0.3,...]
  // This is safe because we've validated it's a numeric array
  const embeddingString = '[' + embedding.join(',') + ']';

  // Use parameterized query with $1, $2, etc. for user input (articleId, content, chunkIndex)
  // Embedding string is validated numeric data, so safe to format directly
  await prisma.$executeRawUnsafe(
    `INSERT INTO "chunks" ("id", "articleId", "content", "embedding", "chunkIndex")
     VALUES (
       gen_random_uuid(),
       $1::text,
       $2::text,
       $3::vector,
       $4::integer
     )`,
    articleId,
    content,
    embeddingString,
    chunkIndex
  );
}

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

