'use client';

import { useCallback } from 'react';
import type {
  EnqueueExtractionResponse,
  ExtractionJobResponse,
} from '@/lib/features/extraction/types';

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

function toErrorMessage(
  data: ApiErrorPayload,
  fallback: string
): string {
  return data.error || data.message || fallback;
}

function hasJob(
  data: Partial<ExtractionJobResponse>
): data is ExtractionJobResponse {
  return Boolean(data.jobId && data.status);
}

export function useExtractionApi() {
  const enqueueExtraction = useCallback(
    async (url: string, processNow = true): Promise<EnqueueExtractionResponse> => {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, processNow }),
      });

      const data = (await response.json().catch(() => ({}))) as
        | EnqueueExtractionResponse
        | ApiErrorPayload;

      if (!response.ok && !hasJob(data as Partial<ExtractionJobResponse>)) {
        throw new Error(toErrorMessage(data as ApiErrorPayload, 'Failed to enqueue extraction'));
      }

      if (!hasJob(data as Partial<ExtractionJobResponse>)) {
        throw new Error('Extraction job ID missing from response');
      }

      return data as EnqueueExtractionResponse;
    },
    []
  );

  const getExtractionJobStatus = useCallback(
    async (jobId: string): Promise<ExtractionJobResponse> => {
      const response = await fetch(`/api/extract/${jobId}`, {
        method: 'GET',
        cache: 'no-store',
      });

      const data = (await response.json().catch(() => ({}))) as
        | ExtractionJobResponse
        | ApiErrorPayload;

      if (!response.ok) {
        throw new Error(
          toErrorMessage(data as ApiErrorPayload, 'Failed to fetch extraction status')
        );
      }

      if (!hasJob(data as Partial<ExtractionJobResponse>)) {
        throw new Error('Invalid extraction status response');
      }

      return data as ExtractionJobResponse;
    },
    []
  );

  return {
    enqueueExtraction,
    getExtractionJobStatus,
  };
}
