# FTC HOLDING

![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)

This monorepo contains multiple related applications and shared packages for the FTC ecosystem.

## Workspace layout
- `APPS/` – individual applications (ftc-site, peacepad, saywetin)
- `PACKAGES/` – shared libraries; currently contains `ateam`

## Running
- `npm install` to install dependencies for all workspaces.
- `npm run dev` (runs ftc-site dev server).
- `npm run build` builds all apps sequentially.
- `npm run test` runs available tests in each workspace.
- `npm run dev:peacepad` / `npm run dev:saywetin` for other apps.

## PeacePad API Base URL
- `VITE_API_BASE_URL` is optional and overrides the client API host for web + native.
- If `VITE_API_BASE_URL` is unset:
  - Web defaults to same-origin (`""`), so requests stay on the current host.
  - Capacitor native falls back to `https://api.peacepad.ca`.

## PeacePad Guest Cookie Security
- Guest auth cookie: `peacepad_guest` (`HttpOnly`).
- `SameSite=Lax` by default for same-origin web sessions (CSRF baseline).
- `SameSite=None; Secure` only for secure cross-site contexts (for native/webview cross-origin API usage).

## Notes
Keep each app as a standalone project; migrations use `robocopy` to move content.

## Deploy on Railway (PeacePad API)
1. Create a Railway service from this repo with:
   - Root Directory: `APPS/peacepad`
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Start Command: `npm run start`
2. In Railway `Variables`, add at minimum:
   - `NODE_ENV=production`
   - `PORT` (Railway usually injects this automatically)
   - `SESSION_SECRET`
   - `DATABASE_URL` (and optional `DIRECT_URL`)
   - `OPENAI_BASE_URL`
   - `OPENAI_API_KEY`
   - `VITS_BASE_URL`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL`
   - `MAILJET_API_KEY`
   - `MAILJET_SECRET_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_JSON_PATH`
3. CORS configuration:
   - Always allow `https://peacepad.ca`.
   - Add extra allowed browser origins to `CORS_ALLOWED_ORIGINS` (comma-separated).
   - Optional origin inputs: `PUBLIC_BASE_URL` and `APP_ORIGINS`.
4. Railway healthcheck path:
   - `/health` (fast 200)

Local setup helper:
- Run `node scripts/setup-env.mjs` to create `APPS/peacepad/.env` interactively without echoing secret values.
