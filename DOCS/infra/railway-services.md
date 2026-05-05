# Railway Services

Last updated: 2026-04-07

This document defines the intended Railway surface for the monorepo under a lean Hobby plan.

Related live-project note:
- [railway-solo-budget-lively-simplicity.md](/C:/FTC%20HOLDING/DOCS/infra/railway-solo-budget-lively-simplicity.md)

## Active services

### @ftc/peacepad

- Status: `active`
- Purpose: PeacePad API runtime only
- Repo/app path: `APPS/peacepad`
- Builder: standard Railway/Nixpacks flow from the app root
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm run build:api`
- Start command: `npm run start`
- Health endpoint:
  - `/health`
  - `/api/health`
- Domain(s):
  - `api.peacepad.ca`
- Live verification:
  - `https://api.peacepad.ca/health`
  - `https://api.peacepad.ca/api/health`
- Required env vars:
  - `NODE_ENV=production`
  - `DEPLOY_ROLE=api`
  - `PUBLIC_BASE_URL=https://api.peacepad.ca`
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `APP_ORIGINS`
  - `CORS_ALLOWED_ORIGINS`
  - `ISSUER_URL`
  - `REPL_ID`
  - `PORT`
  - feature envs only as needed: `OPENAI_API_KEY`, `MAILJET_*`, `VAPID_*`
- Notes:
  - Service now lives in Railway project `lively-simplicity`.
  - Use `APPS/peacepad/railway.json` for deploy expectations.
  - Keep Railway API-only. The web app remains on Cloudflare Pages.

### ateam-api

- Status: `active`
- Purpose: ATEAM runtime behind Cloudflare public and ops workers
- Repo/app path: `APPS/ATEAM`
- Builder: standard Railway/Nixpacks flow from the app root
- Install command: auto-detected from root package plus `postinstall`
- Build command: none required
- Start command: `npm run start`
- Health endpoint:
  - `/health`
- Domain(s):
  - Railway fallback domain only, for example `https://ateam-api-production.up.railway.app`
  - Public branded entry stays on Cloudflare:
    - `https://unalabs.cloud/ateam*`
    - `https://ops.unalabs.cloud`
- Required env vars:
  - `NODE_ENV=production`
  - `PORT`
  - `ATEAM_AUTH_MODE=trusted_proxy`
  - `ATEAM_TRUSTED_PROXY_KEY`
  - `ATEAM_ALLOWED_ORIGINS`
  - `ATEAM_PUBLIC_SERVICE_MODE=false`
  - `ATEAM_STORAGE_BACKEND`
  - `ATEAM_DATABASE_URL` or `DATABASE_URL`
  - optional model/provider envs as needed: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`
- Notes:
  - Use `APPS/ATEAM/railway.json` as the canonical deploy config.
  - Keep it easy to disable later by preserving Cloudflare worker boundaries and avoiding direct public domain dependence on Railway.

### ateam-platform

- Status: `active but optional`
- Purpose: ATEAM backend runtime when shared persistence is needed beyond the current public demo/fallback path
- Repo/app path: `APPS/ATEAM`
- Builder: standard Railway/Nixpacks flow from the app root
- Start command: `npm run start --workspace=ateam-platform`
- Notes:
  - Keep only if the shared ATEAM backend is actively being used.
  - Otherwise archive it to protect the solo budget.

## Inactive or archive-candidate services

### @ftc/ftc-site

- Status: `inactive / archive candidate`
- Purpose: none
- Repo/app path: `APPS/ftc-site`
- Railway action: active deployment already removed; remove the service from the dashboard when convenient
- Correct platform:
  - Cloudflare Pages only
- Notes:
  - `ftc-site` should not stay in the Railway surface area.
  - Canonical Cloudflare config lives with the app, not in Railway.

### @ftc/dispatch

- Status: `inactive / archive candidate`
- Purpose: currently unnecessary on the solo budget plan
- Repo/app path: `APPS/dispatch`
- Notes:
  - No active deployment is running.
  - Do not reactivate unless Dispatch is being worked on intentionally.

### @ftc/peacepad-extension

- Status: `inactive / archive candidate`
- Purpose: extension builds are not worth hobby-plan spend right now
- Repo/app path: `APPS/peacepad-extension`
- Notes:
  - No active deployment is running.
  - Remove from Railway when convenient.

## Root path rule

For every active or paused Railway service, the app root is the deployment root:

- `APPS/peacepad`
- `APPS/ATEAM`
- `APPS/dispatch`
- `APPS/saywetin`

Do not deploy from monorepo root as a fallback pattern.
