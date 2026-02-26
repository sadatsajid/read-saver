import { NextResponse } from 'next/server';
import { createExtractionOrchestratorService } from '@/lib/features/extraction/services/extraction-orchestrator-service';

interface RouteParams {
  params: Promise<{
    jobId: string;
  }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  const { jobId } = await params;
  const orchestrator = createExtractionOrchestratorService();
  const job = await orchestrator.getExtractionJob(jobId);

  if (!job) {
    return NextResponse.json({ error: 'Extraction job not found' }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    sourceUrl: job.sourceUrl,
    canonicalUrl: job.canonicalUrl,
    status: job.status,
    step: job.step,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    result: job.result
      ? {
          title: job.result.title,
          content: job.result.contentText,
          excerpt: job.result.excerpt,
          author: job.result.author,
          siteName: job.result.siteName,
          method: job.result.method,
          qualityScore: job.result.qualityScore,
        }
      : null,
  });
}
