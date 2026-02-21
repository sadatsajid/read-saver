import {
  chunkText,
  type TextChunk,
} from '@/lib/features/vectorization/chunking';
import { INGEST_CONFIG } from '@/lib/features/ingest/config';

export interface ChunkingService {
  chunk(content: string): TextChunk[];
}

class LocalChunkingService implements ChunkingService {
  chunk(content: string): TextChunk[] {
    return chunkText(content, {
      maxChars: INGEST_CONFIG.CHUNK_MAX_CHARS,
      overlap: INGEST_CONFIG.CHUNK_OVERLAP,
    });
  }
}

export function createChunkingService(): ChunkingService {
  return new LocalChunkingService();
}
