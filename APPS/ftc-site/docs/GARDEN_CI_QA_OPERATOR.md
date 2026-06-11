# Garden CI QA Operator

Last updated: 2026-06-11

## Purpose

Garden Cleaners now has a dedicated CI and QA operator surface for workflow hardening, release evidence, and repeatable portal testing. This is intentionally separate from runtime bug fixing.

## Ownership Boundary

The Garden CI QA operator owns:

- `.github/agents/garden-ci-qa-operator.agent.md`
- `.github/workflows/garden-portal-deep-qa.yml`
- Garden QA documentation and handoff notes
- CI summaries, artifacts, and test-gate wiring

The operator does not deploy and does not edit Garden portal runtime source unless the user explicitly reassigns that work.

## Automated Gates

### 1. Environment Contract And Build

Workflow job: `build-and-env`

Commands:

```powershell
npm ci
npm --prefix APPS/ftc-site run portal:env:check
npm --prefix APPS/ftc-site run garden:worker-contract
npm --prefix APPS/ftc-site run build
```

Coverage:

- Required Garden portal environment variable names are present for the run.
- Garden client message writes survive photo-storage failure.
- Supabase Storage object uploads use the expected method when storage is available.
- The ftc-site build succeeds with Garden routes and worker packaging in scope.
- No Cloudflare Pages deploy is performed.

### 2. Anonymous Public And Portal QA

Workflow job: `anonymous-playwright`

Command:

```powershell
npx playwright test tests/garden-cleaners-public.spec.ts tests/garden-portal.spec.ts --grep-invert "quote form accepts a valid lead" --reporter=line
```

Coverage:

- Garden public routes render branding, headings, and media.
- Desktop and mobile navigation route to the expected Garden pages.
- Custom-domain host behavior keeps Garden clean paths working.
- Public portal CTAs render.
- Oshawa region quote routing reaches the quote page with the region query.

Quote persistence is intentionally excluded from this anonymous smoke job. Run it as a separate service-backed gate only when Supabase QA data and delivery expectations are intentionally in scope.

### 3. Credentialed Portal Role QA

Workflow job: `credentialed-portal`

Command:

```powershell
npx playwright test tests/garden-portal-credentialed.spec.ts --reporter=line
```

Coverage when configured:

- Customer can sign in and see the seeded Garden record.
- Staff can sign in without admin-only region controls.
- Admin can sign in and see operator queue controls.

Required GitHub secrets:

- `GARDEN_QA_AUTH_MODE=password`
- `GARDEN_QA_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL` or compatible fallback secret
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or compatible fallback secret

Optional QA identity secrets:

- `GARDEN_QA_ADMIN_EMAIL`
- `GARDEN_QA_STAFF_EMAIL`
- `GARDEN_QA_CUSTOMER_EMAIL`

If these are missing, the workflow reports the gate as skipped. Skipped credentialed QA is not verified role coverage.

This is a legacy password-based role spec. It is not Google OAuth verification. Keep Google sign-in coverage manual or add a CI-safe Google-auth strategy before calling OAuth role coverage verified.

### 4. Manual Read-Only Production Smoke

Workflow job: `production-readonly-smoke`

Run from `workflow_dispatch` with `production_smoke` set to `true`.

Commands:

```powershell
npm --prefix APPS/ftc-site run garden:smoke:prod
cd APPS/ftc-site
node scripts/qa-garden-auth-callback.mjs
```

Coverage:

- `gardencleaners.ca` route availability.
- Garden quote and portal route availability.
- Garden Pages route sanity checks when a Pages URL is supplied.
- Garden auth callback does not show the global crash screen.
- Callback fallback CTAs navigate.

This gate is read-only and does not deploy.

## Local Operator Checklist

From the repository root:

```powershell
npm ci
npm --prefix APPS/ftc-site run portal:env:check
npm --prefix APPS/ftc-site run garden:worker-contract
npm --prefix APPS/ftc-site run build
cd APPS/ftc-site
npx playwright install chromium
npx playwright test tests/garden-cleaners-public.spec.ts tests/garden-portal.spec.ts --grep-invert "quote form accepts a valid lead" --reporter=line
npx playwright test tests/garden-portal-credentialed.spec.ts --reporter=line
```

For production read-only checks:

```powershell
npm --prefix APPS/ftc-site run garden:smoke:prod
cd APPS/ftc-site
node scripts/qa-garden-auth-callback.mjs
```

## Reporting Rules

Every Garden CI QA handoff should state:

- Gates run
- Gates passed
- Gates skipped and why
- Gates blocked and exact missing input
- Artifacts produced
- Remaining unverified production risk
- Confirmation that no deploy occurred
