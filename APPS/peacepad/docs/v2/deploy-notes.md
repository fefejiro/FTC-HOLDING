# PeacePad v2 Deploy Notes

## Production Routing Recovery - 2026-06-17

- Cloudflare Pages serves the frontend at `peacepad.ca`.
- Railway serves the API at `api.peacepad.ca`.
- Recovered Railway service:
  - Workspace/project: `splendid-spirit`
  - Environment: `production`
  - Service: `@ftc/peacepad`
  - API target: `qzw9nso8.up.railway.app`
- Local CLI link should point at project `e9cee72a-a4b0-470c-8280-b51ff62ec4e0`, service `df4a35e3-b3de-4aa4-9cf0-5e0d9af206bc`.
- Do not relink to the old paused Railway project. It caused `api.peacepad.ca` to return Railway `404` / fetch failures.

Recovery verification commands:

```powershell
railway status
npm --prefix APPS/peacepad run verify:deployment-ownership
$env:SMOKE_API_BASE_URL='https://api.peacepad.ca'; npm --prefix APPS/peacepad run smoke:guest-auth
Invoke-RestMethod https://api.peacepad.ca/api/health
```

Closure status on 2026-06-18:

- Latest green Railway deployment: `34f1b980-0e91-41ed-81b1-5f79d56a7f66`.
- Latest deployed commit: `0bc84c88c5d94cf0215abd760d5362d5baca0369`.
- Production smoke: `smoke:guest-auth` passed against `https://api.peacepad.ca`.
- Production ownership: `verify:deployment-ownership` passed.
- Human workflow proof: desktop and Android-sized Playwright projects passed.

Closure proof commands:

```powershell
npm --prefix APPS/peacepad run check
npm --prefix APPS/peacepad run build
$env:SMOKE_API_BASE_URL='https://api.peacepad.ca'; npm --prefix APPS/peacepad run smoke:guest-auth
npm --prefix APPS/peacepad run verify:deployment-ownership
npm --prefix APPS/peacepad run test:e2e:human-workflow
npm --prefix APPS/peacepad run test:e2e:human-workflow:mobile
```

Android note: production Android uses `server.url = 'https://peacepad.ca'` in `capacitor.config.ts`. Normal frontend fixes deployed to Cloudflare Pages and backend fixes deployed to Railway are picked up by Android users. Native app shell changes still require a rebuilt APK/AAB.

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
