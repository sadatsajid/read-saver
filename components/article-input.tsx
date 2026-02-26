'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface ArticleInputProps {
  onSuccess: (data: {
    articleId: string;
    title: string;
    cached?: boolean;
  }) => void;
}

interface ExtractionJobResponse {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked_robots';
  step?: 'normalize' | 'robots' | 'extract' | 'persist' | 'complete';
  errorCode?: string | null;
  errorMessage?: string | null;
  message?: string;
}

export function ArticleInput({ onSuccess }: ArticleInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const getProgressMessage = (
    status: ExtractionJobResponse['status'],
    step?: ExtractionJobResponse['step']
  ): string => {
    if (status === 'queued') return 'Queued for extraction...';
    if (status === 'succeeded') return 'Extraction complete.';
    if (status === 'blocked_robots') return 'Blocked by robots.txt policy.';
    if (status === 'failed') return 'Extraction failed.';

    if (step === 'normalize') return 'Normalizing URL...';
    if (step === 'robots') return 'Checking robots.txt policy...';
    if (step === 'extract') return 'Extracting article content...';
    if (step === 'persist') return 'Saving extracted content...';
    if (step === 'complete') return 'Extraction complete.';

    return 'Processing extraction...';
  };

  const pollExtractionJob = async (
    jobId: string
  ): Promise<ExtractionJobResponse> => {
    const maxAttempts = 90; // ~3 minutes with 2s interval
    const pollIntervalMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`/api/extract/${jobId}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch extraction status');
      }

      const data = (await response.json()) as ExtractionJobResponse;
      setProgress(getProgressMessage(data.status, data.step));

      if (
        data.status === 'succeeded' ||
        data.status === 'failed' ||
        data.status === 'blocked_robots'
      ) {
        return data;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Extraction timed out. Please try again.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProgress('Submitting extraction job...');

    try {
      const extractionResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, processNow: true }),
      });

      const extractionData =
        (await extractionResponse.json().catch(() => ({}))) as
          | ExtractionJobResponse
          | { error?: string; message?: string };

      if ('error' in extractionData && !('jobId' in extractionData)) {
        throw new Error(extractionData.error || extractionData.message || 'Failed to enqueue extraction');
      }

      if (!('jobId' in extractionData) || !extractionData.jobId) {
        throw new Error('Extraction job ID missing from response');
      }

      let job: ExtractionJobResponse;
      if (extractionData.status === 'succeeded') {
        job = extractionData;
        setProgress('Extraction complete.');
      } else if (
        extractionData.status === 'blocked_robots' ||
        extractionData.status === 'failed'
      ) {
        job = extractionData;
      } else {
        // Async fallback path: poll queued/running job to completion.
        setProgress(
          extractionData.status === 'queued'
            ? 'Queued for extraction...'
            : 'Processing extraction...'
        );
        job = await pollExtractionJob(extractionData.jobId);
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

      setProgress('Generating summary and embeddings...');

      const ingestResponse = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!ingestResponse.ok) {
        const data = await ingestResponse.json();
        throw new Error(data.error || 'Failed to process article');
      }

      const data = await ingestResponse.json();
      onSuccess(data);
      setUrl('');
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="url"
          placeholder="Paste article URL here... (e.g., https://example.com/article)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="flex-1 h-12 sm:h-12 text-base border-2 focus:border-primary/50 transition-colors"
          required
        />
        <Button 
          type="submit" 
          disabled={loading || !url}
          size="lg"
          className="h-12 px-6 sm:px-8 text-base font-semibold w-full sm:w-auto whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            'Analyze Article'
          )}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive" className="animate-slide-up">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}

      {loading && progress && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center px-2 animate-pulse">
          {progress}
        </p>
      )}

      <p className="text-xs sm:text-sm text-muted-foreground text-center px-2">
        Works with any article URL from the web • No signup required
      </p>
    </div>
  );
}
