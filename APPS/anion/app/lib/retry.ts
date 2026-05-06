type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
};

function isTransient(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  if (
    err.message.includes('ECONNRESET') ||
    err.message.includes('ENOTFOUND') ||
    err.message.includes('ETIMEDOUT') ||
    err.message.includes('fetch failed') ||
    err.message.includes('network')
  ) {
    return true;
  }

  const match = /failed (\d{3})/.exec(err.message);
  if (!match) return false;
  return Number(match[1]) >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  return Math.random() * cap;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 200, maxDelayMs = 5000, label = 'operation' } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === maxAttempts - 1;
      if (isLast || !isTransient(err)) {
        throw err;
      }

      const delayMs = jitteredDelay(attempt, baseDelayMs, maxDelayMs);
      console.warn(
        `[retry] ${label}: attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${Math.round(delayMs)}ms`,
      );
      await sleep(delayMs);
    }
  }

  throw new Error(`[retry] ${label} failed after ${maxAttempts} attempts`);
}
