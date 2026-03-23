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
- Frontend Pages build root: repository root -> `npm --prefix APPS/peacepad run build:frontend`
- Backend Railway build root: `APPS/peacepad` -> `npm run build:api`
- Primary checks:
  - `npm --prefix APPS/peacepad run verify:deployment-ownership`
  - `npm run verify:peacepad:prod`
  - `npm --prefix APPS/peacepad run smoke:guest-auth`

2. ftc-site
- Frontend production owner: Cloudflare Pages (`https://unalabs.cloud`)
- Pages build root: repository root -> `npm --prefix APPS/ftc-site run build && cd APPS/ftc-site && npx @cloudflare/next-on-pages@1`

3. SayWetin
- Frontend and API are separate deployment surfaces.
- Frontend Pages build root: repository root -> `npm --prefix APPS/saywetin run build:frontend`
- Backend Railway root: `APPS/saywetin` -> Dockerfile runtime
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

## Strategic Architecture Docs

- [Docs Index](DOCS/INDEX.md)
- [Unalabs Ecosystem Map](DOCS/UNALABS_ECOSYSTEM_MAP.md)
- [Repo Structure Recommendation](DOCS/REPO_STRUCTURE_RECOMMENDATION.md)
- [Domain and Ownership Map](DOCS/DOMAIN_AND_OWNERSHIP_MAP.md)
- [Unalabs Rollout Plan](DOCS/ROLLOUT_PLAN_UNALABS.md)


