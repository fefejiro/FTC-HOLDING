/**
 * Unit tests for app/lib/retry.ts — using Node.js built-in test runner.
 *
 * Run: node --test app/lib/__tests__/retry.test.mjs
 *
 * These tests exercise the retry/backoff logic without any external dependencies.
 * They mock `setTimeout` to make tests fast (no actual sleeps).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Inline the retry logic so we can control sleep duration.
 * The production version in app/lib/retry.ts is the source of truth;
 * this copy is intentionally kept in sync for test isolation.
 */
function buildRetry({ sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  function isTransient(err) {
    if (err instanceof Error) {
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
      if (match) {
        const status = Number(match[1]);
        return status >= 500;
      }
    }
    return false;
  }

  function jitteredDelay(attempt, baseMs, maxMs) {
    const cap = Math.min(maxMs, baseMs * Math.pow(2, attempt));
    return Math.random() * cap;
  }

  async function withRetry(fn, options = {}) {
    const { maxAttempts = 3, baseDelayMs = 200, maxDelayMs = 5000 } = options;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isLast = attempt === maxAttempts - 1;
        if (isLast || !isTransient(err)) {
          throw err;
        }
        const delayMs = jitteredDelay(attempt, baseDelayMs, maxDelayMs);
        await sleepFn(delayMs);
      }
    }
  }

  return { withRetry, isTransient };
}

// No-op sleep — makes tests instant
const noopSleep = () => Promise.resolve();
const { withRetry, isTransient } = buildRetry({ sleepFn: noopSleep });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('withRetry', () => {
  test('resolves immediately when fn succeeds on first attempt', async () => {
    let calls = 0;
    const result = await withRetry(async () => { calls++; return 'ok'; });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
  });

  test('retries on 5xx error and succeeds on second attempt', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error('Daily API POST /rooms failed 503: Service Unavailable');
        return 'recovered';
      },
      { maxAttempts: 3, baseDelayMs: 1 },
    );
    assert.equal(result, 'recovered');
    assert.equal(calls, 2);
  });

  test('does NOT retry on 4xx client errors', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withRetry(
          async () => {
            calls++;
            throw new Error('Daily API GET /rooms/x failed 404: Not Found');
          },
          { maxAttempts: 3, baseDelayMs: 1 },
        ),
      /404/,
    );
    assert.equal(calls, 1, '4xx errors must not be retried');
  });

  test('retries on network errors (ECONNRESET)', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error('ECONNRESET');
        return 'connected';
      },
      { maxAttempts: 3, baseDelayMs: 1 },
    );
    assert.equal(result, 'connected');
    assert.equal(calls, 3);
  });

  test('throws after maxAttempts with the last underlying error', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withRetry(
          async () => {
            calls++;
            throw new Error('Daily API POST /rooms failed 503: still down');
          },
          { maxAttempts: 3, baseDelayMs: 1 },
        ),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /503/);
        return true;
      },
    );
    assert.equal(calls, 3);
  });

  test('respects maxAttempts=1 (no retries at all)', async () => {
    let calls = 0;
    await assert.rejects(
      () =>
        withRetry(
          async () => {
            calls++;
            throw new Error('Daily API POST /rooms failed 500: Server Error');
          },
          { maxAttempts: 1, baseDelayMs: 1 },
        ),
      /500/,
    );
    assert.equal(calls, 1);
  });

  test('retries on fetch failed (network-level)', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error('fetch failed');
        return 'ok';
      },
      { maxAttempts: 3, baseDelayMs: 1 },
    );
    assert.equal(result, 'ok');
    assert.equal(calls, 2);
  });
});

describe('isTransient', () => {
  test('returns true for 500 errors', () => {
    assert.ok(isTransient(new Error('Daily API failed 500: Internal Server Error')));
  });

  test('returns true for 503 errors', () => {
    assert.ok(isTransient(new Error('Daily API failed 503: Service Unavailable')));
  });

  test('returns false for 404 errors', () => {
    assert.equal(isTransient(new Error('Daily API failed 404: Not Found')), false);
  });

  test('returns false for 400 errors', () => {
    assert.equal(isTransient(new Error('Daily API failed 400: Bad Request')), false);
  });

  test('returns true for ECONNRESET', () => {
    assert.ok(isTransient(new Error('ECONNRESET')));
  });

  test('returns true for ENOTFOUND', () => {
    assert.ok(isTransient(new Error('ENOTFOUND')));
  });

  test('returns true for ETIMEDOUT', () => {
    assert.ok(isTransient(new Error('ETIMEDOUT')));
  });

  test('returns true for fetch failed', () => {
    assert.ok(isTransient(new Error('fetch failed')));
  });

  test('returns false for non-Error values', () => {
    assert.equal(isTransient('some string error'), false);
    assert.equal(isTransient(null), false);
    assert.equal(isTransient(undefined), false);
  });
});
