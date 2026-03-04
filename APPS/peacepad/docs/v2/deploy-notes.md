# PeacePad v2 Deploy Notes

## Isolation Strategy
- v2 code is fully isolated under `server/v2/*`.
- v2 routes are mounted at `/v2` from `server/routes.ts`.
- Existing v1 `/api/*` handlers are not modified.

## Route Mount
- Main registration adds:
  - `app.use("/v2", createV2Router())`
- v1 behavior remains on `/api/*`.

## Database Changes
- New v2 tracking tables:
  - `pp_v2_module_runs`
  - `pp_v2_launcher_state`
- Drizzle schema updated in `shared/schema.ts`.
- Operational SQL added in `server/migrations/20260304_pp_v2_module_engine.sql`.

## Rollout Sequence
1. Deploy code with v2 routes enabled.
2. Apply migration SQL (or Drizzle-managed equivalent).
3. Run `/v2/health` smoke check.
4. Run module endpoint smoke checks.
5. Confirm key v1 endpoint(s) still respond (`/api/version` minimum).

## Risk Mitigations
- Strict request/response schemas on every v2 endpoint.
- Module run tracking is best-effort and non-blocking.
- v2 uses additive routing and does not overwrite existing handlers.
