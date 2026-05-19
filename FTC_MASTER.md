# FTC Master Orchestration
Last updated: 2026-05-19

Single source of truth for cross-project status, priority, burn, and next actions.
Paste the relevant section into any AI tool to seed context instantly.

---

## Company Structure

- **Legal entity:** Fejiro Technology Consultancy Inc. (FTC Holding)
- **Public brand:** Una Labs (unalabs.cloud)
- **Repo root:** `C:\FTC HOLDING` → github.com/fefejiro/FTC-HOLDING
- **Solo operator:** Manchi (Mike Fejiro)
- **Stage:** Seed — live products, Stripe connected, no confirmed ARR yet

---

## Project Priority Board

Priority is revenue-first. Do not move to a lower-priority project until the higher one has a clear next action completed.

| # | Project | Status | Monthly Burn | Revenue Status | Next Action |
|---|---------|--------|-------------|---------------|-------------|
| 1 | **Dispatch** | Live (Ottawa) | ~$5 USD Railway | Paying clients: Kevin, Cheta | Run smoke test, fix failures |
| 2 | **PeacePad** | Live (web + Android) | ~$5 USD Railway | No confirmed ARR | Conversion audit, retention fixes |
| 3 | **OG Trades Academy** | Pre-launch | $0 | No revenue | Enrollment funnel + first revenue checkpoint |
| 4 | **ATEAM** | Live (demo mode) | $0 | Internal tool | Phase 1 capability decoupling, hardening |
| 5 | **SayWetin** | Live (Android) | $0 | No revenue | iOS blocked; API routing fixed 2026-04-23; awaiting real-device test |
| 6 | **GuardSignal** | Pre-build | $0 | No revenue | Validate core loop before any build |
| 7 | **Anion Class App** | Foundation scaffold | $0 | No revenue | Implement auth, tutor discovery, and booking flow |

**Total monthly burn:** ~$10 USD ($5 Railway Dispatch + $5 Railway PeacePad) + $10 USD GitHub Copilot Pro = **$20 USD/month**

---

## Deployment Map

| Project | Frontend | Backend | Domain |
|---------|----------|---------|--------|
| Dispatch | Cloudflare Pages | Railway (live) | dispatch.unalabs.cloud |
| PeacePad | Cloudflare Pages | Railway (live) | peacepad.ca |
| Una Labs site | Cloudflare Pages | — | unalabs.cloud |
| SayWetin | Cloudflare Pages | Railway | saywetin.app (verify) |
| ATEAM | Cloudflare Pages | Railway (paused) | unalabs.cloud/ateam |
| OG Trades Academy | TBD | TBD | ogtradesacademy.ca (domain held) |
| Anion Class App | Cloudflare Pages + mobile stores | Supabase + Stripe + Daily React | TBD |

---

## AI Tooling (Current Stack)

| Tool | Cost | Use Case |
|------|------|----------|
| GitHub Copilot Pro | $10 USD/month | All planning, coding, QA — in VS Code. Claude Opus 4.6, GPT-5.4, Gemini 2.0 |
| Claude.ai free | $0 | Deep strategic planning, long-context documents |
| ChatGPT free | $0 | Fallback web search, creative brainstorming |

**Model routing inside Copilot:**
- Claude Opus 4.6 → architecture, planning, long-form docs, refactoring
- GPT-5.4 → bug fixing, QA, rapid iteration, web search
- Gemini 2.0 → edge case testing, final polish, small edits

---

## Pending Decisions (Blocking)

1. **ATEAM git tracking:** APPS/ATEAM is untracked from root repo. Decision needed:
   - Option A: `git add APPS/ATEAM` and commit (track in monorepo)
   - Option B: Give ATEAM its own git repo and remove from FTC HOLDING root
   - **Recommendation:** Option A — keep it in the monorepo for unified context

2. **OG Trades Academy:** Domain held (ogtradesacademy.ca). No app folder yet. Needs folder scaffold before any work starts.

3. **GuardSignal:** No folder in APPS/ yet. Do not create until core loop is validated on paper.

---

## Active Sprint (Week of 2026-04-20)

**Project:** Una Labs — Ignition parity build-out
**Goal:** Close the 5 remaining Ignition module gaps to reach full feature parity, then enable multi-tenancy for platform sale
**Success:** Deals/leads live, /how-it-works page deployed, custom branding scaffolded, AutoPricing self-serve wired
**Do not work on:** New feature expansion in other products

## Una Labs Sprint — Ignition Parity Tracker (8/13 live → target 13/13)

| Phase | What | Ignition Module | Status |
|-------|------|-----------------|--------|
| Phase 0–4 | Auth, proposals, reporting, pipeline, billing | Proposals, Billing, Reporting | ✅ Done |
| Phase 5 | Contracts/E-sign | Contracts | ✅ Done (e967a47) |
| Phase 5b | Admin contracts table | Contracts (admin) | ✅ Done (e59ede8) |
| Phase 6 | Invoicing — auto-generate on milestone approval | Billing & payments | ✅ Done |
| Phase 7 | Instant Bill — one-off Stripe PaymentLink | Instant Bill | ✅ Done |
| Phase 8 | AI Price Insights — recommended pricing bands in scoping output | Price Insights | ✅ Done |
| Phase 9 | AutoCollect — collection queue, reminders, payout-ready tracking | AutoCollect | ✅ Build done — cron live daily at 1 PM UTC; first live run → test plan |
| Phase 10 | Deals / Leads — pre-intake prospect pipeline | Deals | ✅ Done |
| Phase 11 | /how-it-works — narrated module demo page | (Marketing) | ✅ Done (456d4c70) |
| Phase 12 | AutoPricing self-serve — re-trigger AI price from proposal view | AutoPricing | ✅ Done (5963be0a) |
| Phase 13 | Custom Branding — per-project logo + accent on proposals/emails | Custom Branding | ✅ Done (3a78a272) |
| Phase 14 | Multi-tenancy + Stripe Connect — sell platform to other agencies | (Platform) | ✅ Verified done — sandbox onboarding completed and status verified via admin Connect flow |
| Phase 15 | Zapier / Webhooks — outbound event hooks for Xero, Slack, QBO | Integrations | ✅ Done (ab8c4026) |

Next: Execute full test plan end-to-end and finalize launch signoff package.

---

## Quick Commands

```powershell
# Dispatch smoke test
cd "C:\FTC HOLDING\APPS\dispatch"
npm run test:e2e:road-alerts

# PeacePad production health
npm --prefix APPS/peacepad run verify:deployment-ownership

# SayWetin build check
npm --prefix APPS/saywetin run verify:frontend-build

# Anion status sync
npm run status:anion:sync

# Secrets audit (run weekly)
npm run audit:secrets

# PeacePad weekly metrics doc sync (example)
npm run metrics:peacepad:weekly -- --weekStart 2026-04-13 --weekEnd 2026-04-20 --totalUsers 229 --newUsers 22 --activeUsers 24 --partnerships 108 --messagesSent 192 --feedbackSubmitted 0 --p1Errors 0 --p2Errors 1 --source "PeacePad Weekly Report email"

# Git status
git -C "C:\FTC HOLDING" status -sb
```

---

## Documentation Map

| Doc | Location |
|-----|----------|
| Repo structure + ownership | DOCS/REPO_OWNERSHIP_AND_TRACKING.md |
| Deploy commands | DOCS/DEPLOY_COMMANDS.md |
| Runbook (all apps) | DOCS/RUNBOOK.md |
| PeacePad weekly metrics | DOCS/PEACEPAD_WEEKLY_METRICS.md |
| Una Labs live status snapshot | DOCS/UNALABS_STATUS.md |
| Una Labs E2E automation handover | DOCS/UNALABS_E2E_AUTOMATION_HANDOVER.md |
| Una Labs repeatable E2E test plan | DOCS/UNALABS_E2E_REPEATABLE_TEST_PLAN.md |
| Garden premium execution docket | DOCS/GARDEN_PREMIUM_EXECUTION_DOCKET_2026-04-26.md |
| Garden portal analytics contract | DOCS/GARDEN_PORTAL_ANALYTICS_EVENT_MAP.md |
| Garden portal reporting baseline | DOCS/GARDEN_PORTAL_REPORTING_BASELINE.md |
| Domain map | DOCS/DOMAIN_AND_OWNERSHIP_MAP.md |
| Dispatch context | APPS/dispatch/DOCS/CONTEXT.md |
| Dispatch decisions | APPS/dispatch/DOCS/DECISIONS.md |
| Dispatch velocity | APPS/dispatch/DOCS/VELOCITY_LOG.md |
| ATEAM phase status | APPS/ATEAM/Docs/current_phase.md |
| ATEAM decisions | APPS/ATEAM/Docs/DECISIONS.md |
| ATEAM velocity | APPS/ATEAM/Docs/VELOCITY_LOG.md |
| Anion product docs | DOCS/ANION/README.md |
| Anion status | DOCS/ANION/status/STATUS.md |

---

## Copilot Onboarding Prompt (Paste at start of every new session)

> I am Manchi, solo founder of Fejiro Technology Consultancy Inc. (FTC Holding / Una Labs). Stack: React, React Native, Node.js, Next.js, Supabase, Cloudflare, Railway. Projects: Dispatch (live, paying clients), PeacePad (live), OG Trades Academy (pre-launch), ATEAM (internal), SayWetin (live), GuardSignal (pre-build). Principles: optimize existing systems first, minimize burn, defer paid services until revenue-positive, 70% planning 30% building. IDE: VS Code on Windows. No contractions, no em dashes, direct tone. Lean, revenue-first solutions always. Active sprint: Dispatch reliability hardening.

---

## PeacePad Weekly Metrics (Auto)

<!-- AUTO:PEACEPAD_MASTER:START -->
- Reporting week: 2026-04-13 to 2026-04-20
- Users: 229 total, 22 new, 24 active
- Engagement: 192 messages, 0 feedback items
- System health: P1=0, P2=1
- Partnerships: 108
- Source: PeacePad Weekly Report email
- Canonical log: DOCS/PEACEPAD_WEEKLY_METRICS.md
<!-- AUTO:PEACEPAD_MASTER:END -->


## Una Labs Ops Snapshot (Auto)

<!-- AUTO:UNALABS_MASTER:START -->
- Updated at: 2026-05-19T20:04:27.658Z
- Smoke checks: 4/14 passing
- Admin verification: unauthenticated admin guard smoke only
- Canonical status doc: DOCS/UNALABS_STATUS.md
<!-- AUTO:UNALABS_MASTER:END -->


## SayWetin Ops Snapshot (Auto)

<!-- AUTO:SAYWETIN_MASTER:START -->
- Updated at: 2026-04-23T00:00:00.000Z
- Smoke checks: 1/3 passing (web OK; API /health + /status return 404 — backend route gap, not outage)
- Test suite: 12 tests across 3 files
- Velocity: 86 commits since 2026-04-01; last commit 66746ca 2026-04-23
- API routing: FIXED — Capacitor native runtime now always routes to Railway (not localhost)
- Android build: STABLE — installDebug BUILD SUCCESSFUL
- Animation: FIXED — saywetin-native FadeInView synced with nav animation, Listen→Result direct
- Awaiting: real-device test feedback from user
- Canonical status doc: DOCS/SAYWETIN_STATUS.md
<!-- AUTO:SAYWETIN_MASTER:END -->


## Anion Ops Snapshot (Auto)

<!-- AUTO:ANION_MASTER:START -->
- Updated at: 2026-04-23T00:00:00.000Z
- Overall: yellow
- Stage: foundation
- Metrics tracked: 4
- Checks tracked: 3
- Canonical status doc: DOCS/ANION/status/STATUS.md
<!-- AUTO:ANION_MASTER:END -->
