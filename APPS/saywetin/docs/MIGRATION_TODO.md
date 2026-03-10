# Migration TODO (Non-Destructive)

## Repo integration
- [x] Remove nested git metadata from `APPS/saywetin` after backup/confirmation.
- [x] Remove parent ignore rule for `APPS/saywetin/` so files are trackable.
- [x] Commit SayWetin as a normal monorepo workspace app.

## Auth migration
- [ ] Decide target auth system (Supabase Auth or alternative).
- [ ] Replace `server/replit_integrations/auth/*` dependency path.
- [ ] Update login/callback/logout endpoints accordingly.

## Infra alignment
- [x] Decide split deployment model (Cloudflare Pages UI + Railway API) as the default production contract.
- [x] Add SPA fallback `_redirects` for client routes.
- [x] Set production `VITE_API_BASE_URL` to API origin.
- [x] Add API-only Railway deployment mode for split-host production.

## Config cleanup
- [ ] Remove Replit-only Vite plugins if no longer needed.
- [x] Remove Replit Janeway URL from `capacitor.config.json`.
- [x] Trim CORS allowlist to SayWetin domains + local dev origins.

## Validation
- [x] Build check: `npm run build`
- [ ] Runtime check: `npm run start` with `PORT`
- [ ] Health checks: `/health`, `/api/health`
