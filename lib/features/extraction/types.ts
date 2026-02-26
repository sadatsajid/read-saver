export type ExtractionMethod = 'jina' | 'readability' | 'playwright' | 'unknown';

export type ExtractionJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'blocked_robots';

export type ExtractionJobStep =
  | 'normalize'
  | 'robots'
  | 'extract'
  | 'persist'
  | 'complete';

export type ExtractionErrorCode =
  | 'INVALID_URL'
  | 'ROBOTS_BLOCKED'
  | 'ROBOTS_FETCH_FAILED'
  | 'EXTRACTION_FAILED';

export interface ExtractionJobResponse {
  jobId: string;
  status: ExtractionJobStatus;
  step?: ExtractionJobStep;
  errorCode?: string | null;
  errorMessage?: string | null;
  message?: string;
}

export interface EnqueueExtractionResponse extends ExtractionJobResponse {
  canonicalUrl?: string;
  reused?: boolean;
}

export interface ExtractedPayload {
  sourceUrl: string;
  canonicalUrl: string;
  title: string;
  content: string;
  excerpt?: string;
  author?: string;
  siteName?: string;
  method: ExtractionMethod;
}

export interface RobotsDecision {
  allowed: boolean;
  reason?: string;
  crawlDelaySeconds?: number;
}
