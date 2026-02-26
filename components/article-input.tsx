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

export function ArticleInput({ onSuccess }: ArticleInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useFakeProgress(loading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process article');
      }

      const data = await response.json();
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      onSuccess(data);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const statusMessage = getStatusMessageForProgress(progress);

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
