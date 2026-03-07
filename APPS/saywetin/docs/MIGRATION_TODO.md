# Migration TODO (Non-Destructive)

## Repo integration
- [ ] Remove nested git metadata from `APPS/saywetin` after backup/confirmation.
- [ ] Remove parent ignore rule for `APPS/saywetin/` so files are trackable.
- [ ] Commit SayWetin as a normal monorepo workspace app.

## Auth migration
- [ ] Decide target auth system (Supabase Auth or alternative).
- [ ] Replace `server/replit_integrations/auth/*` dependency path.
- [ ] Update login/callback/logout endpoints accordingly.

## Infra alignment
- [ ] Decide split deployment model (Cloudflare UI + Railway API) vs single Railway runtime.
- [ ] If split, add SPA fallback `_redirects` for client routes.
- [ ] Set production `VITE_API_BASE_URL` to API origin.

## Config cleanup
- [ ] Remove Replit-only Vite plugins if no longer needed.
- [ ] Remove Replit Janeway URL from `capacitor.config.json`.
- [ ] Trim CORS allowlist to SayWetin domains + local dev origins.

## Validation
- [ ] Build check: `npm run build`
- [ ] Runtime check: `npm run start` with `PORT`
- [ ] Health checks: `/health`, `/api/health`
