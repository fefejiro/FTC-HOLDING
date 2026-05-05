# Deploy Commands

## Package Layout Detection (current checkout)

- `APPS/peacepad/package.json`: present
- `APPS/peacepad/server/package.json`: missing
- `APPS/peacepad/client/package.json`: missing
- `APPS/saywetin/package.json`: present

Commands in this repository run from app roots (`APPS/peacepad`, `APPS/ftc-site`, `APPS/saywetin`).

## PeacePad API (Railway)

- Root directory: repository root or `APPS/peacepad`
- Install: `npm install --legacy-peer-deps` (if rooted at `APPS/peacepad`) or `npm ci` (if rooted at repo)
- Build: `npm run build:api` (or `npm --workspace=@ftc/peacepad run build:api` from repo root)
- Start: `npm run start`
- Deploy trigger: GitHub `main` -> Railway

## PeacePad Frontend (Cloudflare Pages)

- Build root: repository root
- Install command: `npm ci`
- Build command: `npm --prefix APPS/peacepad run build:frontend`
- Output directory: `APPS/peacepad/dist/public`
- Deploy trigger: GitHub `main` -> Cloudflare Pages

## SayWetin API (Railway)

- Root directory: `APPS/saywetin`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Build command: empty
- Start command: empty
- Runtime role: `DEPLOY_ROLE=api`
- Public base URL: `PUBLIC_BASE_URL=https://api.saywetin.app`
- Live API domain target: `api.saywetin.app`
- Deploy trigger: GitHub `main` -> Railway
- Production verify: `powershell -ExecutionPolicy Bypass -File scripts/verify-saywetin-prod.ps1` (must pass `acrcloud.configured`, `openai.configured`, and `database.connected`)

## SayWetin Frontend (Cloudflare Pages)

- Gate 1 (must pass before Pages setup): `npm --workspace=@ftc/saywetin run verify:frontend-build`
- Build root: repository root
- Install command: `npm ci`
- Build command: `npm --prefix APPS/saywetin run build:frontend`
- Output directory: `APPS/saywetin/dist/public`
- Env var: `VITE_API_BASE_URL=https://api.saywetin.app`
- Live frontend domains: `saywetin.app`, `www.saywetin.app`
- Deploy trigger: GitHub `main` -> Cloudflare Pages
- Required routing file: `APPS/saywetin/client/public/_redirects` with `/* /index.html 200`
- Canonical host redirect: configure `www.saywetin.app` -> `saywetin.app` in Cloudflare, not in `_redirects`

Fallback only if API domain is blocked and Railway is temporarily serving the live web host:
- Set `DEPLOY_ROLE=fullstack`
- Set `PUBLIC_BASE_URL=https://saywetin.app`
- Set `VITE_API_BASE_URL=https://saywetin.app`

Detailed operator runbook:
- `DOCS/SAYWETIN_SPLIT_DEPLOY_RUNBOOK.md`
