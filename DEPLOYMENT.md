# FTC HOLDING — Deployment

Last updated: 2026-05-05

This document covers how each app is deployed, what triggers deploys, and how to verify them.
For architecture context, see `ARCHITECTURE.md`. For detailed runbooks, see `DOCS/RUNBOOK.md` and `DOCS/DEPLOY_COMMANDS.md`.

---

## Deploy Model

All apps use one of two patterns:

1. **Cloudflare Pages** — frontend only (static build output). Deploy triggers on `git push origin main`.
2. **Railway** — backend/API (Docker or Node). Deploy triggers on `git push origin main`.

Apps with both surfaces deploy them independently. Frontend and API are always separate services.

---

## Project Deploy Map

| Project | Frontend | Backend | Frontend Domain | Backend Domain |
|---------|----------|---------|-----------------|----------------|
| Una Labs site | Cloudflare Pages | — | `unalabs.cloud` | — |
| ftc-site | Cloudflare Pages | — | `unalabs.cloud` (shell) | — |
| PeacePad | Cloudflare Pages | Railway | `peacepad.ca` | `api.peacepad.ca` |
| SayWetin | Cloudflare Pages | Railway | `saywetin.app` | `api.saywetin.app` |
| Dispatch | Cloudflare Worker | Railway | `dispatch.unalabs.cloud` | Railway service |
| OG Trades Academy | Cloudflare Pages | — | `ogtradesacademy.com` | — |
| ATEAM | Cloudflare Pages | Railway (paused) | `unalabs.cloud/ateam` | Railway |
| Gidi Dashers | Cloudflare Pages + Play Store | — | `gidi-dashers.pages.dev` | — |
| Anion | TBD | TBD | TBD | TBD |

---

## App-Specific Deploy Commands

### Una Labs site

```bash
# Build
npm --workspace=@ftc/una-labs-site run build

# Cloudflare Pages build config
# Build command: npm --prefix APPS/una-labs-site run build
# Output directory: APPS/una-labs-site/.next
```

### ftc-site

```bash
# Build with Cloudflare Pages adapter
npm run pages:build:ftc-site

# Or from repo root
npm run build:ftc

# Cloudflare Pages build config
# Install: npm ci
# Build: npm --prefix APPS/ftc-site run build && cd APPS/ftc-site && npx --yes @cloudflare/next-on-pages@1
# Output: APPS/ftc-site/.vercel/output/static
```

### PeacePad

```bash
# Frontend (Cloudflare Pages)
npm run pages:build:peacepad
# Install: npm ci
# Build: npm --prefix APPS/peacepad run build:frontend
# Output: APPS/peacepad/dist/public

# Backend (Railway)
npm run railway:build:peacepad   # builds API
npm run railway:start:peacepad   # starts API

# Required env vars (Railway)
# DEPLOY_ROLE=api
# DATABASE_URL=<postgres connection string>
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

### SayWetin

```bash
# Frontend (Cloudflare Pages)
npm run pages:build:saywetin
# Install: npm ci
# Build: npm --prefix APPS/saywetin run build:frontend
# Output: APPS/saywetin/dist/public
# Env: VITE_API_BASE_URL=https://api.saywetin.app

# Backend (Railway)
# Builder: Dockerfile in APPS/saywetin/
# Required env vars:
# DEPLOY_ROLE=api
# PUBLIC_BASE_URL=https://api.saywetin.app
# DATABASE_URL, ACRCLOUD_*, OPENAI_API_KEY

# Verify frontend build before pushing to Pages
npm --prefix APPS/saywetin run verify:frontend-build
```

### Dispatch

```bash
# Railway service
# Root directory: APPS/dispatch
# Required env vars:
# DATABASE_URL=<postgres connection string>
# AUTH_TOKEN=<service token>
# See DOCS/DISPATCH_HANDOVER_2026-03-28.md for full env list

# Smoke test after deploy
cd APPS/dispatch && npm run test:e2e:road-alerts
```

### OG Trades Academy

```bash
# Cloudflare Pages
# Install: npm ci
# Build: npm --prefix APPS/og-trades-academy run build
# Required env vars (must be set before go-live):
# OG_TRADES_LEADS_WEBHOOK_URL
# OG_TRADES_CONFIRMATION_WEBHOOK_URL

# Post-deploy smoke
npm --prefix APPS/og-trades-academy run smoke:prod
```

### ATEAM

```bash
# Railway (currently paused - $0 burn)
# To resume: unpause the Railway service in the dashboard
# Required env vars:
# ATEAM_KEY=<secret>
# TELEGRAM_BOT_TOKEN=<token> (Telegram gateway only)

# Local start
cd APPS/ATEAM && node Server/bridge.js

# Cloudflare tunnel (for remote access)
tmp-bin/cloudflared.exe tunnel --url http://127.0.0.1:3001
```

---

## Cloudflare Workers

Workers are deployed using Wrangler. Each worker has its own `wrangler.toml`.

```bash
# Deploy stripe-api worker
cd workers/stripe-api && npx wrangler deploy

# Deploy peacepadai worker
cd workers/peacepadai && npx wrangler deploy

# Deploy dispatch-edge worker
cd workers/dispatch-edge && npx wrangler deploy
```

Worker secrets are managed via Wrangler secrets:
```bash
npx wrangler secret put SECRET_NAME --env production
```

---

## Post-Deploy Verification

```bash
# PeacePad production health
npm run verify:peacepad:prod

# PeacePad deployment ownership
npm --prefix APPS/peacepad run verify:deployment-ownership

# SayWetin frontend build gate
npm --prefix APPS/saywetin run verify:frontend-build

# Portfolio-wide E2E check
npm run qa:portfolio:e2e

# Secrets audit (run before any deploy)
npm run audit:secrets
```

---

## Environment Variables

- Never commit secrets or env files to the repository.
- Frontend public vars (prefixed `NEXT_PUBLIC_` or `VITE_`) are set in Cloudflare Pages dashboard.
- Backend private vars are set in Railway dashboard.
- Cloudflare Worker secrets are managed via `wrangler secret put`.
- See `DOCS/SECURITY_ROTATION_CHECKLIST.md` for rotation procedures.
- See `DOCS/DOMAIN_AND_OWNERSHIP_MAP.md` for domain configuration.

---

## Railway Project

All Railway backend services run in the `splendid-spirit` project.
Access via: Railway dashboard → `splendid-spirit`.

Active services (as of 2026-05-05):
- `peacepad-api` — PeacePad backend (~$5 USD/month)
- `dispatch-api` — Dispatch backend (~$5 USD/month)
- `saywetin-api` — SayWetin backend (on HOLD, API returning 404)
- `ateam-platform` — ATEAM (paused, $0 burn)

---

## DNS

All domains use Cloudflare DNS.
Canonical map: `DOCS/DOMAIN_AND_OWNERSHIP_MAP.md`

Key entries:
- `unalabs.cloud` → Cloudflare Pages (una-labs-site)
- `peacepad.ca` → Cloudflare Pages (frontend)
- `api.peacepad.ca` → Railway (PeacePad API)
- `saywetin.app` → Cloudflare Pages (frontend)
- `api.saywetin.app` → Railway (SayWetin API)
- `dispatch.unalabs.cloud` → Cloudflare Worker / Railway

---

*For detailed historical runbooks and per-project deploy logs, see `DOCS/`.
For current status of each service, see `DOCS/FTC_PROJECT_LEDGER.md`.*
