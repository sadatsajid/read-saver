import type {
  ExtractionJobStatus,
  ExtractionJobStep,
} from '@/lib/features/extraction/types';

const STATUS_PROGRESS_MESSAGES: Record<ExtractionJobStatus, string> = {
  queued: 'Queued for extraction...',
  running: 'Processing extraction...',
  succeeded: 'Extraction complete.',
  blocked_robots: 'Blocked by robots.txt policy.',
  failed: 'Extraction failed.',
};

const STEP_PROGRESS_MESSAGES: Partial<Record<ExtractionJobStep, string>> = {
  normalize: 'Normalizing URL...',
  robots: 'Checking robots.txt policy...',
  extract: 'Extracting article content...',
  persist: 'Saving extracted content...',
  complete: 'Extraction complete.',
};

export function getExtractionProgressMessage(
  status: ExtractionJobStatus,
  step?: ExtractionJobStep
): string {
  if (status !== 'running') {
    return STATUS_PROGRESS_MESSAGES[status];
  }

  if (step && STEP_PROGRESS_MESSAGES[step]) {
    return STEP_PROGRESS_MESSAGES[step];
  }

  return STATUS_PROGRESS_MESSAGES.running;
}
