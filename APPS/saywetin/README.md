# SayWetin (Current Local State)

This folder is the current source of truth for SayWetin.

## What It Is
- Type: Full-stack TypeScript app (single runtime)
- Frontend: React + Vite (`client`)
- Backend: Express (`server`)
- Mobile wrapper: Capacitor Android (`android`)
- DB layer: Drizzle ORM + PostgreSQL

## Entrypoints
- Frontend entry: `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx`
- Backend entry: `server/index.ts`
- Build script: `script/build.ts`

## Build/Run
- Dev: `npm run dev`
- Frontend-only gate: `npm run verify:frontend-build`
- Build: `npm run build`
- Start (prod): `npm run start`
- Typecheck: `npm run check`

## Deployment Gates
1. `npm run verify:frontend-build` must pass before Cloudflare Pages setup.
2. `powershell -ExecutionPolicy Bypass -File ..\\..\\scripts\\verify-saywetin-prod.ps1` must pass before production cutover.

## Environment Variables (names only)
Server/runtime:
- `DATABASE_URL`
- `SESSION_SECRET`
- `PORT`
- `NODE_ENV`
- `REPL_ID`
- `ISSUER_URL`
- `OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `ACRCLOUD_HOST`
- `ACRCLOUD_ACCESS_KEY`
- `ACRCLOUD_ACCESS_SECRET`
- `GENIUS_API_KEY`

Frontend:
- `VITE_API_BASE_URL`

## Current Replit Coupling (to migrate off)
- `.replit`
- `replit.md`
- `server/replit_integrations/*`
- Replit OIDC env assumptions (`REPL_ID`, `ISSUER_URL`)
- Replit Vite plugins in `vite.config.ts`
- `__replit_health` endpoint

## Capacitor Config Authority
- Authoritative source: `capacitor.config.ts`
- `capacitor.config.json` must stay aligned for tooling that reads JSON directly.

## Known Integration Blockers
- This folder is a nested git repo (`APPS/saywetin/.git`).
- Parent repo currently ignores this path (`C:\FTC HOLDING\.gitignore` has `APPS/saywetin/`).
- Result: SayWetin is not tracked as a normal workspace package in the parent repo yet.

## Migration Readiness Report
See: `docs/MIGRATION_READINESS.md`
