export type RateLimitDriver = 'memory' | 'cloudflare-kv';

type RateLimitStore = {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
};

type MemoryBucket = {
  count: number;
  resetAt: number;
};

const MEMORY_STATE_KEY = '__anion_rate_limit_memory_store__';
const STORE_CACHE_KEY = '__anion_rate_limit_store_cache__';

function getMemoryStoreMap(): Map<string, MemoryBucket> {
  const g = globalThis as typeof globalThis & {
    [MEMORY_STATE_KEY]?: Map<string, MemoryBucket>;
  };
  if (!g[MEMORY_STATE_KEY]) {
    g[MEMORY_STATE_KEY] = new Map<string, MemoryBucket>();
  }
  return g[MEMORY_STATE_KEY] as Map<string, MemoryBucket>;
}

function createMemoryStore(): RateLimitStore {
  return {
    async increment(key: string, windowMs: number) {
      const now = Date.now();
      const map = getMemoryStoreMap();
      const existing = map.get(key);

      if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs;
        map.set(key, { count: 1, resetAt });
        return { count: 1, resetAt };
      }

      const next = { count: existing.count + 1, resetAt: existing.resetAt };
      map.set(key, next);
      return next;
    },
  };
}

function hasCloudflareKvConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_RATE_LIMIT_KV_NAMESPACE_ID);
}

export function selectRateLimitDriver(env: NodeJS.ProcessEnv = process.env): RateLimitDriver {
  const configured = (env.SECURITY_RATE_LIMIT_DRIVER ?? 'auto').trim().toLowerCase();

  if (configured === 'memory') return 'memory';
  if (configured === 'cloudflare-kv' || configured === 'cloudflare_kv' || configured === 'kv') {
    return hasCloudflareKvConfig(env) ? 'cloudflare-kv' : 'memory';
  }

  return hasCloudflareKvConfig(env) ? 'cloudflare-kv' : 'memory';
}

function createCloudflareKvStore(env: NodeJS.ProcessEnv = process.env): RateLimitStore {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const namespaceId = env.CLOUDFLARE_RATE_LIMIT_KV_NAMESPACE_ID;

  if (!accountId || !apiToken || !namespaceId) {
    return createMemoryStore();
  }

  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values`;
  const authHeader = `Bearer ${apiToken}`;

  return {
    async increment(key: string, windowMs: number) {
      const now = Date.now();
      const readRes = await fetch(`${base}/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { Authorization: authHeader },
      });

      let bucket: MemoryBucket = { count: 0, resetAt: now + windowMs };
      if (readRes.ok) {
        const text = await readRes.text();
        if (text) {
          try {
            const parsed = JSON.parse(text) as Partial<MemoryBucket>;
            if (
              typeof parsed.count === 'number' &&
              Number.isFinite(parsed.count) &&
              parsed.count >= 0 &&
              typeof parsed.resetAt === 'number' &&
              Number.isFinite(parsed.resetAt) &&
              parsed.resetAt > 0
            ) {
              bucket = parsed.resetAt > now ? { count: parsed.count, resetAt: parsed.resetAt } : { count: 0, resetAt: now + windowMs };
            }
          } catch {
            bucket = { count: 0, resetAt: now + windowMs };
          }
        }
      }

      const next = {
        count: bucket.count + 1,
        resetAt: bucket.resetAt,
      };

      const ttlSeconds = Math.max(1, Math.ceil((next.resetAt - now) / 1000));
      await fetch(`${base}/${encodeURIComponent(key)}?expiration_ttl=${ttlSeconds}`, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(next),
      });

      return next;
    },
  };
}

function resolveStore(env: NodeJS.ProcessEnv = process.env): { driver: RateLimitDriver; store: RateLimitStore } {
  const g = globalThis as typeof globalThis & {
    [STORE_CACHE_KEY]?: { driver: RateLimitDriver; store: RateLimitStore };
  };

  const driver = selectRateLimitDriver(env);
  const cached = g[STORE_CACHE_KEY];
  if (cached && cached.driver === driver) {
    return cached;
  }

  const store = driver === 'cloudflare-kv' ? createCloudflareKvStore(env) : createMemoryStore();
  const next = { driver, store };
  g[STORE_CACHE_KEY] = next;
  return next;
}

export type EnforceRateLimitOptions = {
  scope: string;
  maxRequests: number;
  windowMs: number;
  key?: string;
};

export type RateLimitDecision = {
  limited: boolean;
  count: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
  driver: RateLimitDriver;
};

function getRequestKey(request: Request): string {
  const forwarded =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for') ||
    'anonymous';

  return forwarded.split(',')[0]?.trim().toLowerCase() || 'anonymous';
}

export async function enforceRateLimit(request: Request, options: EnforceRateLimitOptions): Promise<RateLimitDecision> {
  const { scope, maxRequests, windowMs } = options;
  const requestKey = options.key ?? getRequestKey(request);
  const key = `${scope}:${requestKey}`;

  const { driver, store } = resolveStore();

  try {
    const state = await store.increment(key, windowMs);
    const remaining = Math.max(0, maxRequests - state.count);
    const limited = state.count > maxRequests;
    const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000));

    return {
      limited,
      count: state.count,
      remaining,
      retryAfterSeconds,
      resetAt: state.resetAt,
      driver,
    };
  } catch {
    const fallbackStore = resolveStore({ ...process.env, SECURITY_RATE_LIMIT_DRIVER: 'memory' }).store;
    const state = await fallbackStore.increment(key, windowMs);
    const remaining = Math.max(0, maxRequests - state.count);
    const limited = state.count > maxRequests;
    const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000));

    return {
      limited,
      count: state.count,
      remaining,
      retryAfterSeconds,
      resetAt: state.resetAt,
      driver: 'memory',
    };
  }
}
