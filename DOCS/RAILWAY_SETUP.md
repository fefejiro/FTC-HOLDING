# Railway Setup

Use two Railway services, one per API.

## Service: peacepad-api

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
- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm run start`
- Health checks:
  - `/health`
  - `/api/health`
  - `/api/status`

Required environment variables:

- `NODE_ENV=production`
- `PORT` (Railway sets this; do not hardcode)
- `DATABASE_URL`
- `SESSION_SECRET`
- `REPL_ID`
- `ISSUER_URL=https://replit.com/oidc`
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

Not required currently because each API has a working root-level package and start/build scripts Railway can run directly.

## Domain ownership rule (critical)

- Railway custom domain for PeacePad API: `api.peacepad.ca` only.
- `peacepad.ca` and `www.peacepad.ca` must remain on Cloudflare Pages.
