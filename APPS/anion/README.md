# Anion Web App

Primary production delivery lane for Anion.

## Locked Stack
- Next.js App Router
- Cloudflare Workers deployment via OpenNext adapter
- Supabase for data and auth
- Stripe as payment rail for this phase
- Daily React for live classroom

## Authentication

Anion uses **Google OAuth** as the user-facing authentication method via Supabase. There are no Anion-managed passwords, and the public login page does not expose magic-link fields.

1. Users click "Continue with Google" on the login page (`/login`)
2. They're redirected to the Supabase OAuth endpoint
3. Supabase handles the Google OAuth flow and returns an auth code
4. The code is exchanged at `/auth/callback` for a Supabase session
5. User is redirected to their dashboard (`/parent`, `/student`, or `/tutor`)

### Google OAuth Setup (Supabase)

To enable Google OAuth in Supabase:

1. Go to https://app.supabase.com → Project `aaaextkrfoqomzmjjkxe`
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Configure Google OAuth credentials from Google Cloud Console
5. Add redirect URIs:
   - `https://aaaextkrfoqomzmjjkxe.supabase.co/auth/v1/callback`
   - `https://anion.unalabs.cloud/auth/callback`

The `/auth/callback` route is the hardened entry point that exchanges OAuth codes for sessions and validates the callback origin.

### Client-side Auth

Authentication helpers live in `src/lib/auth.ts`:
- `signInWithGoogle()` - Initiates OAuth flow
- `loadSession()` - Gets current auth session
- `logout()` - Signs out user

Server-side auth resolution in `app/lib/auth/getCurrentUser.ts`:
- Returns authenticated user with role (student, parent, tutor, admin)
- Looks up user profile and assigned role from database
- Returns null if no active session

## Current State
- M0 platform realignment complete
- App Router route skeleton established
- OpenNext and Wrangler deployment contract added
- Supabase migrations folder initialized and applied
- M1-M5 core implementation exists in code, and authenticated production closure is partially proven
- Current Phase 1 execution status: FAIL until authenticated Daily video join/leave/rejoin and Stripe subscription-state evidence are captured
- Live classroom rule: assigned tutor and student join the Daily room; parent has booking visibility but does not join the call unless future product requirements change
- Runtime status endpoint is now aligned: live `/api/status` reports ready auth/bookings, first-party Daily call UI readiness, and the remaining non-green blockers
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
- npm run phase1:provision-google-qa
- npm run phase1:evidence
- npm run phase1:evidence:manual
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
- `/login` - sign-in form renders correctly with Google auth and no password or magic-link fields
- `/pricing` - all three plan cards visible

### Google OAuth tests (Playwright)

Google auth tests live in `tests/google-auth.spec.ts` and cover:
- Google sign-in button visibility and clickability
- OAuth flow initiation
- Auth callback error handling
- Login page rendering with Google as primary auth
- `/parent`, `/dashboard`, `/lesson/:id` - redirect to `/login` when unauthenticated
- `POST /api/billing/checkout` - returns `401 UNAUTHENTICATED` when no session

The tests are designed to run without real credentials. Unauthenticated routes
never reach Supabase or Stripe, so placeholder env vars are sufficient locally and
in CI. Production browser auth config is injected at runtime from Cloudflare Worker
bindings and guarded so local placeholders are not served to users.

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
inventory. It exits non-zero when required Supabase, Daily, or Stripe provider
settings are missing, because tutor/student video calls and billing cannot be
proven without those provider settings.

Production public Supabase config is injected into the browser at runtime from
Cloudflare Worker bindings. `npm run build:worker` includes a browser-bundle
guard that fails if local/demo placeholders would be served to users.

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
token, visible video surface, background switching, join, leave, rejoin, and concurrent-join evidence are proven. Set
`ANION_ADMIN_EMAIL` to include admin dashboard evidence, and set
`ANION_EVIDENCE_POST_CLASSROOM=1` only when a controlled test classroom post is
acceptable.

For dedicated Google QA accounts, first have the parent, tutor, and student
accounts sign in once with Google. Then provision the role/domain fixture:

```powershell
$env:ANION_PARENT_EMAIL="parent-qa@example.com"
$env:ANION_TUTOR_EMAIL="tutor-qa@example.com"
$env:ANION_STUDENT_EMAIL="student-qa@example.com"
npm run phase1:provision-google-qa
```

The command validates that each account has a Google identity, upserts
`profiles`, `user_roles`, `parents`, `students`, `tutors`, and
`parent_student_links`, then creates an accepted `Anion Phase 1 QA Live
Classroom` booking. Use the returned booking ID as `ANION_PHASE1_BOOKING_ID`
for the evidence run.

If the service-role key is not available, run the manual Google-auth evidence
mode instead:

```powershell
npm run phase1:evidence:manual
```

This opens headed browser contexts for parent, tutor, and student sign-in,
saves reusable storage states under `test-results/phase1-auth-states/`, then
runs the same strict video checks. Later reruns can use the saved sessions in
headless mode with:

```powershell
$env:ANION_PHASE1_AUTH_MODE="manual"
node ./scripts/phase1-call-evidence.mjs
```

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
Production Daily provider settings are configured. Parent visibility/denial and
tutor/student Daily room-token evidence pass in production. The lesson room now
uses Anion's first-party Daily call UI instead of the hosted Daily prebuilt UI;
handover still requires authenticated tutor/student video join, background,
leave, and rejoin proof from `npm run phase1:evidence`.
