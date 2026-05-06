# Anion Web App

Primary production delivery lane for Anion.

## Locked Stack
- Next.js App Router
- Cloudflare Workers deployment via OpenNext adapter
- Supabase for data and auth
- Stripe as payment rail for this phase
- Daily React for live classroom

## Current State
- M0 platform realignment in progress
- App Router route skeleton established
- OpenNext and Wrangler deployment contract added
- Supabase migrations folder initialized
- M1-M5 implementation remains in scheduled phases

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