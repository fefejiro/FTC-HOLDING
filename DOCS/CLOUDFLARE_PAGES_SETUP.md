# Cloudflare Pages Setup

Use one Pages project per frontend.

## PeacePad Frontend

- Project root directory: `APPS/peacepad`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm exec vite build`
- Build output directory: `dist/public`
- Environment variable:
  - `VITE_API_BASE_URL=https://api.peacepad.ca`

Custom domains:

- `peacepad.ca`
- `www.peacepad.ca`

## SayWetin Frontend

- Frontend gate (run before Pages setup): `npm --workspace=@ftc/saywetin run verify:frontend-build`
  - Must generate `APPS/saywetin/dist/public/index.html`
  - Must generate `APPS/saywetin/dist/public/assets/*`
- Project root directory: `APPS/saywetin`
- Install command: `npm install`
- Build command: `npm exec vite build`
- Build output directory: `dist/public`
- Environment variable:
  - `VITE_API_BASE_URL=https://api.saywetin.app`
- SPA fallback file required:
  - `APPS/saywetin/client/public/_redirects`
  - Content: `/* /index.html 200`

Custom domains:

- `saywetin.app`
- `www.saywetin.app`
