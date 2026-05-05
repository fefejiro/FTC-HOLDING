# Copilot Instructions — FTC Holding / Una Labs

You are working with Manchi (Mike Fejiro), solo founder of Fejiro Technology Consultancy Inc. (FTC Holding / Una Labs).

## Identity and Context

- Solo founder, IT Manager, building AI-powered products
- Company: FTC Holding (legal) / Una Labs (public brand)
- Repo: `github.com/fefejiro/FTC-HOLDING` (local root: `C:\FTC HOLDING`)
- OS: Windows (local dev), Linux (Railway / cloud)
- IDE: VS Code

## Active Projects (Priority Order)

Revenue-first. Do not move to lower-priority work while a higher one has an active blocker.

1. **Dispatch** — Ottawa roadside assistance. Live. Paying clients: Kevin, Cheta. HOLD: DATABASE_URL + token-flow unverified.
2. **PeacePad** — AI co-parenting mediation. Live (web + Android). No confirmed ARR.
3. **OG Trades Academy** — Forex education platform. Pre-launch. Domain live but webhooks unset.
4. **ATEAM** — Internal AI agent OS. Demo mode. Railway paused ($0 burn).
5. **SayWetin** — Shazam for Nigerian lingo/music. Android live. HOLD: API 404s. iOS blocked.
6. **Gidi Dashers** — Food delivery PWA + admin portal. Active. TWA on Play Store.
7. **Anion Class App** — Tutor-discovery and booking. Foundation scaffold. Auth not yet wired.
8. **GuardSignal** — Context-aware motorcycle anti-theft. Pre-build validation only. No code yet.

## Tech Stack

React, React Native (Expo bare), Node.js, Next.js 14, Vite, Supabase, Cloudflare Pages, Cloudflare Workers, Railway, Drizzle ORM, Playwright (E2E), Vitest (unit), Capacitor (Android), EAS (mobile builds).

## Shared Packages (PACKAGES/)

`@ftc/auth`, `@ftc/supabase`, `@ftc/config`, `@ftc/types`, `@ftc/logger`, `@ftc/peacepad-sdk`, `@ftc/anion-shared`, `@ftc/anion-types`.
Consumed via npm workspace file-protocol links. Always build packages before apps: `npm run build:ftc:deps`.

## Core Principles (Always Apply)

- Optimize what exists before adding new layers
- Prefer $0 solutions; defer paid services until revenue-positive
- Minimize monthly burn (current: ~$20 USD/month)
- 70% planning and orchestration, 30% implementation
- Lean, battle-tested, revenue-first version of every solution
- No feature bloat
- Evidence-based done: a feature is done when there is an HTTP 200 or a passing test, not when it compiles
- CTO approval required before committing to `main`

## Model Routing (Use This Every Session)

| Task Type | Model to Use |
|-----------|-------------|
| Architecture, planning, long-form docs, refactoring | Claude Opus 4.6 |
| Bug fixing, QA, rapid iteration, stack traces | GPT-5.4 |
| Edge case testing, final polish, small edits | Gemini 2.0 |
| Inline autocomplete | Auto |

Switch models using the dropdown in Copilot Chat. Conversation history carries over.

## Response Style

- No contractions
- No em dashes
- Direct, concise, actionable
- Always provide next steps, not just explanations
- Teach better prompting when the question is unclear or verbose
- Nigerian/Warri humor welcome; no corporate fluff

## Deployment Map

| Project | Frontend | Backend | Domain |
|---------|----------|---------|--------|
| Dispatch | Cloudflare Worker | Railway (live) | dispatch.unalabs.cloud |
| PeacePad | Cloudflare Pages | Railway (live) | peacepad.ca / api.peacepad.ca |
| Una Labs site | Cloudflare Pages | — | unalabs.cloud |
| ftc-site | Cloudflare Pages | — | unalabs.cloud (shell) |
| SayWetin | Cloudflare Pages | Railway (HOLD) | saywetin.app / api.saywetin.app |
| OG Trades Academy | Cloudflare Pages | — | ogtradesacademy.com |
| ATEAM | Cloudflare Pages | Railway (paused) | unalabs.cloud/ateam |
| Gidi Dashers | Cloudflare Pages + Play Store | — | gidi-dashers.pages.dev |

## Current Blockers (as of 2026-05-05)

- **Dispatch:** DATABASE_URL not confirmed in Railway; token-flow not end-to-end verified
- **SayWetin:** API returning 404; Railway env misconfiguration; iOS blocked
- **OG Trades Academy:** `OG_TRADES_LEADS_WEBHOOK_URL` and `OG_TRADES_CONFIRMATION_WEBHOOK_URL` not set
- **Una Labs:** Stripe worker webhook architecture inconsistent across docs; Spark AI not yet activated

## Quick Commands

```powershell
# Dispatch smoke test
cd "C:\FTC HOLDING\APPS\dispatch" && npm run test:e2e:road-alerts

# PeacePad production health
npm run verify:peacepad:prod

# PeacePad deployment ownership
npm --prefix APPS/peacepad run verify:deployment-ownership

# SayWetin frontend build gate
npm --prefix APPS/saywetin run verify:frontend-build

# Portfolio-wide E2E sweep
npm run qa:portfolio:e2e

# Secrets audit (run before any deploy)
npm run audit:secrets

# Git status
git -C "C:\FTC HOLDING" status -sb
```

## Key Documentation

| File | Purpose |
|------|---------|
| `README.md` | Repo overview and app table |
| `PROJECT_BRIEF.md` | Business context, portfolio, priorities |
| `ARCHITECTURE.md` | Technical architecture and package map |
| `ROADMAP.md` | Prioritized roadmap by project |
| `TASKS.md` | Issue-ready task list across all projects |
| `TESTING.md` | Test strategy, commands, and coverage |
| `DEPLOYMENT.md` | Deploy commands per app |
| `FTC_MASTER.md` | Full orchestration map, decisions, velocity |
| `DOCS/FTC_PROJECT_LEDGER.md` | Authoritative per-project status |
| `DOCS/RUNBOOK.md` | Daily operator checks and procedures |
| `AI_GUARDRAILS.md` | Rules for AI agent work in this repo |
