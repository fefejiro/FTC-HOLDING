/**
 * Retry utility with exponential backoff and jitter.
 *
 * Only retries on transient errors (network failures, 5xx responses).
 * Never retries on 4xx client errors — those require a code fix, not a retry.
 */

export type RetryOptions = {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms for exponential backoff. Default: 200 */
  baseDelayMs?: number;
  /** Maximum delay in ms after jitter. Default: 5000 */
  maxDelayMs?: number;
  /** Optional label for logging. */
  label?: string;
};

/** Thrown when every attempt fails. Wraps the last error. */
export class RetryExhaustedError extends Error {
  constructor(
    public readonly label: string,
    public readonly attempts: number,
    public readonly cause: unknown,
  ) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`[retry] ${label}: all ${attempts} attempts failed — ${msg}`);
    this.name = 'RetryExhaustedError';
  }
}

/**
 * Returns true if the error looks transient (network or 5xx).
 * 4xx errors are not transient — the request itself is the problem.
 */
function isTransient(err: unknown): boolean {
  if (err instanceof Error) {
    // Network-level errors (fetch rejected promise, ECONNRESET, etc.)
    if (
      err.message.includes('ECONNRESET') ||
      err.message.includes('ENOTFOUND') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('fetch failed') ||
      err.message.includes('network')
    ) {
      return true;
    }
    // Detect "Daily API ... failed 5XX" pattern used by dailyFetch
    const match = /failed (\d{3})/.exec(err.message);
    if (match) {
      const status = Number(match[1]);
      return status >= 500;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredDelay(attempt: number, baseMs: number, maxMs: number): number {
  // Full-jitter strategy: random value in [0, min(maxMs, base * 2^attempt)]
  const cap = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  return Math.random() * cap;
}

/**
 * Run `fn`, retrying up to `maxAttempts` times on transient errors.
 * Uses exponential backoff with full jitter between attempts.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 200, maxDelayMs = 5000, label = 'op' } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLast = attempt === maxAttempts - 1;

      if (isLast || !isTransient(err)) {
        // Non-transient error or final attempt — propagate immediately
        throw err;
      }

      const delayMs = jitteredDelay(attempt, baseDelayMs, maxDelayMs);
      console.warn(
        `[retry] ${label}: attempt ${attempt + 1}/${maxAttempts} failed (transient), retrying in ${Math.round(delayMs)}ms — ${err instanceof Error ? err.message : err}`,
      );
      await sleep(delayMs);
    }
  }

  throw new RetryExhaustedError(label, maxAttempts, lastError);
}
