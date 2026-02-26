import type { PrismaClient } from '@prisma/client';

export type ExtractionStep =
  | 'normalize'
  | 'robots'
  | 'extract'
  | 'persist'
  | 'complete';

export async function createExtractionJob(
  prisma: PrismaClient,
  sourceUrl: string,
  canonicalUrl: string
) {
  return prisma.extractionJob.create({
    data: {
      sourceUrl,
      canonicalUrl,
      domain: new URL(canonicalUrl).hostname,
      status: 'queued',
      step: 'normalize',
    },
    select: { id: true },
  });
}

export async function findLatestExtractionJobByCanonicalUrl(
  prisma: PrismaClient,
  canonicalUrl: string
) {
  return prisma.extractionJob.findFirst({
    where: { canonicalUrl },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      canonicalUrl: true,
      sourceUrl: true,
    },
  });
}

export async function getExtractionJobById(
  prisma: PrismaClient,
  jobId: string
) {
  return prisma.extractionJob.findUnique({
    where: { id: jobId },
    include: {
      result: true,
    },
  });
}

export async function markExtractionJobRunning(
  prisma: PrismaClient,
  jobId: string,
  step: ExtractionStep
) {
  await prisma.extractionJob.update({
    where: { id: jobId },
    data: {
      status: 'running',
      step,
    },
  });
}

export async function claimNextQueuedExtractionJob(
  prisma: PrismaClient
): Promise<{ id: string } | null> {
  return prisma.$transaction(async (tx) => {
    const next = await tx.extractionJob.findFirst({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!next) {
      return null;
    }

    const updated = await tx.extractionJob.updateMany({
      where: {
        id: next.id,
        status: 'queued',
      },
      data: {
        status: 'running',
        step: 'normalize',
      },
    });

    if (updated.count === 0) {
      return null;
    }

    return next;
  });
}

export async function markExtractionJobBlocked(
  prisma: PrismaClient,
  jobId: string,
  reason?: string
) {
  await prisma.extractionJob.update({
    where: { id: jobId },
    data: {
      status: 'blocked_robots',
      step: 'robots',
      errorCode: 'ROBOTS_BLOCKED',
      errorMessage: reason ?? null,
      completedAt: new Date(),
    },
  });
}

export async function markExtractionJobFailed(
  prisma: PrismaClient,
  jobId: string,
  errorCode: string,
  errorMessage: string
) {
  await prisma.extractionJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      errorCode,
      errorMessage,
      attemptCount: {
        increment: 1,
      },
      completedAt: new Date(),
    },
  });
}

export async function markExtractionJobSucceeded(
  prisma: PrismaClient,
  jobId: string
) {
  await prisma.extractionJob.update({
    where: { id: jobId },
    data: {
      status: 'succeeded',
      step: 'complete',
      completedAt: new Date(),
    },
  });
}
