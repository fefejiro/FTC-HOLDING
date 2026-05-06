# Anion API Security Hardening

## Scope
This baseline hardens `APPS/anion` API routes for production trust with explicit controls for:
- runtime-selectable rate limiting
- CSRF checks on state-changing web API routes
- explicit CORS allow-list behavior
- API security response headers

## Controls

### 1) Rate limiting adapter (Cloudflare-ready + fallback)
Implemented in `app/lib/security/rate-limit.ts`.

- `SECURITY_RATE_LIMIT_DRIVER=auto` (default)
  - uses `cloudflare-kv` when all KV REST env vars are present
  - otherwise falls back to `memory`
- `SECURITY_RATE_LIMIT_DRIVER=memory`
  - forces in-memory limiter
- `SECURITY_RATE_LIMIT_DRIVER=cloudflare-kv`
  - attempts Cloudflare KV path, falls back to memory if config is missing or runtime call fails

Cloudflare KV env contract:
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_RATE_LIMIT_KV_NAMESPACE_ID`

Current production routes with rate limits:
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `POST /api/daily/room`

Responses include `X-RateLimit-*` headers and `Retry-After` on 429.

### 2) CSRF protection
Implemented in `app/lib/security/csrf.ts` and applied to state-changing web routes above.

Policy:
- reject state-changing requests with missing `Origin`
- reject untrusted `Origin`
- reject `sec-fetch-site: cross-site`

Operational override:
- `SECURITY_CSRF_MODE=off` disables CSRF enforcement (emergency rollback only)

Stripe webhook is intentionally excluded from CSRF enforcement to avoid interfering with signature verification flow.

### 3) Explicit CORS policy
Implemented in `app/lib/security/http.ts` and enforced in `middleware.ts` for `/api/*`.

- allowed origins from `SECURITY_ALLOWED_ORIGINS` (comma-separated)
- localhost defaults are only added in non-production and non-Cloudflare Pages contexts, or explicitly with `SECURITY_ALLOW_LOCALHOST_ORIGINS=1`
- wildcard `*` is denied in production path
- preflight `OPTIONS` returns 204 only for allowed origins; denied origins return 403

### 4) API security headers baseline
Applied on API responses in middleware:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`

## Tests
Focused tests live in:
- `app/lib/security/__tests__/security.test.ts`

Run:
- `npm test`

Coverage targets:
- rate-limit driver fallback and KV selection behavior
- production wildcard CORS denial
- CSRF trusted vs untrusted origin behavior

## Residual risk
- Cloudflare KV increments are not strictly atomic and may under-enforce under high concurrency.
- For strict global consistency, migrate the adapter backend to Durable Objects.

## Rollout notes
1. Set `SECURITY_ALLOWED_ORIGINS` to exact app origin(s) before enabling production traffic.
2. Start with `SECURITY_RATE_LIMIT_DRIVER=memory` in staging, then switch to `auto` after KV namespace + token are in place.
3. Monitor 403/429 rates after rollout; if emergency rollback is needed, set `SECURITY_CSRF_MODE=off` temporarily while fixing origin configuration.
