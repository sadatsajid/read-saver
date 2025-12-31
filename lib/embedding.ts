import { openai, EMBEDDING_MODEL } from './openai';

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate if too long (max 8191 tokens for text-embedding-3-small)
  const maxChars = 32000; // ~8k tokens
  const truncated = text.slice(0, maxChars);

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncated,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batch processing)
 * OpenAI allows up to 2048 inputs per request
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const batchSize = 100; // Conservative batch size
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Truncate each text
    const truncatedBatch = batch.map((text) => text.slice(0, 32000));

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedBatch,
      encoding_format: 'float',
    });

    // OpenAI returns embeddings in the same order as input
    allEmbeddings.push(...response.data.map((d) => d.embedding));

    // Rate limiting: small delay between batches
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return allEmbeddings;
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns value between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

