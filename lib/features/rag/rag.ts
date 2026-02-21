import { prisma } from '@/lib/platform/db/prisma';
import { generateEmbedding } from '@/lib/features/vectorization/embedding';

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  similarity: number;
}

/**
 * Retrieve relevant chunks from an article using vector similarity search
 */
export async function retrieveRelevantChunks(
  articleId: string,
  question: string,
  topK: number = 5,
  minSimilarity?: number
): Promise<RetrievedChunk[]> {
  // 1. Generate embedding for the question
  const questionEmbedding = await generateEmbedding(question);

  // 2. Format embedding array as pgvector-compatible string: [0.1,0.2,0.3,...]
  const embeddingString = '[' + questionEmbedding.join(',') + ']';

  // 3. Query pgvector for similar chunks
  // Using raw SQL because Prisma doesn't fully support pgvector syntax yet
  // Format embedding string directly in SQL (safe since it's a numeric array)
  // Try direct vector comparison first, fallback to text cast if needed
  let chunks: Array<{
    id: string;
    content: string;
    chunkIndex: number;
    similarity: number;
  }> = [];

  try {
    // First try: assume embeddings are stored as VECTOR type
    chunks = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        chunkIndex: number;
        similarity: number;
      }>
    >(
      `SELECT
        id,
        content,
        "chunkIndex",
        1 - (embedding <=> '${embeddingString}'::vector) as similarity
      FROM "chunks"
      WHERE "articleId" = $1
        AND embedding IS NOT NULL
      ORDER BY similarity DESC
      LIMIT $2`,
      articleId,
      topK
    );
  } catch (error: unknown) {
    // If that fails, try casting from TEXT to VECTOR
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('operator does not exist') || errorMessage.includes('cannot cast')) {
      console.warn('Embeddings may be stored as TEXT, attempting cast...');
      chunks = await prisma.$queryRawUnsafe<
        Array<{
          id: string;
          content: string;
          chunkIndex: number;
          similarity: number;
        }>
      >(
        `SELECT
          id,
          content,
          "chunkIndex",
          1 - (embedding::text::vector <=> '${embeddingString}'::vector) as similarity
        FROM "chunks"
        WHERE "articleId" = $1
          AND embedding IS NOT NULL
        ORDER BY similarity DESC
        LIMIT $2`,
        articleId,
        topK
      );
    } else {
      throw error;
    }
  }

  const mapped = chunks.map((chunk: RetrievedChunk) => ({
    id: chunk.id,
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    similarity: Number(chunk.similarity),
  }));

  if (minSimilarity === undefined) {
    return mapped;
  }

  const filtered = mapped.filter((chunk) => chunk.similarity >= minSimilarity);
  return filtered.length > 0 ? filtered : mapped;
}

/**
 * Format retrieved chunks for LLM context
 * Adds citation markers and structures the context
 */
export function formatContextForLLM(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'No relevant context found.';
  }

  // Sort by chunk index to maintain article flow
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  return sorted
    .map((chunk, i) => {
      const citation = `[${i + 1}]`;
      return `${citation} ${chunk.content}`;
    })
    .join('\n\n');
}

/**
 * Format chunks as citations for display to user
 */
export function formatCitations(chunks: RetrievedChunk[]): Array<{
  id: string;
  text: string;
  index: number;
  similarity: number;
}> {
  return chunks.map((chunk, i) => ({
    id: chunk.id,
    text: chunk.content.slice(0, 200) + '...', // Truncate for display
    index: i + 1,
    similarity: chunk.similarity,
  }));
}

/**
 * Retrieve chunks with metadata (includes article info)
 */
export async function retrieveWithMetadata(
  articleId: string,
  question: string,
  topK: number = 5
): Promise<{
  chunks: RetrievedChunk[];
  article: {
    id: string;
    title: string;
    url: string;
  } | null;
}> {
  const [chunks, article] = await Promise.all([
    retrieveRelevantChunks(articleId, question, topK),
    prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true, url: true },
    }),
  ]);

  return { chunks, article };
}

/**
 * Check if question is answerable based on retrieved context
 */
export function isQuestionAnswerable(
  chunks: RetrievedChunk[],
  minSimilarity: number = 0.75
): boolean {
  if (chunks.length === 0) return false;

  // Check if at least one chunk has high similarity
  return chunks.some((chunk) => chunk.similarity >= minSimilarity);
}
