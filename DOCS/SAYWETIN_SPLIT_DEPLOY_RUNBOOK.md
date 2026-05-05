# SayWetin Split Deploy Runbook (PeacePad-Style)

This runbook enforces:
- Frontend on Cloudflare Pages (`saywetin.app`, `www.saywetin.app`)
- API on Railway (`api.saywetin.app`)

## 1) Railway API Service (sunny-acceptance)

Set in Railway service settings:
- Root Directory: `APPS/saywetin`
- Builder: `Dockerfile`
- Dockerfile Path: `Dockerfile`
- Build Command: empty
- Start Command: empty

Required runtime vars:
- `NODE_ENV=production`
- `DEPLOY_ROLE=api`
- `PUBLIC_BASE_URL=https://api.saywetin.app`
- `DATABASE_URL=<supabase pooler uri>`
- `SESSION_SECRET=<secret>`
- `VITE_API_BASE_URL=https://api.saywetin.app`
- `OPENAI_API_KEY=<key>`
- `ACRCLOUD_HOST=<host>`
- `ACRCLOUD_ACCESS_KEY=<key>`
- `ACRCLOUD_ACCESS_SECRET=<secret>`

Important AI env note:
- If Railway is using `OPENAI_API_KEY`, do not leave a stale `AI_INTEGRATIONS_OPENAI_BASE_URL` set from older Replit-style deployments.
- Use `AI_INTEGRATIONS_OPENAI_BASE_URL` only when Railway is also using `AI_INTEGRATIONS_OPENAI_API_KEY`.

## 2) Cloudflare Pages Frontend (saywetin-pages)

Set in Pages build settings:
- Root directory: `APPS/saywetin`
- Install command: `npm ci`
- Build command: `npm run build:frontend`
- Build output directory: `dist/public`

Set Pages env var:
- `VITE_API_BASE_URL=https://api.saywetin.app`

Required Pages routing file:
- `APPS/saywetin/client/public/_redirects`
- Content: `/* /index.html 200`

Attach frontend custom domains to Pages:
- `saywetin.app`
- `www.saywetin.app`
- Add a Cloudflare redirect rule so `www.saywetin.app/*` -> `https://saywetin.app/$1`

## 3) DNS Ownership

Expected ownership:
- `saywetin.app` / `www.saywetin.app` -> Cloudflare Pages
- `api.saywetin.app` -> Railway API origin

If Railway custom-domain limit blocks `api.saywetin.app`:
- Temporary fallback:
  - Keep API healthy on Railway.
  - Move the live web host back to Railway intentionally.
  - Set `DEPLOY_ROLE=fullstack`
  - Set `PUBLIC_BASE_URL=https://saywetin.app`
  - Set frontend `VITE_API_BASE_URL=https://saywetin.app`.
  - Switch back to `https://api.saywetin.app` after domain is available.

## 4) Verification

Run:

```powershell
nslookup saywetin.app
nslookup www.saywetin.app
nslookup api.saywetin.app
curl.exe -i https://www.saywetin.app/
curl.exe -s https://api.saywetin.app/health
curl.exe -s https://api.saywetin.app/api/status
```

Expected:
- DNS resolves for all three hosts.
- `www.saywetin.app` redirects to `https://saywetin.app/`.
- API endpoints return healthy JSON.
