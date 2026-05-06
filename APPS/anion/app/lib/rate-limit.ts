/**
 * In-memory sliding-window rate limiter.
 *
 * Each unique key (e.g. "billing-checkout:1.2.3.4") gets its own request
 * timestamp ring. Requests older than `windowMs` are discarded on every check.
 *
 * Limitations:
 * - State is per-process. In a serverless/multi-instance deployment, limits
 *   are not shared across instances. For a Redis / Cloudflare KV backed
 *   solution this module is the drop-in replacement point.
 * - Memory footprint is bounded: stale entries are pruned once per minute.
 */

const windows = new Map<string, number[]>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function pruneStale() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, ts] of windows.entries()) {
    if (ts.length === 0) windows.delete(key);
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Sliding-window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix epoch (ms) when the oldest in-window request will expire. */
  resetAt: number;
}

/**
 * Check (and record) one request for `key` against `config`.
 * If allowed, the timestamp is recorded and `allowed: true` is returned.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  pruneStale();

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const existing = windows.get(key) ?? [];
  const inWindow = existing.filter((t) => t > windowStart);

  if (inWindow.length >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: (inWindow[0] ?? now) + config.windowMs,
    };
  }

  inWindow.push(now);
  windows.set(key, inWindow);

  return {
    allowed: true,
    remaining: config.limit - inWindow.length,
    resetAt: now + config.windowMs,
  };
}

/** Extract the best available client IP from request headers. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Pre-configured limits for each protected endpoint. */
export const RATE_LIMITS = {
  billingCheckout: { limit: 5, windowMs: 60_000 },  // 5 req / min per IP
  billingPortal:   { limit: 10, windowMs: 60_000 }, // 10 req / min per IP
  dailyRoom:       { limit: 10, windowMs: 60_000 }, // 10 req / min per IP
  stripeWebhook:   { limit: 120, windowMs: 60_000 },// 120 req / min (Stripe burst)
} satisfies Record<string, RateLimitConfig>;
