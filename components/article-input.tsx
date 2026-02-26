'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { getStatusMessageForProgress } from '@/lib/shared/utils/loading-progress';
import { useFakeProgress } from '@/lib/shared/hooks/use-fake-progress';

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
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useFakeProgress(loading);

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
      setStatus(getProgressMessage(data.status, data.step));

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
    setStatus('Submitting extraction job...');

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
        setStatus('Extraction complete.');
      } else if (
        extractionData.status === 'blocked_robots' ||
        extractionData.status === 'failed'
      ) {
        job = extractionData;
      } else {
        // Async fallback path: poll queued/running job to completion.
        setStatus(
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

      setStatus('Generating summary and embeddings...');

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
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      onSuccess(data);
      setUrl('');
      setStatus('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const statusMessage = status || getStatusMessageForProgress(progress);

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
              Analyzing...
            </>
          ) : (
            'Analyze Article'
          )}
        </Button>
      </form>

      {loading && (
        <div className="space-y-3 animate-slide-up">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-primary font-medium">{statusMessage}</span>
            <span className="text-xs text-muted-foreground">
              This usually takes 15–30 seconds
            </span>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="animate-slide-up">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}

      {!loading && (
        <p className="text-xs sm:text-sm text-muted-foreground text-center px-2">
          Works with any article URL from the web • No signup required
        </p>
      )}
    </div>
  );
}
