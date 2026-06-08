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
- npm run prod:doctor
- npm run phase1:evidence
- npm run billing:evidence
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

## Production Doctor

Use this before claiming Anion is ready for live users:

```bash
ANION_BASE_URL=https://anion.unalabs.cloud npm run prod:doctor
```

The doctor checks production health/status and Cloudflare Worker secret
inventory. It intentionally exits non-zero while Daily or Stripe provider
secrets are missing, because tutor/student video calls and billing cannot be
proven without those provider settings.

After `prod:doctor` passes, run the authenticated video-call evidence gate:

```bash
ANION_BASE_URL=https://anion.unalabs.cloud \
NEXT_PUBLIC_SUPABASE_URL=https://aaaextkrfoqomzmjjkxe.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
ANION_PHASE1_BOOKING_ID=... \
ANION_PARENT_EMAIL=... \
ANION_TUTOR_EMAIL=... \
ANION_STUDENT_EMAIL=... \
npm run phase1:evidence
```

This creates a timestamped screenshot/report folder under `test-results/` and
only passes after parent booking visibility/denial plus tutor/student dashboard,
token, join, leave, rejoin, and concurrent-join evidence are proven. Set
`ANION_ADMIN_EMAIL` to include admin dashboard evidence, and set
`ANION_EVIDENCE_POST_CLASSROOM=1` only when a controlled test classroom post is
acceptable.

After Stripe test-mode provider settings are present, run the billing evidence
gate:

```bash
ANION_BASE_URL=https://anion.unalabs.cloud \
NEXT_PUBLIC_SUPABASE_URL=https://aaaextkrfoqomzmjjkxe.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
STRIPE_SECRET_KEY=... \
STRIPE_WEBHOOK_SECRET=... \
STRIPE_PRICE_STARTER=... \
ANION_PHASE1_BOOKING_ID=... \
ANION_PARENT_EMAIL=... \
npm run billing:evidence
```

This creates a timestamped billing report under `test-results/` and proves app
checkout session creation, Stripe Checkout page opening, signed webhook
handling, subscription sync, and billing portal session creation in test mode.

## Local Demo Video Mode

This repo includes a local-only demo mode so Anion can run on a laptop without
Supabase, Daily, or Stripe secrets. It is guarded by `ANION_LOCAL_DEMO=1` and is
disabled in production builds.

Start the local app:

```powershell
npm run local:demo
```

Open:

- Parent dashboard: http://localhost:4178/api/local-demo/sign-in?role=parent&next=/parent
- Tutor lesson: http://localhost:4178/api/local-demo/sign-in?role=tutor&next=/lesson/demo-accepted-lesson
- Student lesson: http://localhost:4178/api/local-demo/sign-in?role=student&next=/lesson/demo-accepted-lesson

Verify the local camera-backed lesson flow:

```powershell
npm run test:local-video
```

This proves parent denial plus tutor/student local video join, leave, and rejoin.
Production Daily video still requires `DAILY_API_KEY` and `DAILY_DOMAIN`.
