export const RETRY_BACKOFF_MS = [200, 800, 2000] as const;

export type RetryDecision =
  | {
      retry: true;
      attempt: number;
      delayMs: number;
    }
  | {
      retry: false;
      attempt: number;
      delayMs: null;
    };

export function getRetryDelayMs(attempt: number): number | null {
  if (!Number.isInteger(attempt) || attempt <= 0) {
    return null;
  }

  return RETRY_BACKOFF_MS[attempt - 1] ?? null;
}

export function decideRetry(attempt: number): RetryDecision {
  const delayMs = getRetryDelayMs(attempt);

  if (delayMs === null) {
    return {
      retry: false,
      attempt,
      delayMs: null
    };
  }

  return {
    retry: true,
    attempt,
    delayMs
  };
}
