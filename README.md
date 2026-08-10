# FTC Holding — Monorepo

**Owner:** Manchi (Mike Fejiro) — `fefejiro` on GitHub  
**Git remote:** `https://github.com/fefejiro/FTC-HOLDING.git`  
**Primary branch:** `main`  
**Repository visibility:** **PUBLIC**

FTC Holding is a product studio. This monorepo contains product apps, shared packages, and operational docs at different evidence and release levels. New devs: read this file first, then `DOCS/FTC_PROJECT_LEDGER.md` for project status, then `DOCS/RUNBOOK.md` for ops.

---

## Apps

| App | What it is | Live URL | Deploy target |
|-----|-----------|---------|--------------|
| `APPS/una-labs-site` | Una Labs agency marketing + client intake | [unalabs.cloud](https://unalabs.cloud) | Cloudflare Pages (`una-labs-site`) |
| `APPS/saywetin` | SayWetin web/API (music recognition) | [saywetin.app](https://saywetin.app) (web live; API health currently failing) | Cloudflare + Railway |
| `APPS/saywetin-native` | SayWetin React Native mobile app | — (build only) | EAS / Play Store / App Store |
| `APPS/saywetin-extension` | SayWetin Chrome extension | — (build only) | Chrome Web Store |
| `APPS/peacepad` | PeacePad (parenting app) web + API | [peacepad.ca](https://peacepad.ca) | CF Pages (frontend) + Railway (API) |
| `APPS/peacepad-extension` | PeacePad Chrome extension | — | Chrome Web Store |
| `APPS/dispatch` | Dispatch (ops routing tool) | [portfolio demo](https://unalabs.cloud/demo/dispatch) (canonical host unavailable) | Railway + Cloudflare |
| `APPS/og-trades-academy` | OG Trades Academy (forex education) | [ogtradesacademy.com](https://www.ogtradesacademy.com) | Cloudflare Pages |
| `APPS/ftc-site` | FTC site shell (legacy/og-trades host) | Same as above | Cloudflare Pages |
| `APPS/gidi-dashers` | Gidi Dashers PWA + TWA (food delivery) | Public host currently unverified | CF Pages (PWA) + Play Store (TWA) |
| `APPS/gidi-dashers-portal` | Gidi Dashers admin portal | — | Cloudflare Pages |
| `APPS/ATEAM` | ATEAM workflow runtime (AI ops engine) | [status only](https://unalabs.cloud/status?project=ateam) (canonical host unavailable) | Railway + CF Worker |
| `APPS/anion` | Anion tutoring and live-classroom platform | [anion.unalabs.cloud](https://anion.unalabs.cloud) | Cloudflare + Supabase + Stripe + Daily |
| `APPS/anion-mobile` | Anion mobile app | Not publicly released | Mobile release rail |

---

## Portfolio Status (verified 2026-08-10)

See `DOCS/FTC_PROJECT_LEDGER.md` for the authoritative status. Summary:

| Project | Reality-based status | Evidence boundary / next gate |
|---------|----------------------|-------------------------------|
| Una Labs | **LIVE SURFACE** | Public site returned HTTP 200; authenticated workflows were not re-executed in this audit |
| Garden Cleaners | **LIVE SURFACE / QA BLOCKED** | Public site returned HTTP 200; current PR checks still show an anonymous Playwright failure |
| PeacePad Web | **LIVE ROLLBACK PRODUCT** | Public web returned HTTP 200; this does not promote Native V2 |
| PeacePad Native V2 | **STAGING / RELEASE BLOCKED** | Hosted and PostgreSQL evidence exists; managed regional deployment, device, TestFlight, and production gates remain open |
| SayWetin | **DEGRADED** | Web returned HTTP 200; `api.saywetin.app/health` returned HTTP 404 |
| Anion | **LIVE / HARDENING** | Production health returned HTTP 200; remaining release and handover gates are tracked separately |
| CapSigma Growth Desk | **LIVE SURFACE / CONTROLLED OPERATIONS** | Public site returned HTTP 200; sending and client operations remain approval-gated |
| OG Trades Academy | **LIVE SURFACE / INTEGRATIONS UNVERIFIED** | Public site returned HTTP 200; lead and confirmation delivery were not re-verified |
| Dispatch | **DEMO ONLY / CANONICAL HOST DOWN** | Una Labs demo/status pages returned HTTP 200; canonical root and health returned HTTP 404 |
| ATEAM | **INTERNAL / CANONICAL HOST DOWN** | Portfolio status page returned HTTP 200; canonical host returned HTTP 404 |
| Gidi Dashers | **PUBLIC HOST UNAVAILABLE** | DNS resolution failed during this audit; store/runtime claims were not re-verified |
| Just Checking In Game | **UNVERIFIED / NOT LOCATED** | No matching implementation or deployment record was found in the current `main` tree; add the canonical repo or artifact before making a release claim |

Status terms are deliberately narrower than product claims. A reachable page proves a live surface, not authentication, persistence, payments, mobile release, or end-to-end readiness. See [`DOCS/FTC_PROJECT_LEDGER.md`](DOCS/FTC_PROJECT_LEDGER.md) for evidence and blockers.

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
- `copilot-portfolio-maintenance.yml` — Creates one deduplicated, review-gated maintenance task Monday–Thursday; Copilot assignment requires the documented narrowly scoped user-token boundary
- `job-reply-agent.yml` — Runs every 15 min, weekdays 8AM–9PM EST; processes recruiter emails and sends approved drafts
- `job-reply-report.yml` — Runs daily at 6PM EST; sends end-of-day summary report
- Workflow schedules and quotas depend on current GitHub plan and repository policy; verify the latest run before relying on automation
- See `APPS/job-reply-agent/README.md` and `APPS/job-reply-agent/ops/BACKLOG.md` for details
- See `DOCS/COPILOT_PORTFOLIO_MAINTENANCE.md` for the maintenance schedule, agent routing, and safety boundary

**GitHub Profile:**
- Repository: `fefejiro/fefejiro` (public, custom README at root)
- Profile URL: https://github.com/fefejiro
- Profile README configured (awaiting GitHub cache refresh for full display)

---

## Key Commands

Run from the repository root:

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
4. **Evidence-based status.** Use `IMPLEMENTED`, `LOCAL VERIFIED`, `HOSTED VERIFIED`, `LIVE SURFACE`, `DEVICE VERIFIED`, `PRODUCTION VERIFIED`, or `BLOCKED`. HTTP 200 proves reachability only; it does not prove the complete product journey.
5. **New to a project?** Go to `DOCS/FTC_PROJECT_LEDGER.md` for status, then the project's `DOCS/[PROJECT]_HANDOVER.md` for history.

---

## Contacts

- Owner: Manchi (Mike Fejiro) — approve all changes, all merges
- Support domain: `support@unalabs.cloud`
- Backend infra: Railway dashboard → `splendid-spirit` project



