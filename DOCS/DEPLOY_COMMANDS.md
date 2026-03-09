# Deploy Commands

## Package Layout Detection (current checkout)

- `APPS/peacepad/package.json`: present
- `APPS/peacepad/server/package.json`: missing
- `APPS/peacepad/client/package.json`: missing
- `APPS/saywetin/package.json`: present

Commands in this repository run from app roots (`APPS/peacepad`, `APPS/ftc-site`, `APPS/saywetin`).

## PeacePad API (Railway)

- Root directory: `APPS/peacepad`
- Install: `npm install --legacy-peer-deps`
- Build: `npm run build`
- Start: `npm run start`
- Deploy trigger: GitHub `main` -> Railway

## PeacePad Frontend (Cloudflare Pages)

- Root directory: `APPS/peacepad`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm exec vite build`
- Output directory: `dist/public`
- Deploy trigger: GitHub `main` -> Cloudflare Pages

## SayWetin API (Railway)

- Gate 1 (must pass before Pages setup): `npm --workspace=@ftc/saywetin run verify:frontend-build`
- Root directory: `APPS/saywetin`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Build command: empty
- Start command: empty
- Production verify: `powershell -ExecutionPolicy Bypass -File scripts/verify-saywetin-prod.ps1`

## SayWetin Frontend (Cloudflare Pages or bundled web)

- Root directory: `APPS/saywetin`
- Install command: `npm ci`
- Build command: `npm run build:frontend`
- Output directory: `dist/public`
