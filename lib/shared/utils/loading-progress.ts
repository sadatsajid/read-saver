export const PROGRESS_STEPS = [
  { threshold: 0, message: 'Fetching article...' },
  { threshold: 15, message: 'Extracting content...' },
  { threshold: 30, message: 'AI is reading your article...' },
  { threshold: 50, message: 'Generating summary...' },
  { threshold: 70, message: 'Identifying key takeaways...' },
  { threshold: 85, message: 'Organizing insights...' },
  { threshold: 95, message: 'Almost done...' },
] as const;

export type ProgressStep = (typeof PROGRESS_STEPS)[number];

export function getStatusMessageForProgress(progress: number): string {
  for (let i = PROGRESS_STEPS.length - 1; i >= 0; i--) {
    if (progress >= PROGRESS_STEPS[i].threshold) {
      return PROGRESS_STEPS[i].message;
    }
  }

  return PROGRESS_STEPS[0].message;
}

