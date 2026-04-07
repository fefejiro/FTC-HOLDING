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
