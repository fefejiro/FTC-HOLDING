# PeacePad Deployment Stabilization Report (2026-03-06)

## 1) Deployment architecture diagram

```text
GitHub (main)
  ├─> Cloudflare Pages (frontend build: APPS/peacepad -> dist/public)
  │     └─> peacepad.ca / www.peacepad.ca
  └─> Railway (backend API service)
        └─> api.peacepad.ca
```

Cloudflare Workers are not frontend owners; they should only handle edge concerns (headers, redirects, routing glue, caching).

## 2) Confirmed hosting ownership

- `https://peacepad.ca/onboarding`
  - returns `200 text/html`
  - response header includes `Server: cloudflare`
  - bundle reference observed: `/assets/index-BPKOCSH0.js`
- `https://api.peacepad.ca/api/health`
  - returns `200 application/json`
  - response header includes `Server: railway-edge`

## 3) Current production routing explanation

- Frontend requests to `peacepad.ca` are Cloudflare-served.
- Backend requests to `api.peacepad.ca` are Railway-served.
- Routing ambiguity still exists on Railway because:
  - `https://api.peacepad.ca/onboarding` currently returns `200 text/html` (should be API-only `404` JSON in the target architecture).
- `npm --prefix APPS/peacepad run verify:deployment-ownership` currently fails on this exact check.

## 4) Configuration/code changes made

### Deployment orientation + guardrails

- Added top-level runbook: `START_HERE.md`
  - explicitly states host ownership, source-of-truth model, and high-priority checks.

### Myers-Briggs Prep Chat fix

- Updated `APPS/peacepad/server/services/prepChatService.ts`
  - added MBTI normalization and profile builder (`buildPrepChatPersonalityProfile`)
  - added deterministic adaptation rules for prompt + suggested revisions
  - added structured personality metadata in analysis responses
  - added logs to trace applied personality context
- Updated `APPS/peacepad/server/routes.ts`
  - `/api/prep-chat/analyze-draft` now normalizes MBTI payloads and ignores invalid values safely.
- Updated `APPS/peacepad/client/src/pages/prep-chat.tsx`
  - captures/accepts personality adaptation metadata from API response
  - logs personality adaptation trace in development tools.
- Added regression tests: `APPS/peacepad/tests/unit/prepChatPersonality.test.ts`

## 5) Verification results

### Targeted tests (passed)

- `server/lib/deploymentMode.test.ts`
- `shared/peacepad/scheduling.test.ts`
- `shared/peacepad/expenseSettlement.test.ts`
- `tests/unit/personality.test.ts`
- `tests/unit/prepChatPersonality.test.ts`

Command used:

```bash
npm --prefix APPS/peacepad run test -- --run tests/unit/prepChatPersonality.test.ts tests/unit/personality.test.ts shared/peacepad/expenseSettlement.test.ts shared/peacepad/scheduling.test.ts server/lib/deploymentMode.test.ts
```

### Build checks

- Frontend static build succeeds:
  - `Set-Location APPS/peacepad; npm exec vite build`
- Server bundle compile succeeds:
  - `Set-Location APPS/peacepad; npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
- Note: `npm run build` fails on Windows because `clean` script uses `rm -rf`.

### Live ownership check (still failing due platform config)

- `npm --prefix APPS/peacepad run verify:deployment-ownership`
  - fails because `api.peacepad.ca/onboarding` returns `200`, not `404`.

### Playwright smoke slice against production (safe/non-mutating)

Command used:

```bash
npx playwright test \
  tests/e2e/p1-critical/auth.spec.ts \
  tests/e2e/p3-nice-to-have/support-terms.spec.ts \
  tests/e2e/p3-nice-to-have/accessibility.spec.ts \
  tests/e2e/p3-nice-to-have/therapist-directory.spec.ts \
  --project=p1-critical-chromium --project=p3-nice-to-have-chromium --no-deps
```

Results:

- Passed:
  - `auth.spec.ts` (3/3)
  - `accessibility.spec.ts` (4/4)
- Failed:
  - `support-terms.spec.ts` due strict locator ambiguity (duplicate headings found, page itself loaded)
  - `therapist-directory.spec.ts` because expected `data-testid` selectors were not found in the live DOM

Additional guest-onboarding check:

- `tests/e2e/p1-critical/guest-onboarding.spec.ts`
  - 1 passed, 1 failed
  - failing test expected JSON from `/api/auth/user` but received HTML shell from `peacepad.ca` origin in this setup.

## 5.1) Post-push deployment propagation status

- Commit pushed to `main`: `dc95478` (`fix(prep-chat): apply MBTI adaptation and add deployment handoff`)
- Immediate post-push live checks still show prior production state:
  - `https://api.peacepad.ca/api/version` -> `{"buildId":"1772798298477"}`
  - `https://api.peacepad.ca/onboarding` -> `200 text/html`
  - `https://peacepad.ca/onboarding` bundle -> `/assets/index-BPKOCSH0.js`
- Conclusion: push succeeded, but production rollout had not propagated at validation time.

## 6) Myers-Briggs bug root cause and fix summary

### Root cause

- Personality selections were sent from UI but adaptation impact could still appear generic, especially in fallback paths.
- Draft analysis fallback logic did not enforce personality-aware shaping of suggested revisions.
- There was no consistent structured trace to confirm that personality context was applied.

### Fix

- Added explicit MBTI adaptation profile logic and deterministic style shaping for suggested revisions.
- Applied the same adaptation path in AI and non-AI fallback flows.
- Added personality context metadata + logs for debug traceability.
- Added regression tests proving distinct personality pairings produce distinct revised outputs.

## 7) Remaining risks / technical debt

1. Railway production must run in API-only role (`DEPLOY_ROLE=api`) and be redeployed; otherwise non-API routes on `api.peacepad.ca` keep serving HTML.
2. Cloudflare Pages production appears to be on an older frontend bundle hash than Railway’s embedded frontend artifact; Pages redeploy from `main` is required to remove drift.
3. `APPS/peacepad` Windows build script (`clean`) should be made cross-platform (replace `rm -rf` with a cross-platform alternative).
4. Play Store/Android release state remains independent from this web deployment work.
