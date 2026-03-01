import type { PrismaClient } from '@prisma/client';
import type { ExtractedPayload } from '@/lib/features/extraction/types';

export async function upsertExtractionResult(
  prisma: PrismaClient,
  jobId: string,
  payload: ExtractedPayload,
  qualityScore: number
) {
  await prisma.extractionResult.upsert({
    where: { extractionJobId: jobId },
    update: {
      title: payload.title,
      contentText: payload.content,
      excerpt: payload.excerpt ?? null,
      author: payload.author ?? null,
      siteName: payload.siteName ?? null,
      method: payload.method,
      qualityScore,
    },
    create: {
      extractionJobId: jobId,
      title: payload.title,
      contentText: payload.content,
      excerpt: payload.excerpt ?? null,
      author: payload.author ?? null,
      siteName: payload.siteName ?? null,
      method: payload.method,
      qualityScore,
    },
  });
}
