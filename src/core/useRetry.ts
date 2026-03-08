import { useState, useCallback } from "react";

/**
 * Hook for retrying async operations with exponential backoff
 */
export function useRetry<T>(
  asyncFn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {}
) {
  const { maxRetries = 3, baseDelay = 1000 } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFn();
        setData(result);
        setLoading(false);
        return result;
      } catch (err: any) {
        if (attempt === maxRetries) {
          const msg = err?.message || "Operation failed";
          setError(msg);
          setLoading(false);
          throw err;
        }
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
      }
    }
  }, [asyncFn, maxRetries, baseDelay]);

  return { execute, loading, error, data };
}
