# PeacePad Railway API Setup (Option A API Host)

This setup makes Railway host only the API at `api.peacepad.ca`.  
`peacepad.ca` and `www.peacepad.ca` must stay on Cloudflare Pages.

## Railway Dashboard Click Path
1. Railway dashboard -> `New Project` -> `Deploy from GitHub repo`.
2. Select repo `FTC-HOLDING`.
3. Open the created service -> `Settings`.

## Service Settings (Copy/Paste)
- Root Directory: repository root
- Install Command: `npm ci`
- Build Command: `npm --workspace=@ftc/peacepad run build`
- Start Command: `npm --workspace=@ftc/peacepad run start`

Start command must not include `-p`. The app already reads `process.env.PORT` in `server/index.ts`.

Railway `PORT` UI field expects a numeric port (or default behavior), not `$PORT`.

## Networking / Health
- Health check path: `/health`
- Additional check path: `/api/health`

## Environment Variables (No Secrets in Git)
Required:
- `NODE_ENV=production`
- `SESSION_SECRET=<set in Railway>`
- `SUPABASE_URL=<set in Railway>`
- `SUPABASE_ANON_KEY=<set in Railway>`
- `DATABASE_URL=<set in Railway>`

If OIDC routes are enabled, also set:
- `PUBLIC_BASE_URL=<https://api.peacepad.ca>`
- `APP_ORIGINS=<comma-separated app origins>`
- `CORS_ALLOWED_ORIGINS=<comma-separated browser origins>`
- `OIDC_CLIENT_ID=<set in Railway>`
- `OIDC_ISSUER_URL=https://replit.com/oidc` (or your configured issuer)

Optional by feature:
- `OPENAI_API_KEY`
- `MAILJET_API_KEY`
- `MAILJET_SECRET_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`
- `CUSTOM_DOMAINS`

## CORS Targets Required by Option A
The API must allow:
- `https://peacepad.ca`
- `https://www.peacepad.ca`
- local dev origins (`http://localhost`, `http://127.0.0.1`, `http://localhost:5173`, `http://127.0.0.1:5173`)

Current `APPS/peacepad/server/index.ts` production CORS list already includes these.

## Domain Mapping Rule (Critical)
- Railway custom domain for this service: `api.peacepad.ca` only.
- Do not attach `peacepad.ca` or `www.peacepad.ca` to Railway in Option A.
- Do not authorize Railway DNS changes for the apex domain in Option A.

If Railway custom domain limit is hit:
1. Railway service -> `Settings` -> `Domains`.
2. Delete `peacepad.ca` and `www.peacepad.ca` entries if present.
3. Keep only `api.peacepad.ca`.

## DNS Record for API
Create/confirm this DNS record in Cloudflare DNS:

- Type: `CNAME`
- Name: `api`
- Target: `use the value shown in Railway domain UI`
- Proxy status: `Proxied` (recommended) or `DNS only` during validation

## Verification
Run from repo root:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-peacepad-prod.ps1
```

Expected API checks:
- `https://api.peacepad.ca/health` returns `200`
- `https://api.peacepad.ca/api/health` returns `200`
