import { generateEmbeddings } from '@/lib/features/vectorization/embedding';

export interface EmbeddingService {
  embedBatch(texts: string[]): Promise<number[][]>;
}

class LocalEmbeddingService implements EmbeddingService {
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    return generateEmbeddings(texts);
  }
}

export function createEmbeddingService(): EmbeddingService {
  return new LocalEmbeddingService();
}
