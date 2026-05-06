type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, number[]>();
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function pruneBuckets() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, timestamps] of buckets.entries()) {
    if (timestamps.length === 0) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  pruneBuckets();

  const now = Date.now();
  const threshold = now - config.windowMs;
  const recent = (buckets.get(key) ?? []).filter((ts) => ts > threshold);

  if (recent.length >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: (recent[0] ?? now) + config.windowMs,
    };
  }

  recent.push(now);
  buckets.set(key, recent);

  return {
    allowed: true,
    remaining: config.limit - recent.length,
    resetAt: now + config.windowMs,
  };
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export const RATE_LIMITS = {
  billingCheckout: { limit: 5, windowMs: 60_000 },
  billingPortal: { limit: 10, windowMs: 60_000 },
  dailyRoom: { limit: 10, windowMs: 60_000 },
  stripeWebhook: { limit: 120, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>;
