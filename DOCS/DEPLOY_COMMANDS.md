# Deploy Commands

## Package Layout Detection

- `APPS/peacepad/package.json`: present
- `APPS/peacepad/server/package.json`: missing
- `APPS/peacepad/client/package.json`: missing
- `APPS/saywetin/package.json`: present
- `APPS/saywetin/server/package.json`: missing
- `APPS/saywetin/client/package.json`: missing

Commands therefore run from app roots (`APPS/peacepad`, `APPS/saywetin`).

## PeacePad API (Railway)

- Root directory: `APPS/peacepad`
- Install: `npm install --legacy-peer-deps`
- Build: `npm run build`
- Start: `npm run start`
- Deploy trigger: GitHub `main` -> Railway

## SayWetin API (Railway)

- Root directory: `APPS/saywetin`
- Install: `npm install`
- Build: `npm run build`
- Start: `npm run start`
- Production verify: `powershell -ExecutionPolicy Bypass -File scripts/verify-saywetin-prod.ps1`

## PeacePad Frontend (Cloudflare Pages)

- Root directory: `APPS/peacepad`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm exec vite build`
- Output directory: `dist/public`
- Deploy trigger: GitHub `main` -> Cloudflare Pages

## SayWetin Frontend (Cloudflare Pages)

- Gate 1 (must pass before Pages setup): `npm --workspace=@ftc/saywetin run verify:frontend-build`
- Root directory: `APPS/saywetin`
- Install command: `npm install`
- Build command: `npm exec vite build`
- Output directory: `dist/public`
