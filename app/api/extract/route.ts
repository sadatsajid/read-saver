import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExtractionOrchestratorService } from '@/lib/features/extraction/services/extraction-orchestrator-service';

const EnqueueExtractionSchema = z.object({
  url: z.string().url('Please provide a valid URL'),
  processNow: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, processNow = false } = EnqueueExtractionSchema.parse(body);
    const orchestrator = createExtractionOrchestratorService();

    const enqueued = await orchestrator.enqueueExtraction(url);

    if (processNow) {
      try {
        const result = await orchestrator.processExtractionJob(enqueued.jobId);
        return NextResponse.json(
          {
            jobId: enqueued.jobId,
            canonicalUrl: enqueued.canonicalUrl,
            reused: enqueued.reused,
            status: 'succeeded',
            result,
          },
          { status: 200 }
        );
      } catch (error) {
        const job = await orchestrator.getExtractionJob(enqueued.jobId);

        if (job?.status === 'blocked_robots') {
          return NextResponse.json(
            {
              jobId: enqueued.jobId,
              canonicalUrl: enqueued.canonicalUrl,
              reused: enqueued.reused,
              status: 'blocked_robots',
              errorCode: job.errorCode,
              errorMessage: job.errorMessage,
            },
            { status: 422 }
          );
        }

        if (job?.status === 'failed') {
          return NextResponse.json(
            {
              jobId: enqueued.jobId,
              canonicalUrl: enqueued.canonicalUrl,
              reused: enqueued.reused,
              status: 'failed',
              errorCode: job.errorCode,
              errorMessage: job.errorMessage,
            },
            { status: 422 }
          );
        }

        // Fall back to async queue/polling if immediate processing didn't complete.
        return NextResponse.json(
          {
            jobId: enqueued.jobId,
            canonicalUrl: enqueued.canonicalUrl,
            reused: enqueued.reused,
            status: 'queued',
            message:
              error instanceof Error
                ? error.message
                : 'Immediate processing unavailable. Continue with async polling.',
          },
          { status: 202 }
        );
      }
    }

    return NextResponse.json(
      {
        jobId: enqueued.jobId,
        canonicalUrl: enqueued.canonicalUrl,
        reused: enqueued.reused,
        status: 'queued',
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to enqueue extraction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow up to 60s for processNow extraction in serverless environments.
export const maxDuration = 60;
