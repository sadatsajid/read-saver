import type { PrismaClient } from '@prisma/client';
import { insertChunk } from '@/lib/features/vectorization/repositories/chunk-repository';
import { INGEST_CONFIG } from '@/lib/features/ingest/config';
import { prisma as defaultPrisma } from '@/lib/platform/db/prisma';
import {
  createChunkingService,
  type ChunkingService,
} from '@/lib/features/vectorization/services/chunking-service';
import {
  createEmbeddingService,
  type EmbeddingService,
} from '@/lib/features/vectorization/services/embedding-service';

export interface VectorizationInput {
  articleId: string;
  content: string;
}

export interface VectorizationResult {
  chunkCount: number;
  processedChunks: number;
}

export interface VectorizationService {
  processAndStore(input: VectorizationInput): Promise<VectorizationResult>;
}

export interface VectorizationServiceDeps {
  chunkingService?: ChunkingService;
  embeddingService?: EmbeddingService;
}

class LocalVectorizationService implements VectorizationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async processAndStore({
    articleId,
    content,
  }: VectorizationInput): Promise<VectorizationResult> {
    const chunks = this.chunkingService.chunk(content);
    console.log(`[VectorizationService] Created ${chunks.length} chunks`);

    let processedChunks = 0;

    for (let i = 0; i < chunks.length; i += INGEST_CONFIG.BATCH_SIZE) {
      const batchEnd = Math.min(i + INGEST_CONFIG.BATCH_SIZE, chunks.length);
      const batch = chunks.slice(i, batchEnd);

      console.log(
        `[VectorizationService] Processing chunks ${i + 1}-${batchEnd} of ${chunks.length}...`
      );

      const embeddings = await this.embeddingService.embedBatch(
        batch.map((c) => c.content)
      );

      if (embeddings.length !== batch.length) {
        throw new Error(
          `Embedding count mismatch: expected ${batch.length}, got ${embeddings.length}`
        );
      }

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];

        await insertChunk(
          this.prisma,
          articleId,
          chunk.content,
          embedding,
          chunk.index
        );
      }

      processedChunks += batch.length;

      if (global.gc) {
        global.gc();
      }
    }

    return {
      chunkCount: chunks.length,
      processedChunks,
    };
  }
}

export function createVectorizationService(
  prismaClient: PrismaClient = defaultPrisma,
  deps: VectorizationServiceDeps = {}
): VectorizationService {
  const chunkingService = deps.chunkingService ?? createChunkingService();
  const embeddingService = deps.embeddingService ?? createEmbeddingService();

  return new LocalVectorizationService(
    prismaClient,
    chunkingService,
    embeddingService
  );
}
