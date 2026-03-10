# SayWetin Migration Readiness Report

Date: 2026-03-10
Scope: `APPS/saywetin` only

Update:
- Production target is now fixed to PeacePad-style split hosting.
- Frontend owner: Cloudflare Pages on `saywetin.app` / `www.saywetin.app`
- API owner: Railway on `api.saywetin.app`
- Single-host Railway serving is now a temporary fallback only, not the default contract.

## 1) Inventory Summary

### App type
- Full-stack monorepo workspace package (`@ftc/saywetin`) whose codebase can run in either:
  - split-host mode: Cloudflare Pages frontend + Railway API
  - temporary fallback mode: single Railway runtime serving API + SPA

### Framework/runtime
- Frontend: React 18 + Vite + Wouter + TanStack Query.
- Backend: Express + TypeScript + Drizzle ORM + PostgreSQL (`pg`).
- Mobile: Capacitor Android project included.

### Frontend entrypoints
- `client/index.html`
- `client/src/main.tsx`
- `client/src/App.tsx`

### Backend/server logic
- Main server bootstrap: `server/index.ts`
- API routes: `server/routes.ts`
- Auth routes: `server/replit_integrations/auth/*`
- Static serving: `server/static.ts`
- Health routes present: `/health`, `/api/health`

### Build system
- `npm run build` -> `tsx script/build.ts`
- Vite builds client to `dist/public`
- esbuild bundles backend to `dist/index.cjs`

### Package manager
- npm (workspace package under parent monorepo)

### Assets/media folders
- Public static assets: `client/public`
- Large local media/dev artifacts: `attached_assets`
- Android resources: `android/app/src/main/res`

### Config files
- `vite.config.ts`
- `drizzle.config.ts`
- `tailwind.config.ts`, `postcss.config.js`
- `tsconfig.json`
- `capacitor.config.ts` and `capacitor.config.json`
- `.env.production.example`, `.env.local` (ignored)

### Environment variable expectations
From code usage:
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
- `VITE_API_BASE_URL` (frontend)

### Replit-specific files/dependencies
- `.replit`, `replit.md`
- `server/replit_integrations/*`
- Replit OIDC in auth integration (`ISSUER_URL`, `REPL_ID`)
- Replit Vite plugins (`@replit/vite-plugin-*`)
- `__replit_health` route
- Historical migration remnants still being phased out of auth/runtime assumptions

## 2) What SayWetin Needs for Current Stack

## Cloudflare (frontend hosting)
Required:
- Build static client from this app (`dist/public`).
- Keep SPA fallback (`_redirects` with `/* /index.html 200`) for client routes.
- Set frontend env `VITE_API_BASE_URL` to API origin.
- Keep `www.saywetin.app` -> `saywetin.app` as a Cloudflare redirect rule, not as a Pages `_redirects` rule.

## Railway (API/runtime)
Required:
- Deploy Node server (`server/index.ts` built to `dist/index.cjs`).
- Start command should rely on `PORT` env automatically.
- Set required env vars listed above.
- Ensure Postgres `DATABASE_URL` is reachable.
- Run production with API-only role for split-host deploys (`DEPLOY_ROLE=api`, `PUBLIC_BASE_URL=https://api.saywetin.app`).

## Supabase
Current role:
- Code uses generic Postgres (`drizzle` + `pg`), not Supabase SDK.

Needed:
- Supabase can be used as managed Postgres provider by setting `DATABASE_URL`.
- If product later needs Supabase Auth/storage features, those are new integrations (not currently wired).

## Optional Cloudflare R2 (media/audio)
- Not currently required by existing pipeline.
- Consider only if long-term media retention/export/object storage is needed.
- Current audio flow uses upload to API and external recognition; no object storage persistence path exists.

## 3) High-Level Comparison vs PeacePad

### What can be reused
- Infra pattern: Cloudflare for UI + Railway for API + managed Postgres.
- Health endpoint and PORT-based start expectations.
- Production verification script pattern (PowerShell checks).
- Deployment docs structure and environment-variable discipline.

### What should stay product-specific
- SayWetin audio recognition + lyrics + cultural analysis pipeline.
- Song/lyrics/translations/favorites schema and business endpoints.
- SayWetin mobile config and brand/content behavior.

### What should not be duplicated
- Replit OIDC/session assumptions in production architecture.
- Replit-only Vite plugins and Janeway URL coupling.
- Hardcoded cross-product CORS origins unrelated to SayWetin.

## 4) Current State, Risks, Blockers, Missing Assumptions

### Current state
- Application is functional as a full-stack TS app.
- Build pipeline and static serving exist.
- Split-host frontend/API contract is now the intended production path.
- Railway runtime now supports API-only mode for the API host.
- Android project exists.
- Health endpoints exist.

### Risks
- Auth depends on Replit OIDC components.
- DNS/domain ownership can still drift if Cloudflare Pages and Railway custom domains are attached inconsistently.
- Replit-specific config can cause migration confusion.
- Large `attached_assets` may increase repo noise if imported unchanged.

### Blockers (repo integration)
- No repo-integration blocker remains. `APPS/saywetin` is now tracked in the parent monorepo normally.
- Remaining blockers are operational only: DNS ownership, Cloudflare Pages custom domains, and Railway API custom-domain attachment.

### Missing files/assumptions
- No app-level README describing migration state (added in this pass).
- No dedicated migration readiness document (added in this pass).
- Unclear final auth target (Supabase auth, custom auth, or other) is not yet decided.

## 5) Recommended Target Structure (non-destructive plan)

Inside `APPS/saywetin` keep:
- `client/` (frontend)
- `server/` (API)
- `shared/` (schema/types)
- `android/` (mobile wrapper)
- `docs/` (migration and ops notes)

Add/maintain docs:
- `README.md` (current state + env + blockers)
- `docs/MIGRATION_READINESS.md` (this report)

Repo integration changes already completed:
- Nested git metadata removed from `APPS/saywetin`
- Parent ignore rule removed so `APPS/saywetin` is tracked normally

## 6) Recommended Deployment Model

Chosen model (PeacePad-aligned):
- UI: Cloudflare Pages (static client build output)
- API: Railway service (Express runtime)
- DB: Supabase Postgres via `DATABASE_URL`
- Optional R2 only if/when object storage is required

Temporary fallback only:
- Single Railway service serves both API and built SPA
- Use only if API custom-domain attachment is blocked and the live web host is intentionally moved back to Railway

## 7) Minimal Safe Improvements Applied in This Pass
- Added `README.md` at app root for current-state clarity.
- Added this readiness report in `docs/MIGRATION_READINESS.md`.
- Added split-host API base resolution for web/native clients.
- Added PeacePad-style update/cache safeguards and canonical-host refresh behavior.
- Added API-only Railway deployment mode for split-host production.
- Normalized Pages SPA fallback to match PeacePad.
