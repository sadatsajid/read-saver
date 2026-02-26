import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/platform/db/prisma';
import { extractArticle } from '@/lib/features/ingest/extraction';
import type { ExtractedPayload } from '@/lib/features/extraction/types';
import { normalizeArticleUrl } from '@/lib/features/extraction/services/url-normalization-service';
import { checkRobotsPermission } from '@/lib/features/extraction/services/robots-service';
import {
  findLatestExtractionJobByCanonicalUrl,
  getExtractionJobById,
  createExtractionJob,
  markExtractionJobBlocked,
  markExtractionJobFailed,
  markExtractionJobRunning,
  markExtractionJobSucceeded,
} from '@/lib/features/extraction/repositories/extraction-job-repository';
import { upsertExtractionResult } from '@/lib/features/extraction/repositories/extraction-result-repository';
import type { ExtractionMethod } from '@/lib/features/extraction/types';

export interface ExtractionOrchestratorService {
  enqueueExtraction(url: string): Promise<{
    jobId: string;
    canonicalUrl: string;
    reused: boolean;
  }>;
  getExtractionJob(jobId: string): Promise<{
    id: string;
    sourceUrl: string;
    canonicalUrl: string;
    status: string;
    step: string;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    result: {
      title: string;
      contentText: string;
      excerpt: string | null;
      author: string | null;
      siteName: string | null;
      method: ExtractionMethod;
      qualityScore: number;
    } | null;
  } | null>;
  processExtractionJob(jobId: string): Promise<ExtractedPayload>;
  extractFromUrl(url: string): Promise<ExtractedPayload>;
}

function computeQualityScore(content: string): number {
  // Minimal V1 heuristic: length + paragraph structure.
  const lengthScore = Math.min(content.length / 4000, 1) * 70;
  const paragraphCount = content.split('\n\n').filter(Boolean).length;
  const structureScore = Math.min(paragraphCount / 12, 1) * 30;
  return Math.round(lengthScore + structureScore);
}

class RobotsBlockedError extends Error {}

class LocalExtractionOrchestratorService
  implements ExtractionOrchestratorService
{
  constructor(private readonly prisma: PrismaClient) {}

  async enqueueExtraction(url: string): Promise<{
    jobId: string;
    canonicalUrl: string;
    reused: boolean;
  }> {
    const canonicalUrl = normalizeArticleUrl(url);
    const latest = await findLatestExtractionJobByCanonicalUrl(
      this.prisma,
      canonicalUrl
    );

    if (
      latest &&
      (latest.status === 'queued' ||
        latest.status === 'running' ||
        latest.status === 'succeeded')
    ) {
      return {
        jobId: latest.id,
        canonicalUrl,
        reused: true,
      };
    }

    const created = await createExtractionJob(this.prisma, url, canonicalUrl);
    return {
      jobId: created.id,
      canonicalUrl,
      reused: false,
    };
  }

  async getExtractionJob(jobId: string) {
    return getExtractionJobById(this.prisma, jobId);
  }

  async processExtractionJob(jobId: string): Promise<ExtractedPayload> {
    const job = await getExtractionJobById(this.prisma, jobId);
    if (!job) {
      throw new Error(`Extraction job not found: ${jobId}`);
    }

    if (job.status === 'succeeded' && job.result) {
      return {
        sourceUrl: job.sourceUrl,
        canonicalUrl: job.canonicalUrl,
        title: job.result.title,
        content: job.result.contentText,
        excerpt: job.result.excerpt ?? undefined,
        author: job.result.author ?? undefined,
        siteName: job.result.siteName ?? undefined,
        method: job.result.method,
      };
    }

    try {
      await markExtractionJobRunning(this.prisma, jobId, 'robots');
      const robots = await checkRobotsPermission(this.prisma, job.canonicalUrl);

      if (!robots.allowed) {
        await markExtractionJobBlocked(this.prisma, jobId, robots.reason);
        throw new RobotsBlockedError(
          robots.reason ?? 'Blocked by robots policy'
        );
      }

      await markExtractionJobRunning(this.prisma, jobId, 'extract');
      const extracted = await extractArticle(job.canonicalUrl);

      const payload: ExtractedPayload = {
        sourceUrl: job.sourceUrl,
        canonicalUrl: job.canonicalUrl,
        title: extracted.title,
        content: extracted.content,
        excerpt: extracted.excerpt,
        author: extracted.author,
        siteName: extracted.siteName,
        method: extracted.method ?? 'unknown',
      };

      await markExtractionJobRunning(this.prisma, jobId, 'persist');
      await upsertExtractionResult(
        this.prisma,
        jobId,
        payload,
        computeQualityScore(payload.content)
      );
      await markExtractionJobSucceeded(this.prisma, jobId);

      return payload;
    } catch (error) {
      if (!(error instanceof RobotsBlockedError)) {
        await markExtractionJobFailed(
          this.prisma,
          jobId,
          'EXTRACTION_FAILED',
          error instanceof Error ? error.message : 'Unknown extraction error'
        );
      }
      throw error;
    }
  }

  async extractFromUrl(url: string): Promise<ExtractedPayload> {
    const { jobId } = await this.enqueueExtraction(url);
    return this.processExtractionJob(jobId);
  }
}

export function createExtractionOrchestratorService(
  prismaClient: PrismaClient = defaultPrisma
): ExtractionOrchestratorService {
  return new LocalExtractionOrchestratorService(prismaClient);
}
