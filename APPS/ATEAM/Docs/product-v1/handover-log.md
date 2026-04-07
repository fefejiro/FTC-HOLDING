# ATEAM V1 Handover Log

## 2026-04-07

### Summary

Implemented the ATEAM V1 reframe so the public workflow now follows a clearer `intake -> normalize -> plan -> approve -> execute -> artifact -> log -> evaluate` contract without replacing existing routes.

### Files Changed

- `APPS/ATEAM/Server/lib/workflowEngine.js`
- `APPS/ATEAM/Server/lib/workflowService.js`
- `APPS/ATEAM/Server/lib/workflowRunStore.js`
- `APPS/ATEAM/Server/lib/sqliteDb.js`
- `APPS/ATEAM/Server/lib/storage/backends/postgres.js`
- `APPS/ATEAM/Server/lib/storage/backends/postgresCore.js`
- `APPS/ATEAM/Server/lib/storage/backends/supabaseCore.js`
- `APPS/ATEAM/Server/server.js`
- `APPS/ATEAM/supabase/migrations/20260407000100_ateam_v1_reframe.sql`
- `APPS/ATEAM/Server/__tests__/unit/workflowEngine.test.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowRunStore.test.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowService.test.js`
- `APPS/ftc-site/lib/ateamWorkflow.ts`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`
- `APPS/ATEAM/README.md`
- `APPS/ATEAM/Docs/README.md`
- `APPS/ATEAM/Docs/product-v1/*`

### Decisions Made

- Keep existing workflow routes and extend their payloads
- Introduce `request`, `plan`, `evaluation`, `state`, `stateHistory`, and `recentArtifact` on workflow runs
- Preserve `phase` as a compatibility layer
- Keep the current decision pack as the default artifact bundle
- Make plan review the main public trust step

### Validation

- `npm --prefix APPS/ATEAM run verify:server`
- `npm --prefix APPS/ATEAM run test:backend`
- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- No production deployment was performed in this session
- Live manual QA remains useful before broader release

### Exact Next Step

Run a focused live QA pass on `/ateam`, then deploy the updated `APPS/ATEAM` + `APPS/ftc-site` surfaces through the normal Una Labs release path.

## 2026-04-07 Copy Polish Follow-up

### Summary

Tightened the workflow copy heuristics after live QA surfaced awkward truncated titles and over-inferred audience text.

### Files Changed

- `APPS/ATEAM/Server/lib/workflowEngine.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowEngine.test.js`

### Decisions Made

- derive cleaner titles from rough ideas instead of leading with verbs like `Build` or `Create`
- only treat context as audience when it actually reads like one
- fall back to audience clues in the original idea before using generic preset language
- make brief summaries sound more intentional and less stitched together

### Validation

- `npm --prefix APPS/ATEAM run test:backend`
- `npm --prefix APPS/ATEAM run verify:server`

### Exact Next Step

Push this polish pass, wait for deploy propagation, then rerun one short live QA pass on `/ateam` to confirm the improved titles and summaries are visible in production.

## 2026-04-07 Phase 2 Surface Extension

### Summary

Extended the public ATEAM surface with the first V2-facing scaffolding while keeping the V1 product definition intact. The current pass adds request templates, agent role visibility, filtered recent-run browsing, and editable-plan scaffolding before approval.

### Files Changed

- `APPS/ATEAM/Server/lib/workflowEngine.js`
- `APPS/ATEAM/Server/lib/workflowService.js`
- `APPS/ATEAM/Server/lib/workflowRunStore.js`
- `APPS/ATEAM/Server/server.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowRunStore.test.js`
- `APPS/ATEAM/Server/__tests__/unit/workflowService.test.js`
- `APPS/ftc-site/lib/ateamWorkflow.ts`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`
- `APPS/ATEAM/Docs/product-v1/README.md`
- `APPS/ATEAM/Docs/product-v1/product-scope-v1.md`
- `APPS/ATEAM/Docs/product-v1/architecture-v1.md`
- `APPS/ATEAM/Docs/product-v1/implementation-plan.md`

### Decisions Made

- keep templates and role metadata as catalog data from the backend instead of inventing new route families
- keep editable plans as pre-approval scaffolding layered onto the existing normalized plan
- keep recent-run improvements inside the current public list surface instead of building a full history product
- preserve the single-agent contract and stable public routes

### Validation

- `npm --prefix APPS/ATEAM run test:backend`
- `npm --prefix APPS/ATEAM run verify:server`
- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- live QA is still useful after deploy propagation to verify the new template and editable-plan affordances on production
- plan editing remains intentionally lightweight and should not expand into full workflow authoring without a new product decision

### Exact Next Step

Push the Phase 2 pass, confirm the public `/ateam` deploy is live, then run a focused browser QA of template selection, plan editing, filtered recent runs, and final pack generation.

## 2026-04-07 Public Fallback Workaround

### Summary

Added a public-facing fallback path for `/ateam` so the workflow stays testable even when the Railway `ateam-api` service is paused. The Phase 2 frontend now detects upstream failures like `Application not found` and transparently switches into a browser-local workflow simulator.

### Files Changed

- `APPS/ftc-site/lib/ateamWorkflowLocal.ts`
- `APPS/ftc-site/app/ateam/AteamWorkflowClient.tsx`
- `APPS/ftc-site/styles/globals.css`

### Decisions Made

- keep the normal cloud API path as the default and only fall back when the live workflow upstream is unavailable
- make the fallback explicit to the user with a visible notice so local-browser runs are not mistaken for the shared backend
- reuse ATEAM workflow-engine logic where possible so the local simulation still follows the same request, plan, approval, and pack shapes

### Validation

- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- the Railway `ateam-api` service is still paused for usage limits, so the fallback is a continuity path, not a replacement for the real shared runtime
- live QA is still needed after deploy propagation to confirm the fallback activates cleanly on `unalabs.cloud/ateam`

### Exact Next Step

Push the fallback pass, let Cloudflare deploy it, then verify on the public host that `/ateam` shows the local-demo banner and still completes the intake -> plan -> approve -> pack flow while Railway remains paused.

## 2026-04-07 Pages Preview Bypass

### Summary

Added a Pages-preview bypass so direct `*.pages.dev` deployment URLs can be used for live QA without being forced back to the canonical `unalabs.cloud` host. This creates a reliable test lane when the custom-domain alias or cache lags behind the newest production deployment.

### Files Changed

- `APPS/ftc-site/middleware.ts`

### Decisions Made

- keep canonical redirect behavior as the default for `*.pages.dev`
- allow an explicit `?preview=1` query flag to bypass the redirect only for Pages preview hosts
- use the bypass as a deployment-verification tool, not as a public canonical entrypoint

### Validation

- pending deploy propagation and direct Pages-preview smoke check

### Unresolved Issues

- `unalabs.cloud` is still intermittently serving the pre-fix fallback build even when Pages marks the newest deployment active
- the Railway `ateam-api` backend remains paused, so preview testing still relies on the public fallback mode

### Exact Next Step

Deploy this middleware change, then open the newest Pages deployment URL with `/ateam?preview=1` to confirm the latest build can be tested directly even while the apex domain is stale.

## 2026-04-07 Edge API Fallback For Paused Railway

### Summary

Added an API-layer ATEAM edge fallback so `APPS/ftc-site` can answer `/api/ateam/workflow/*` directly when the Railway `ateam-api` upstream returns `Application not found` or similar availability failures. This is meant to let even a stale public frontend complete a run while the backend service is paused.

### Files Changed

- `APPS/ftc-site/lib/ateamWorkflowEdgeFallback.ts`
- `APPS/ftc-site/lib/ateamUpstream.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/route.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/[runId]/route.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/[runId]/answers/route.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/[runId]/approve/route.ts`
- `APPS/ftc-site/app/api/ateam/workflow/runs/[runId]/generate-pack/route.ts`

### Decisions Made

- keep the normal upstream proxy path first and only switch to edge fallback when the upstream clearly fails
- use a short-lived in-memory session store keyed by cookie as a continuity path for public demo testing
- keep the fallback response shape aligned with the public workflow contract so the older frontend can still progress through the run

### Validation

- `npm --prefix APPS/ftc-site run build`

### Unresolved Issues

- the edge fallback is a continuity mechanism, not durable shared storage
- `unalabs.cloud` and Pages deployment aliases are still serving inconsistent frontend builds, so the fallback mainly protects the API layer while Cloudflare catches up

### Exact Next Step

Push the edge fallback, let Cloudflare deploy it, then re-run the public `/ateam` flow to confirm the live page can complete intake -> plan -> approve -> pack even while Railway stays paused.
