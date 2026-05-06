import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRateLimitDriver } from '@/app/lib/security/rate-limit';
import { getAllowedOrigins, isOriginAllowed } from '@/app/lib/security/http';
import { validateCsrfRequest } from '@/app/lib/security/csrf';

function withEnv(patch: NodeJS.ProcessEnv, run: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(patch)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('rate limit driver falls back to memory when cloudflare kv env is missing', () => {
  const driver = selectRateLimitDriver({
    NODE_ENV: 'production',
    SECURITY_RATE_LIMIT_DRIVER: 'cloudflare-kv',
  });

  assert.equal(driver, 'memory');
});

test('rate limit driver selects cloudflare-kv when config is present', () => {
  const driver = selectRateLimitDriver({
    NODE_ENV: 'production',
    SECURITY_RATE_LIMIT_DRIVER: 'auto',
    CLOUDFLARE_ACCOUNT_ID: 'account',
    CLOUDFLARE_API_TOKEN: 'token',
    CLOUDFLARE_RATE_LIMIT_KV_NAMESPACE_ID: 'namespace',
  });

  assert.equal(driver, 'cloudflare-kv');
});

test('cors wildcard is denied in production', () => {
  const allowed = isOriginAllowed('https://evil.example', undefined, {
    NODE_ENV: 'production',
    SECURITY_ALLOWED_ORIGINS: '*',
  });

  assert.equal(allowed, false);
});

test('localhost origins are not auto-allowed on Cloudflare pages context', () => {
  const allowedOrigins = getAllowedOrigins({
    NODE_ENV: 'development',
    CF_PAGES: '1',
    SECURITY_ALLOWED_ORIGINS: '',
  });

  assert.equal(allowedOrigins.some((origin) => origin.includes('localhost')), false);
});

test('csrf rejects cross-site state-changing request', () => {
  withEnv({ NODE_ENV: 'production', SECURITY_ALLOWED_ORIGINS: 'https://anion.app' }, () => {
    const req = new Request('https://api.anion.app/api/billing/checkout', {
      method: 'POST',
      headers: {
        origin: 'https://attacker.example',
        'sec-fetch-site': 'cross-site',
      },
    });

    const result = validateCsrfRequest(req);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'CSRF_INVALID_ORIGIN');
  });
});

test('csrf accepts trusted origin request', () => {
  withEnv({ NODE_ENV: 'production', SECURITY_ALLOWED_ORIGINS: 'https://app.anion.com' }, () => {
    const req = new Request('https://api.anion.app/api/daily/room', {
      method: 'POST',
      headers: {
        origin: 'https://app.anion.com',
        'sec-fetch-site': 'same-site',
      },
    });

    const result = validateCsrfRequest(req);
    assert.equal(result.ok, true);
  });
});
