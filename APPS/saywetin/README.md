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

## Railway Docker Deployment (Strict)
- Railway root directory: `APPS/saywetin`
- Dockerfile path: `Dockerfile` (relative to the configured root directory)
- Docker build context: `APPS/saywetin`
- `.dockerignore` path: `APPS/saywetin/.dockerignore`
- Lockfile path: `APPS/saywetin/package-lock.json` and it must be committed.

Required Railway settings when Dockerfile is active:
1. Builder: Dockerfile
2. Build command: empty
3. Start command: empty

Non-Docker fallback commands (documentation only):
- Build: `npm run build:prod`
- Start: `npm run start`

## Deployment Gates
1. `npm run verify:frontend-build` must pass before Cloudflare Pages setup.
2. `powershell -ExecutionPolicy Bypass -File ..\\..\\scripts\\verify-saywetin-prod.ps1` must pass before production cutover.

## Environment Variables (names only)
Server/runtime:
- `DATABASE_URL`
- `SESSION_SECRET`
- `PORT`
- `NODE_ENV`
- `OIDC_CLIENT_ID` (optional; falls back to `REPL_ID`)
- `OIDC_ISSUER_URL` (optional; falls back to `ISSUER_URL` then Replit default)
- `REPL_ID` (legacy optional)
- `ISSUER_URL` (legacy optional)
- `SUPABASE_URL` (required only when using `/api/auth/supabase/exchange`)
- `SUPABASE_ANON_KEY` (optional for `/api/auth/supabase/exchange`)
- `OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `ACRCLOUD_HOST`
- `ACRCLOUD_ACCESS_KEY`
- `ACRCLOUD_ACCESS_SECRET`
- `GENIUS_API_KEY`

Frontend:
- `VITE_API_BASE_URL`
  - Recommended for current production routing: `https://saywetin.app` (same-origin web API calls)

## Verification Checklist
Local/source verification:
1. `npm ci`
2. `npm run build`
3. `node --check dist/index.cjs`
4. `npm run start`

Container verification:
1. `docker build -t saywetin .`
2. `docker run -e DATABASE_URL=... -e SESSION_SECRET=... -e PORT=8080 -p 8080:8080 saywetin`
3. `curl -i http://localhost:8080/health`

Post-deploy verification:
1. `curl -i https://<railway-service-domain>/health` returns `200`
2. Browser upload to `/api/listen` from `saywetin.app` succeeds without `Failed to fetch`

## Current Replit Coupling (to migrate off)
- `.replit`
- `replit.md`
- `server/replit_integrations/*`
- Replit OIDC integration (now optional; app boots without `REPL_ID`/`ISSUER_URL`)
- Replit Vite plugins in `vite.config.ts`
- `__replit_health` endpoint

## Capacitor Config Authority
- Authoritative source: `capacitor.config.ts`
- `capacitor.config.json` must stay aligned for tooling that reads JSON directly.

## Known Integration Blockers
- Railway root directory and Dockerfile path must match exactly:
  - Root directory: `APPS/saywetin`
  - Dockerfile path: `Dockerfile`
- `api.saywetin.app` must have healthy DNS/origin if used as a separate API host.
- If API and frontend share `saywetin.app`, keep frontend API base on same-origin.

## Migration Readiness Report
See: `docs/MIGRATION_READINESS.md`
