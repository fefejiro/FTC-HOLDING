# Railway Services

Last updated: 2026-04-02

This document defines the intended Railway surface for the monorepo under a lean Hobby plan.

## Active services

### FTC-HOLDING

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

### dispatch-api

- Status: `active`
- Purpose: Dispatch runtime behind the Dispatch Cloudflare edge worker
- Repo/app path: `APPS/dispatch`
- Builder: Dockerfile
- Build command: handled by Dockerfile
- Start command: `npm run start`
- Health endpoint:
  - `/health`
  - `/api/health`
- Domain(s):
  - Railway fallback: `https://dispatch-api-production.up.railway.app`
  - Public entry is Cloudflare worker owned:
    - `https://dispatch.unalabs.cloud`
    - `https://dispatch-admin.unalabs.cloud`
- Required env vars:
  - `NODE_ENV=production`
  - `PORT`
  - `DATABASE_URL`
  - `DISPATCH_ADMIN_PIN`
  - `DISPATCH_ADMIN_PROXY_KEY`
  - `VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_EMAIL`
- Notes:
  - Deploy from `APPS/dispatch` only.
  - `npm ci --workspaces=false` and `npm run build` both pass from the app root after the lockfile sync.
  - The root-level duplicate `Dockerfile.dispatch` has been removed; `APPS/dispatch/Dockerfile` is now the only valid Railway Docker path.

## Paused services

### sunny-acceptance

- Status: `paused`
- Purpose: SayWetin API runtime when active server-side audio / AI processing is needed
- Repo/app path: `APPS/saywetin`
- Builder: Dockerfile
- Build command: handled by Dockerfile
- Start command: Docker default / `npm run start`
- Health endpoint:
  - `/health`
  - `/api/health`
- Domain(s):
  - preferred when active: `api.saywetin.app`
  - public web remains on:
    - `https://saywetin.app`
    - `https://www.saywetin.app`
- Required env vars when reactivated:
  - `NODE_ENV=production`
  - `DEPLOY_ROLE=api`
  - `PUBLIC_BASE_URL=https://api.saywetin.app`
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `PORT`
  - AI / recognition envs only if the feature set is live:
    - `OPENAI_API_KEY`
    - `ACRCLOUD_HOST`
    - `ACRCLOUD_ACCESS_KEY`
    - `ACRCLOUD_ACCESS_SECRET`
- Notes:
  - The app root is still deployment-ready, but a lean Hobby plan should treat this service as intentionally paused unless SayWetin needs always-available backend compute again.
  - `APPS/saywetin/railway.json` remains the canonical reactivation config.

## Archive candidates

### ftc-site on Railway

- Status: `archive candidate`
- Purpose: none
- Repo/app path: `APPS/ftc-site`
- Railway action: remove any stale Railway service from the dashboard
- Correct platform:
  - Cloudflare Pages only
- Notes:
  - `ftc-site` should not stay in the Railway surface area.
  - Canonical Cloudflare config lives with the app, not in Railway.

## Root path rule

For every active or paused Railway service, the app root is the deployment root:

- `APPS/peacepad`
- `APPS/ATEAM`
- `APPS/dispatch`
- `APPS/saywetin`

Do not deploy from monorepo root as a fallback pattern.
