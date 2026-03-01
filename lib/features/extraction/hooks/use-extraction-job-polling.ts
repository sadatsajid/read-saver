'use client';

import { useCallback } from 'react';
import {
  EXTRACTION_POLL_INTERVAL_MS,
  EXTRACTION_POLL_MAX_ATTEMPTS,
} from '@/lib/features/extraction/constants';
import type { ExtractionJobResponse } from '@/lib/features/extraction/types';
import { getExtractionProgressMessage } from '@/lib/features/extraction/utils/progress-message';
import { useExtractionApi } from '@/lib/features/extraction/hooks/use-extraction-api';

export function useExtractionJobPolling() {
  const { getExtractionJobStatus } = useExtractionApi();

  const pollExtractionJob = useCallback(
    async (
      jobId: string,
      onStatusChange: (message: string) => void
    ): Promise<ExtractionJobResponse> => {
      for (let attempt = 0; attempt < EXTRACTION_POLL_MAX_ATTEMPTS; attempt++) {
        const data = await getExtractionJobStatus(jobId);
        onStatusChange(getExtractionProgressMessage(data.status, data.step));

        if (
          data.status === 'succeeded' ||
          data.status === 'failed' ||
          data.status === 'blocked_robots'
        ) {
          return data;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, EXTRACTION_POLL_INTERVAL_MS)
        );
      }

      throw new Error('Extraction timed out. Please try again.');
    },
    [getExtractionJobStatus]
  );

  return { pollExtractionJob };
}
