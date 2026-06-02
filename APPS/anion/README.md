# Anion Web App

Primary production delivery lane for Anion.

## Locked Stack
- Next.js App Router
- Cloudflare Workers deployment via OpenNext adapter
- Supabase for data and auth
- Stripe as payment rail for this phase
- Daily React for live classroom

## Current State
- M0 platform realignment complete
- App Router route skeleton established
- OpenNext and Wrangler deployment contract added
- Supabase migrations folder initialized and applied
- M1-M5 core implementation exists in code, but authenticated production closure is currently blocked
- Current Phase 1 execution status: FAIL (hard blocker: no valid confirmed production role test credentials for parent/tutor/student)
- Live classroom rule: assigned tutor and student join the Daily room; parent has booking visibility but does not join the call unless future product requirements change
- Runtime status endpoint is now aligned: live `/api/status` reports blocked Phase 1 closure state
- Governance rule: do not mark overall green while critical items in `ops/PRODUCTION-READINESS.md` remain open

## Commands
- npm run dev
- npm run build
- npm run start
- npm run check
- npm test
- npm run test:e2e
- npm run ci:check
- npm run preflight:prod
- npm run verify:prod
- npm run perf:baseline
- npm run build:worker
- npm run preview:worker
- npm run deploy:worker
- npm run status:sync

## Testing

### E2E smoke tests (Playwright)

Smoke tests live in `tests/smoke.spec.ts` and cover:
- `GET /api/health` - service liveness
- `POST /api/daily/room` - malformed requests return `400`, unauthenticated valid-shaped requests return `401`
- `/login` - sign-in form renders correctly
- `/pricing` - all three plan cards visible
- `/parent`, `/dashboard`, `/lesson/:id` - redirect to `/login` when unauthenticated
- `POST /api/billing/checkout` - returns `401 UNAUTHENTICATED` when no session

The tests are designed to run without real credentials. Unauthenticated routes
never reach Supabase or Stripe, so placeholder env vars are sufficient locally and
in CI.

#### Run locally

```bash
# From repo root
npm run test:e2e --workspace APPS/anion

# Or from APPS/anion directly
cd APPS/anion
npx playwright test

# Reuse an already-running dev server (skip auto-start)
PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test

# Target a specific base URL (e.g. staging)
PLAYWRIGHT_BASE_URL=https://staging.anion.example.com PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test
```

Playwright will start `npm run dev` on port 4178 automatically unless
`PLAYWRIGHT_SKIP_WEBSERVER=1` is set.

#### Run in CI

The `e2e` job in `.github/workflows/anion-web-ci.yml` installs Playwright,
starts the Next.js dev server with placeholder Supabase env vars, and runs
`npm run test:e2e`. No secrets are required for the smoke suite.

### Combined CI check

```bash
npm run ci:check --workspace APPS/anion
```

Runs `tsc --noEmit` and `next build` in sequence - the same checks as the
`validate` CI job.
