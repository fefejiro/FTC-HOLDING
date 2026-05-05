# Migration TODO (Non-Destructive)

## Repo integration
- [x] Remove nested git metadata from `APPS/saywetin` after backup/confirmation.
- [x] Remove parent ignore rule for `APPS/saywetin/` so files are trackable.
- [x] Commit SayWetin as a normal monorepo workspace app.

## Auth migration
- [x] Decide target auth system (Supabase Auth or alternative).
  - **Decision**: Supabase Auth. The existing stack already uses Supabase (database, storage).
    Server-side sessions are backed by PostgreSQL via `connect-pg-simple`. Mobile/web clients
    obtain a Supabase access token and exchange it via `POST /api/auth/supabase/exchange` for a
    cookie session. Optional OIDC (generic, not Replit-specific) can be enabled via
    `OIDC_CLIENT_ID` + `OIDC_ISSUER_URL` env vars when needed.
- [x] Replace `server/replit_integrations/auth/*` dependency path.
  - Auth modules moved to `server/auth/` (supabaseAuth.ts, routes.ts, storage.ts, index.ts).
    `server/auth.ts` re-exports from `./auth` — no more `replit_integrations` path in the import chain.
- [x] Update login/callback/logout endpoints accordingly.
  - Endpoints unchanged in behaviour; no Replit-specific OIDC issuer is hard-coded. Supabase
    token exchange available at `POST /api/auth/supabase/exchange`.

## Infra alignment
- [x] Decide split deployment model (Cloudflare Pages UI + Railway API) as the default production contract.
- [x] Add SPA fallback `_redirects` for client routes.
- [x] Set production `VITE_API_BASE_URL` to API origin.
- [x] Add API-only Railway deployment mode for split-host production.

## Config cleanup
- [x] Remove Replit-only Vite plugins if no longer needed.
  - Audited `vite.config.ts`: only `@vitejs/plugin-react` is used. No Replit-specific plugins
    (`@replit/vite-plugin-*`) present. Nothing to remove.
- [x] Remove Replit Janeway URL from `capacitor.config.json`.
- [x] Trim CORS allowlist to SayWetin domains + local dev origins.

## Validation
- [x] Build check: `npm run build`
- [x] Runtime check: `npm run start` with `PORT`
  - Server reads `process.env.PORT` (defaults to 5000) and binds on `0.0.0.0:PORT`.
- [x] Health checks: `/health`, `/api/health`
  - Both routes registered in `server/index.ts` before any middleware and return
    `{ "status": "ok" }` with HTTP 200. `/__health` also available as a lightweight alias.
