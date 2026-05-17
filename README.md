# FTC Holding — Monorepo

**Owner:** Manchi (Mike Fejiro) — `fefejiro` on GitHub  
**Git remote:** `https://github.com/fefejiro/FTC-HOLDING.git`  
**Primary branch:** `main`  
**Repository visibility:** 🟢 **PUBLIC** (changed 2026-05-11 — unlocks unlimited free GitHub Actions minutes)

FTC Holding is a product studio. This monorepo contains all production apps, shared packages, and operational docs. New devs: read this file first, then `DOCS/FTC_PROJECT_LEDGER.md` for project status, then `DOCS/RUNBOOK.md` for ops.

---

## Apps

| App | What it is | Live URL | Deploy target |
|-----|-----------|---------|--------------|
| `APPS/una-labs-site` | Una Labs agency marketing + client intake | [unalabs.cloud](https://unalabs.cloud) | Cloudflare Pages (`una-labs-site`) |
| `APPS/saywetin` | SayWetin web/API (music recognition) | Railway backend | Railway `saywetin-api` in `splendid-spirit` |
| `APPS/saywetin-native` | SayWetin React Native mobile app | — (build only) | EAS / Play Store / App Store |
| `APPS/saywetin-extension` | SayWetin Chrome extension | — (build only) | Chrome Web Store |
| `APPS/peacepad` | PeacePad (parenting app) web + API | [peacepad.ca](https://peacepad.ca) | CF Pages (frontend) + Railway (API) |
| `APPS/peacepad-extension` | PeacePad Chrome extension | — | Chrome Web Store |
| `APPS/dispatch` | Dispatch (ops routing tool) | Railway + CF Worker | Railway + Cloudflare |
| `APPS/og-trades-academy` | OG Trades Academy (forex education) | [ogtradesacademy.com](https://www.ogtradesacademy.com) | Cloudflare Pages |
| `APPS/ftc-site` | FTC site shell (legacy/og-trades host) | Same as above | Cloudflare Pages |
| `APPS/gidi-dashers` | Gidi Dashers PWA + TWA (food delivery) | [gidi-dashers.pages.dev](https://gidi-dashers.pages.dev) | CF Pages (PWA) + Play Store (TWA) |
| `APPS/gidi-dashers-portal` | Gidi Dashers admin portal | — | Cloudflare Pages |
| `APPS/ATEAM` | ATEAM workflow runtime (AI ops engine) | Railway `ateam-platform` | Railway + CF Worker |
| `APPS/anion` | Anion (class app) | In progress | — |
| `APPS/anion-mobile` | Anion mobile app | In progress | — |

---

## Project Status (as of 2026-05-11)

See `DOCS/FTC_PROJECT_LEDGER.md` for the authoritative status. Summary:

| Project | Status | Blocker |
|---------|--------|---------|
| Una Labs | ✅ GO | Monitoring only |
| Garden Cleaners (client portal) | 🟡 GO pending signoff | Final client acceptance |
| SayWetin | 🔴 HOLD | API 404s — env/Railway config |
| Dispatch | 🔴 HOLD | DATABASE_URL + token-flow verification |
| OG Trades Academy | 🟡 HOLD | Domain + webhook URLs unconfirmed |
| Gidi Dashers | 🟡 Active | TWA on Play Store, portal in progress |
| PeacePad | ✅ GO | Stable |

---

## Repo Structure

```
APPS/          — all product apps (one folder per app)
PACKAGES/      — shared packages: auth, config, logger, supabase, types
DOCS/          — active operational and deployment docs
DOCS/archive/  — completed-project execution logs (reference only)
workers/       — Cloudflare Worker projects
scripts/       — repo-level utility scripts
career/        — job-hunt automation scripts (personal tooling)
```

Root files that matter:
- `AI_GUARDRAILS.md` — rules for AI agent/Copilot work in this repo
- `CLAUDE.md` — AI context for Claude-based agents
- `company-context.md` — company overview and product positioning
- `FTC_MASTER.md` — canonical FTC strategy and tech decisions
- `START_HERE.md` — quick-start per app
- `wrangler.toml` — root Cloudflare config
- `package.json` — root workspace scripts and shared tooling

---

## Infrastructure

| Layer | Provider | Details |
|-------|---------|---------|
| Frontend hosting | Cloudflare Pages | Git-push deploys from `main` |
| Backend hosting | Railway (`splendid-spirit` project) | Docker + Node services |
| Database | Supabase | See `DOCS/supabase-una-labs-schema.sql` |
| Auth | Supabase Auth | Per-app, see `DOCS/FTC_AUTH_STANDARD.md` |
| Email | Resend + custom SMTP | Per-app config |
| Payments | Stripe | See `DOCS/stripe-setup-handover.md` |
| Domains | Cloudflare DNS | See `DOCS/DOMAIN_AND_OWNERSHIP_MAP.md` |

---

## Automation & GitHub Profile

**GitHub Actions Workflows:**
- `job-reply-agent.yml` — Runs every 15 min, weekdays 8AM–9PM EST; processes recruiter emails and sends approved drafts
- `job-reply-report.yml` — Runs daily at 6PM EST; sends end-of-day summary report
- Both workflows verified operational on public repo (unlimited free minutes)
- See `APPS/job-reply-agent/README.md` and `APPS/job-reply-agent/ops/BACKLOG.md` for details

**GitHub Profile:**
- Repository: `fefejiro/fefejiro` (public, custom README at root)
- Profile URL: https://github.com/fefejiro
- Profile README configured (awaiting GitHub cache refresh for full display)

---

## Key Commands

Run from repo root (`C:\FTC HOLDING\_restore_repo`):

```powershell
# Check for exposed secrets
npm run audit:secrets

# Build an app
npm --prefix APPS/una-labs-site run build
npm --prefix APPS/saywetin run build
npm --prefix APPS/peacepad run build

# Run app-level smoke tests
npm --prefix APPS/peacepad run smoke:e2e:update-lifecycle

# Verify deployment ownership
npm --prefix APPS/peacepad run verify:deployment-ownership
```

---

## Working in this repo

1. **One PR per concern.** Never mix app changes and DOCS changes in one commit.
2. **CTO approval required** before committing to `main`. See `AI_GUARDRAILS.md`.
3. **No secrets in code.** Env vars only. See `DOCS/SECURITY_ROTATION_CHECKLIST.md`.
4. **Evidence-based done.** A feature is done when there is an HTTP 200 or a passing test — not when it compiles.
5. **New to a project?** Go to `DOCS/FTC_PROJECT_LEDGER.md` for status, then the project's `DOCS/[PROJECT]_HANDOVER.md` for history.

---

## Contacts

- Owner: Manchi (Mike Fejiro) — approve all changes, all merges
- Support domain: `support@unalabs.cloud`
- Backend infra: Railway dashboard → `splendid-spirit` project



