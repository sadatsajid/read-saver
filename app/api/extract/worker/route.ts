import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExtractionQueueWorkerService } from '@/lib/features/extraction/services/extraction-queue-worker-service';

const WorkerRequestSchema = z.object({
  limit: z.number().int().min(1).max(20).optional(),
});

function isAuthorized(request: NextRequest): boolean {
  const configuredSecrets = [
    process.env.EXTRACTION_WORKER_SECRET,
    process.env.CRON_SECRET,
  ].filter((value): value is string => Boolean(value));

  if (configuredSecrets.length === 0) {
    return true;
  }

  const workerSecret = request.headers.get('x-worker-secret');
  if (workerSecret && configuredSecrets.includes(workerSecret)) {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  const [scheme, token] = authHeader.split(' ');
  return (
    scheme?.toLowerCase() === 'bearer' &&
    Boolean(token) &&
    configuredSecrets.includes(token)
  );
}

async function runWorker(limit: number) {
  const worker = createExtractionQueueWorkerService();
  const results: Array<{ processed: boolean; jobId?: string; error?: string }> = [];

  for (let i = 0; i < limit; i++) {
    const result = await worker.processNextQueuedJob();
    results.push(result);
    if (!result.processed) {
      break;
    }
  }

  return NextResponse.json({
    processedCount: results.filter((r) => r.processed).length,
    results,
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let limit = 1;
  try {
    const body = await request.json();
    const parsed = WorkerRequestSchema.safeParse(body);
    if (parsed.success) {
      limit = parsed.data.limit ?? 1;
    }
  } catch {
    // Empty body is valid; default limit=1.
  }

  return runWorker(limit);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitFromQuery = Number(request.nextUrl.searchParams.get('limit') ?? '5');
  const parsed = WorkerRequestSchema.safeParse({
    limit: Number.isFinite(limitFromQuery) ? limitFromQuery : 5,
  });

  const limit = parsed.success ? parsed.data.limit ?? 5 : 5;
  return runWorker(limit);
}
