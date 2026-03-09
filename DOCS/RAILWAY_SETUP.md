# Railway Setup

## Service: peacepad-api (in-repo)

- Root directory: `APPS/peacepad`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm run build`
- Start command: `npm run start`
- Health checks:
  - `/health`
  - `/api/health`

Required environment variables:
- `NODE_ENV=production`
- `DEPLOY_ROLE=api`
- `PORT` (Railway sets this; do not hardcode)
- `DATABASE_URL`
- `SESSION_SECRET`
- `REPL_ID`
- `PUBLIC_BASE_URL=https://api.peacepad.ca`
- `APP_ORIGINS=https://peacepad.ca,https://www.peacepad.ca`
- `CORS_ALLOWED_ORIGINS=https://peacepad.ca,https://www.peacepad.ca`
- `ISSUER_URL=https://replit.com/oidc`
- `OPENAI_API_KEY` (if AI features enabled)
- `MAILJET_API_KEY` (if email features enabled)
- `MAILJET_SECRET_KEY` (if email features enabled)
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`

## Service: saywetin-api

- Root directory: `APPS/saywetin`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile` (do not prepend `APPS/saywetin/` when root directory is already set)
- Build command: empty
- Start command: empty
- Health checks:
  - `/health`

Required environment variables:
- `NODE_ENV=production`
- `PORT` (Railway sets this; do not hardcode)
- `DATABASE_URL`
- `SESSION_SECRET`
- `VITE_API_BASE_URL` (recommended: `https://saywetin.app` for same-origin API routing)
- `OPENAI_API_KEY`
- `ACRCLOUD_HOST`
- `ACRCLOUD_ACCESS_KEY`
- `ACRCLOUD_ACCESS_SECRET`
- `GENIUS_API_KEY`

Post-deploy verification:

- `powershell -ExecutionPolicy Bypass -File scripts/verify-saywetin-prod.ps1`
- Release gate for listen pipeline:
  - `/api/status` must report `acrcloud.configured=true`
  - `/api/status` must report `openai.configured=true`

## Dockerfiles

- SayWetin API: Dockerfile deploy is required (`APPS/saywetin/Dockerfile` with root directory `APPS/saywetin`).
- PeacePad API: script-based Railway deploy remains valid (`npm install --legacy-peer-deps`, `npm run build`, `npm run start`).

## Domain ownership rule (critical)

- Railway custom domain for PeacePad API: `api.peacepad.ca` only.
- `peacepad.ca` and `www.peacepad.ca` must remain on Cloudflare Pages.
