import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/platform/db/prisma';
import { claimNextQueuedExtractionJob } from '@/lib/features/extraction/repositories/extraction-job-repository';
import {
  createExtractionOrchestratorService,
  type ExtractionOrchestratorService,
} from '@/lib/features/extraction/services/extraction-orchestrator-service';

export interface ExtractionQueueWorkerService {
  processNextQueuedJob(): Promise<{
    processed: boolean;
    jobId?: string;
    error?: string;
  }>;
}

class LocalExtractionQueueWorkerService implements ExtractionQueueWorkerService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly orchestrator: ExtractionOrchestratorService
  ) {}

  async processNextQueuedJob(): Promise<{
    processed: boolean;
    jobId?: string;
    error?: string;
  }> {
    const claimed = await claimNextQueuedExtractionJob(this.prisma);
    if (!claimed) {
      return { processed: false };
    }

    try {
      await this.orchestrator.processExtractionJob(claimed.id);
      return { processed: true, jobId: claimed.id };
    } catch (error) {
      return {
        processed: true,
        jobId: claimed.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export function createExtractionQueueWorkerService(
  prismaClient: PrismaClient = defaultPrisma,
  orchestrator: ExtractionOrchestratorService = createExtractionOrchestratorService(
    prismaClient
  )
): ExtractionQueueWorkerService {
  return new LocalExtractionQueueWorkerService(prismaClient, orchestrator);
}
