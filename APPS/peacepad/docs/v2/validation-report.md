# PeacePad v2 Validation Report (Phase 0 + Phase 1)

## Metadata
- Date (UTC): 2026-03-04 18:16:01 UTC
- Branch: `fix/worker-build-ci`
- Head commit at validation start: `3685508`
- Scope: Phase 0 repo/tooling/docs validation + Phase 1 registry/router/health/tests/smoke validation

## Repeatable Validation (Action Build Readiness)
Run from `APPS/peacepad`.

### PowerShell
```powershell
Set-Location "APPS/peacepad"
npm run v2:openapi
git diff -- docs/v2/openapi.yml
npx vitest run tests/unit/v2/*.test.ts
# Optional: known legacy baseline check
npm run check
```

### bash
```bash
cd APPS/peacepad
npm run v2:openapi
git diff -- docs/v2/openapi.yml
npx vitest run tests/unit/v2/*.test.ts
# Optional: known legacy baseline check
npm run check
```

Smoke endpoint list (manual/API-client):
- `GET /v2/health`
- `POST /v2/conversation/orchestrate`
- `POST /v2/router/intent`
- `POST /v2/modules/conflict-check`
- `POST /v2/modules/rewrite-message`
- `POST /v2/modules/support-discovery`
- Guardrail: `GET /api/version`

Notes:
- `npm run v2:openapi` should regenerate `docs/v2/openapi.yml`; a clean `git diff -- docs/v2/openapi.yml` confirms no spec drift.
- `npm run check` may still fail due pre-existing legacy v1 typing issues outside the v2 scope; this is expected unless separately remediated.

## Commands Run and Results
1. Route mount inspection
- `sed -n '520,620p' APPS/peacepad/server/routes.ts`
- Result: `app.use("/v2", createV2Router())` mounted alongside existing `app.use("/api", trialEnforcer)`.

2. v1 isolation diff check
- `git diff --no-color f768f4a..HEAD -- APPS/peacepad/server/routes.ts`
- Result: only two additive changes in `routes.ts`: import `createV2Router` and `app.use("/v2", createV2Router())`; no v1 `/api/*` handler rewrites.

3. Tooling validation
- `cat APPS/peacepad/package.json`
- `cat APPS/peacepad/vitest.config.ts`
- `cat APPS/peacepad/drizzle.config.ts`
- `find APPS/peacepad/server/migrations -maxdepth 1 -type f`
- Result:
  - Validation: Zod schemas under `server/v2/schemas/*`
  - DB migrations: SQL in `server/migrations/*` + Drizzle (`drizzle-kit push`, schema at `shared/schema.ts`)
  - Test runner: Vitest (`npx vitest run ...`)

4. Required docs presence
- `ls -la APPS/peacepad/docs/v2`
- Result: required docs exist:
  - `README.md`
  - `capability-catalog.md`
  - `module-contracts.md`
  - `testing.md`
  - `env.md`
  - `deploy-notes.md`

5. Phase 1 unit tests
- `npx vitest run tests/unit/v2/intentRouter.test.ts tests/unit/v2/conflictCheck.test.ts tests/unit/v2/rewriteMessage.test.ts tests/unit/v2/supportDiscovery.test.ts`
- Result: pass (`4` files, `6` tests).

6. Local smoke
- Server bundle: `npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=.tmp/pp-v2-smoke.js`
- Server run: `node .tmp/pp-v2-smoke.js` (dev env)
- Endpoint checks:
  - `GET /v2/health` -> `200`
  - `POST /v2/router/intent` with `{ "text": "We argued about pickup time again." }` -> `200`
  - `GET /api/version` -> `200`
- Result: all required smoke checks passed; v1 guardrail remained healthy.

## Phase 0 Validation Outcome
### 1) Route mounting and isolation
- Confirmed v2 is mounted under `/v2`.
- Confirmed v1 `/api` path remains present and additive behavior is preserved.
- Confirmed no v1 route rewrites were introduced for Phase 1 scope.

### 2) Tooling confirmation
- Schema validation approach: Zod (`server/v2/schemas/*`).
- DB migration approach: SQL migrations in `server/migrations/*` with Drizzle support (`drizzle.config.ts`, `db:push`).
- Tests: Vitest via `npx vitest run` and config in `vitest.config.ts`.

### 3) Docs accuracy check
- Required docs exist.
- Required docs are consistent with current Phase 1 code and contracts.
- No secrets were added.

## Phase 1 Validation Outcome
### 1) Module registry
- `server/v2/registry/moduleRegistry.ts` contains stable IDs:
  - `PP_MOD_ROUTER_INTENT`
  - `PP_MOD_CONFLICT_CHECK`
  - `PP_MOD_REWRITE_MESSAGE`
  - `PP_MOD_SUPPORT_DISCOVERY`
- Metadata fields confirmed: `title`, `description`, `tags`, `risk_level`, `endpoint_path`, `version`.

### 2) Intent router endpoint contract
- `server/v2/router/intentRoute.ts` uses strict request validation (`safeParse`) and response parse enforcement.
- `server/v2/schemas/intent.ts` confirms response includes:
  - `module_id`
  - `conflict_level`
  - `safety_flags`
  - `recommended_action`
  - `followup_questions`
  - `suggested_cards`

### 3) v2 health endpoint
- `GET /v2/health` exists in `server/v2/routes/index.ts`.
- Response contract (`server/v2/schemas/health.ts`) includes `status`, `version`, `time`.
- Validation showed no sensitive config leakage in response payload.

### 4) Test status
- Phase 1 unit tests passed.

### 5) Local smoke status
- Required Phase 1 local smoke checks passed.
- v1 guardrail endpoint remained successful.

## Issues Found and Fixes
- No validation blockers found.
- No product behavior changes were required during this validation pass.

## Follow-up Recommendations
- Apply and verify `server/migrations/20260304_pp_v2_module_engine.sql` in production before relying on tracker analytics.
- Run production smoke for `/v2/health`, `/v2/router/intent`, and `/api/version` immediately after deployment.
- Add one lightweight route-level integration test for `/v2/health` headers and status contract.
- Keep `docs/v2/testing.md` snapshot updated with each validation run.
- Track first-week v2 error rate by `module_id` and `error_code` to catch early regressions.

## Cleanup validation (2026-03-05)
- `npm run v2:openapi`
  - Result: pass (`[v2:openapi] Wrote .../docs/v2/openapi.yml`).
- `npx vitest run tests/unit/v2/*.test.ts`
  - Result in this shell: `No test files found` (glob was not expanded by this invocation).
- `npx vitest run tests/unit/v2` (deterministic equivalent)
  - Result: pass (`8` files, `19` tests).
- `git diff -- docs/v2/openapi.yml`
  - Result: clean (no content diff after regeneration/tests).
