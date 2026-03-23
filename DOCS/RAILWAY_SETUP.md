# Railway Setup

## Service: peacepad-api (in-repo)

- Recommended root directory: `APPS/peacepad`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm run build:api`
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
- Preferred API public domain: `api.saywetin.app`

Required environment variables:
- `NODE_ENV=production`
- `DEPLOY_ROLE=api`
- `PUBLIC_BASE_URL=https://api.saywetin.app`
- `PORT` (Railway sets this; do not hardcode)
- `DATABASE_URL` (Supabase pooler URI from project dashboard; username must be `postgres.<project-ref>`)
- `DATABASE_SSL_NO_VERIFY=true` (optional fallback if runtime reports TLS chain errors like `self-signed certificate in certificate chain`)
- `SESSION_SECRET`
- `VITE_API_BASE_URL` (recommended split-host value: `https://api.saywetin.app`)
- `OPENAI_API_KEY`
- `ACRCLOUD_HOST`
- `ACRCLOUD_ACCESS_KEY`
- `ACRCLOUD_ACCESS_SECRET`
- `ACRCLOUD_MIN_SCORE=55` (optional, stricter threshold for low-quality matches)
- `ACRCLOUD_ALLOW_HUMMING_FALLBACK=false` (optional, keep false to avoid noisy humming matches)
- `ACRCLOUD_MIN_HUMMING_SCORE=75` (optional)
- `GENIUS_API_KEY` (optional; app still works without it, but lyrics hit rate may drop)

Post-deploy verification:

- `powershell -ExecutionPolicy Bypass -File scripts/verify-saywetin-prod.ps1`
- Release gate for listen pipeline:
  - `/api/status` must report `acrcloud.configured=true`
  - `/api/status` must report `openai.configured=true`
  - `/api/status` must report `database.connected=true`

Troubleshooting:
- If `/api/listen` returns `DATABASE_CREDENTIAL_INVALID` or `Tenant or user not found`, the `DATABASE_URL` user/password is incorrect for the current Supabase project. Re-copy the session pooler URI from Supabase and paste it into Railway unchanged.
- If `/api/listen` returns `DATABASE_TLS_ERROR`, ensure `DATABASE_URL` includes `sslmode=no-verify` (or set `DATABASE_SSL_NO_VERIFY=true`) and redeploy.
- If `/api/listen` returns `DATABASE_SCHEMA_MISSING` or `relation "listening_sessions" does not exist`, run migrations against production DB:
  - From repo root: `npm.cmd --prefix APPS/saywetin run db:push`
  - Or in Railway shell (SayWetin service): `npm run db:push`
- If `api.saywetin.app` is not yet attachable due Railway plan limits, only use temporary single-host fallback when Railway is also serving the live web host:
  - `DEPLOY_ROLE=fullstack`
  - `PUBLIC_BASE_URL=https://saywetin.app`
  - `VITE_API_BASE_URL=https://saywetin.app`
  - Then switch back to `DEPLOY_ROLE=api` and `https://api.saywetin.app` after domain cutover.

## Dockerfiles

- SayWetin API: Dockerfile deploy is required (`APPS/saywetin/Dockerfile` with root directory `APPS/saywetin`).
- PeacePad API: script-based Railway deploy remains valid (`npm install --legacy-peer-deps`, `npm run build:api`, `npm run start`).

## Domain ownership rule (critical)

- Railway custom domain for PeacePad API: `api.peacepad.ca` only.
- `peacepad.ca` and `www.peacepad.ca` must remain on Cloudflare Pages.
- Railway custom domain for Saywetin API: `api.saywetin.app` only (split-host model).
- `saywetin.app` and `www.saywetin.app` must remain on Cloudflare Pages in the split-host model.
