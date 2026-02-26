'use client';

import { useCallback } from 'react';
import type {
  EnqueueExtractionResponse,
  ExtractionJobStatus,
} from '@/lib/features/extraction/types';
import { getExtractionProgressMessage } from '@/lib/features/extraction/utils/progress-message';
import { useExtractionJobPolling } from '@/lib/features/extraction/hooks/use-extraction-job-polling';
import { useExtractionApi } from '@/lib/features/extraction/hooks/use-extraction-api';
import {
  useIngestApi,
  type IngestArticleResponse,
} from '@/lib/features/ingest/hooks/use-ingest-api';

export type ArticleAnalysisResult = IngestArticleResponse;

function isTerminalStatus(
  status: ExtractionJobStatus
): status is 'succeeded' | 'failed' | 'blocked_robots' {
  return (
    status === 'succeeded' || status === 'failed' || status === 'blocked_robots'
  );
}

export function useArticleAnalysis() {
  const { pollExtractionJob } = useExtractionJobPolling();
  const { enqueueExtraction } = useExtractionApi();
  const { ingestArticle } = useIngestApi();

  const analyzeArticle = useCallback(
    async (
      url: string,
      onStatusChange: (message: string) => void
    ): Promise<ArticleAnalysisResult> => {
      onStatusChange('Submitting extraction job...');

      const extractionData: EnqueueExtractionResponse =
        await enqueueExtraction(url, true);

      let job: EnqueueExtractionResponse;
      if (isTerminalStatus(extractionData.status)) {
        job = extractionData;
        onStatusChange(getExtractionProgressMessage(job.status, job.step));
      } else {
        onStatusChange(getExtractionProgressMessage(extractionData.status));
        job = await pollExtractionJob(extractionData.jobId, onStatusChange);
      }

      if (job.status === 'blocked_robots') {
        throw new Error(
          job.errorMessage ||
            'This URL is blocked by robots.txt and cannot be processed.'
        );
      }

      if (job.status === 'failed') {
        throw new Error(job.errorMessage || 'Extraction failed');
      }

      onStatusChange('Generating summary and embeddings...');

      return ingestArticle(url);
    },
    [enqueueExtraction, ingestArticle, pollExtractionJob]
  );

  return { analyzeArticle };
}
