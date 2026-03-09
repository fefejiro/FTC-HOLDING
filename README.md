# FTC HOLDING Monorepo

Canonical repository root: `C:\FTC HOLDING`

This repo contains multiple apps plus shared packages. Use this as the top-level orientation doc.

## Current Structure

- `APPS/`
  - `ftc-site` (Next.js marketing/site shell)
  - `peacepad` (Vite frontend + Node API + Capacitor mobile shell)
  - `saywetin` (Vite frontend + Node API + Capacitor mobile shell)
  - `ATEAM` (local-first AI app under active ownership decision)
- `PACKAGES/`
  - `auth`, `config`, `logger`, `supabase`, `types`
- `DOCS/`
  - operational and deployment docs
- `workers/peacepadai`
  - Cloudflare Worker project

## Deployment Reality (Current)

1. PeacePad
- Frontend production owner: Cloudflare Pages (`https://peacepad.ca`, `https://www.peacepad.ca`)
- Backend production owner: Railway (`https://api.peacepad.ca`)
- Primary checks:
  - `npm --prefix APPS/peacepad run verify:deployment-ownership`
  - `npm run verify:peacepad:prod`
  - `npm --prefix APPS/peacepad run smoke:guest-auth`

2. ftc-site
- Deployed separately (Cloudflare Pages flow) from `APPS/ftc-site`.

3. SayWetin
- Frontend and API are separate deployment surfaces.
- Use `npm --prefix APPS/saywetin run verify:frontend-build` before frontend cutover.
- Runtime/domain notes: `DOCS/SAYWETIN_HANDOVER.md`

4. ATEAM
- Not in current root deployment pipeline.
- Treated as local/analysis track until ownership/tracking decision is finalized.

## Local Build/Test Commands

Run from `C:\FTC HOLDING`:

```powershell
# repo hygiene
npm run audit:secrets

# peacepad
npm --prefix APPS/peacepad run build
npm --prefix APPS/peacepad run smoke:e2e:update-lifecycle

# ftc-site
npm --prefix APPS/ftc-site run build

# saywetin
npm --prefix APPS/saywetin run verify:frontend-build
npm --prefix APPS/saywetin run check

# ateam backend
npm --prefix APPS/ATEAM/Server run test:backend
```

## Known Risks / Open Decisions

1. `APPS/ATEAM` currently appears untracked from root git history.
2. A nested duplicate tree exists at `C:\FTC HOLDING\FTC-HOLDING` (not canonical root).
3. Cross-app documentation drift can happen quickly; keep `DOCS` and app-local docs aligned.

See:
- [REPO_HANDOVER_AUDIT_2026-03-07.md](DOCS/REPO_HANDOVER_AUDIT_2026-03-07.md)
- [REPO_OWNERSHIP_AND_TRACKING.md](DOCS/REPO_OWNERSHIP_AND_TRACKING.md)
- [START_HERE.md](START_HERE.md)
