import { useEffect, useRef, useState } from 'react';

export function useFakeProgress(isActive: boolean) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      const startTime = Date.now();

      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        // Asymptotic curve: fast start, slows down, never reaches 100
        const newProgress = Math.min(98, (1 - Math.exp(-elapsed / 15)) * 100);
        setProgress(newProgress);
      }, 200);
    } else if (intervalRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive]);

  return [progress, setProgress] as const;
}

