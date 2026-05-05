# PeacePad Deployment Architecture Audit (2026-03-06)

## Target architecture

```text
GitHub (main)
  ├─> Railway (API only) ---------> api.peacepad.ca
  └─> Cloudflare Pages (frontend) -> peacepad.ca / www.peacepad.ca
```

Cloudflare Workers are optional for edge concerns only (headers, redirects, cache tuning), not bundle ownership.

## Current observed production state

### Hosting ownership
- `api.peacepad.ca` is served by Railway (`server: railway-edge`).
- `peacepad.ca` and `www.peacepad.ca` are served by Cloudflare (`server: cloudflare`).

### Domain routing
- `api.peacepad.ca` DNS: `CNAME -> uka7e8pj.up.railway.app`
- `peacepad.ca` / `www.peacepad.ca` resolve to Cloudflare edge addresses.

### Cloudflare Pages production bundle
- Live bundle on `peacepad.ca`: `/assets/index-BPKOCSH0.js` (older behavior).
- Pages dev domain `https://ftc-holding.pages.dev` serves the same older bundle hash.

### Railway API host behavior
- Live API health and feature endpoints are current.
- Before this change, Railway also served frontend HTML on non-API routes.
- After this change, production with `DEPLOY_ROLE=api` is expected to return JSON `404` for non-API routes.

## GitHub repository and branch audit

- `main` synchronized to `origin/main` at `8e266d2`.
- Cleanup completed for stale remote branches from earlier emergency work.
- Backup branch retained: `backup/local-main-before-clean-prod-20260306`.

## Cloudflare Worker audit

- Worker config found at `workers/peacepadai/wrangler.toml`.
- No zone `routes` are defined in that worker config.
- No evidence in repo config that this worker should intercept `peacepad.ca` frontend bundle traffic.

## Configuration changes made in this task

1. API-only deployment guard added:
   - `APPS/peacepad/server/lib/deploymentMode.ts`
   - `APPS/peacepad/server/index.ts`
   - `APPS/peacepad/server/config.ts`

2. New environment contract:
   - `DEPLOY_ROLE=api|fullstack`
   - documented in `APPS/peacepad/.env.example`

3. Deployment ownership verification script:
   - `APPS/peacepad/scripts/verify-deployment-ownership.mjs`
   - script command: `npm run verify:deployment-ownership`
   - root shortcut: `npm run verify:peacepad:ownership`

4. Docs aligned to required architecture:
   - `DOCS/PEACEPAD_RAILWAY_API_SETUP.md`
   - `DOCS/PEACEPAD_PAGES_SETUP.md`
   - `DOCS/RAILWAY_SETUP.md`
   - `DOCS/DEPLOY_COMMANDS.md`

## Production behavior verification (post-change checks run in session)

### Backend (`api.peacepad.ca`)
- `GET /api/health` -> `200`
- Guest bootstrap -> `200` and guest cookie present
- `GET /api/parenting-tips` (guest) -> non-empty (`52`)
- `GET /api/weather-activities?childAgeMonths=24&weatherCondition=cold` (guest) -> non-empty (`5`)

### Frontend (`peacepad.ca`)
- Still serving older bundle hash at audit time.
- Key old behavior remained visible at audit time (before a forced Pages redeploy).

## Required platform actions (manual)

1. **Railway**
   - Set `DEPLOY_ROLE=api` in PeacePad production service environment.
   - Confirm service is connected to GitHub `main`.
   - Redeploy.

2. **Cloudflare Pages**
   - Confirm project tracks GitHub `main`.
   - Confirm root dir `APPS/peacepad`, build command `npm run build`, output `dist/public`.
   - Force a production redeploy.

3. **Post-redeploy verification**
   - `npm run verify:peacepad:ownership`
   - `https://api.peacepad.ca/api/health`
   - `https://peacepad.ca/onboarding`
   - `https://peacepad.ca/parenting-tips`
   - `https://peacepad.ca/weather-activities`

## Risks and notes

- If Cloudflare Pages is not redeployed from the latest `main`, frontend and backend behavior will continue to drift.
- If `DEPLOY_ROLE` is not set to `api` on Railway, the API host can still serve frontend HTML and mask routing ownership mistakes.
- Android/Play Store release remains independent of web deploys.

