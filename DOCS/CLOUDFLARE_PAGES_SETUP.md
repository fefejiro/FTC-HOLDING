# Cloudflare Pages Setup

Use one Pages project per frontend.

## PeacePad Frontend (in-repo)

- Project name: `ftc-holding`
- Build root: repository root
- Install command: `npm ci`
- Build command: `npm --prefix APPS/peacepad run build:frontend`
- Build output directory: `APPS/peacepad/dist/public`
- Environment variable:
  - `VITE_API_BASE_URL=https://api.peacepad.ca`

Custom domains:
- `peacepad.ca`
- `www.peacepad.ca`

## SayWetin Frontend

- Default production ownership model: PeacePad-style split hosting.
  - Frontend: Cloudflare Pages (`saywetin.app`)
  - API: Railway (`api.saywetin.app`)
- Frontend gate (run before Pages setup): `npm --workspace=@ftc/saywetin run verify:frontend-build`
  - Must generate `APPS/saywetin/dist/public/index.html`
  - Must generate `APPS/saywetin/dist/public/assets/*`
- Project name: `saywetin-pages`
- Build root: repository root
- Install command: `npm ci`
- Build command: `npm --prefix APPS/saywetin run build:frontend`
- Build output directory: `APPS/saywetin/dist/public`
- Environment variable:
  - `VITE_API_BASE_URL=https://api.saywetin.app`
  - Temporary single-host fallback only when Railway intentionally owns the live web host: `VITE_API_BASE_URL=https://saywetin.app`
- SPA fallback file required:
  - `APPS/saywetin/client/public/_redirects`
  - Content: `/* /index.html 200`
- Do not use `_redirects` for `www` -> apex host canonicalization.
  - Configure `www.saywetin.app` -> `saywetin.app` in Cloudflare with a redirect rule.

Custom domains:

- `saywetin.app`
- `www.saywetin.app`
