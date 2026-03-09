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
- `DATABASE_SSL_NO_VERIFY` (optional, set `true` only if database TLS chain validation fails in runtime)
- `SESSION_SECRET`
- `PORT`
- `NODE_ENV`
- `OIDC_CLIENT_ID` (optional)
- `OIDC_ISSUER_URL` (optional)
- `SUPABASE_URL` (required only when using `/api/auth/supabase/exchange`)
- `SUPABASE_ANON_KEY` (optional for `/api/auth/supabase/exchange`)
- `OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `ACRCLOUD_HOST`
- `ACRCLOUD_ACCESS_KEY`
- `ACRCLOUD_ACCESS_SECRET`
- `ACRCLOUD_MIN_SCORE` (optional, default `55`; higher = stricter recognition)
- `ACRCLOUD_ALLOW_HUMMING_FALLBACK` (optional, default `false`)
- `ACRCLOUD_MIN_HUMMING_SCORE` (optional, default `75`)
- `GENIUS_API_KEY` (optional; improves lyrics source coverage)

Frontend:
- `VITE_API_BASE_URL`
  - Recommended for current production routing: `https://saywetin.app` (same-origin web API calls)

## Production Database URL Note (Supabase + Railway)
- Use the Supabase pooler URI shown in your project dashboard (`Connect` -> connection string) for `DATABASE_URL`, with `sslmode=require`.
- The username must include the project ref (example: `postgres.<project-ref>`), not just `postgres`.
- If `/api/listen` returns `DATABASE_CREDENTIAL_INVALID` or mentions `Tenant or user not found`, regenerate the DB password in Supabase and update Railway `DATABASE_URL`.

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

## Auth Mode (Current)
- Guest mode works without OIDC settings.
- OIDC login is optional and enabled only when both `OIDC_CLIENT_ID` and `OIDC_ISSUER_URL` are set.
- `/api/listen` does not require login.

## Capacitor Config Authority
- Authoritative source: `capacitor.config.ts`
- `capacitor.config.json` must stay aligned for tooling that reads JSON directly.
- For Android release builds, run `Set-Item Env:CAPACITOR_ENV production` before `npx cap sync android`, then verify generated `android/app/src/main/assets/capacitor.config.json` contains `"url": "https://saywetin.app"`.

## Known Integration Blockers
- Railway root directory and Dockerfile path must match exactly:
  - Root directory: `APPS/saywetin`
  - Dockerfile path: `Dockerfile`
- `api.saywetin.app` must have healthy DNS/origin if used as a separate API host.
- If API and frontend share `saywetin.app`, keep frontend API base on same-origin.

## Migration Readiness Report
See: `docs/MIGRATION_READINESS.md`
