export type ExtractionMethod = 'jina' | 'readability' | 'unknown';

export type ExtractionErrorCode =
  | 'INVALID_URL'
  | 'ROBOTS_BLOCKED'
  | 'ROBOTS_FETCH_FAILED'
  | 'EXTRACTION_FAILED';

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
