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

## SayWetin API (Railway)

- Root directory: `APPS/saywetin`
- Install: `npm install`
- Build: `npm run build`
- Start: `npm run start`

## PeacePad Frontend (Cloudflare Pages)

- Root directory: `APPS/peacepad`
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm exec vite build`
- Output directory: `dist/public`

## SayWetin Frontend (Cloudflare Pages)

- Root directory: `APPS/saywetin`
- Install command: `npm install`
- Build command: `npm exec vite build`
- Output directory: `dist/public`
