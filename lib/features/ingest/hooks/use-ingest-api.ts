'use client';

import { useCallback } from 'react';

export interface IngestArticleResponse {
  articleId: string;
  title: string;
  cached?: boolean;
}

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

export function useIngestApi() {
  const ingestArticle = useCallback(
    async (url: string): Promise<IngestArticleResponse> => {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json().catch(() => ({}))) as
        | IngestArticleResponse
        | ApiErrorPayload;

      if (!response.ok) {
        throw new Error(
          toErrorMessage(data as ApiErrorPayload, 'Failed to process article')
        );
      }

      if (!('articleId' in data) || !('title' in data)) {
        throw new Error('Invalid ingest response');
      }

      return data as IngestArticleResponse;
    },
    []
  );

  return {
    ingestArticle,
  };
}
