# Copilot Instructions — FTC Holding / Una Labs

You are working with Manchi, solo founder of Fejiro Technology Consultancy Inc. (FTC Holding / Una Labs).

## Identity and Context

- Solo founder, IT Manager, building AI-powered products
- Company: FTC Holding (legal) / Una Labs (public brand)
- Repo root: `C:\FTC HOLDING`
- OS: Windows (local dev), Linux (Railway / cloud)
- IDE: VS Code

## Active Projects (Priority Order)

1. **Dispatch** — Ottawa roadside assistance. Live. Paying clients: Kevin, Cheta. Backend on Railway.
2. **PeacePad** — AI co-parenting mediation. Live (web + Android). Backend on Railway.
3. **OG Trades Academy** — Trade school platform. Pre-launch. Domain held.
4. **ATEAM** — Internal AI agent OS. Live in demo mode. Railway backend paused ($0 burn).
5. **SayWetin** — Shazam for Nigerian lingo/music. Live (Android). iOS blocked.
6. **GuardSignal** — Context-aware anti-theft for motorcycles. Pre-build validation phase.

## Tech Stack

React, React Native, Node.js, Next.js, Supabase, Cloudflare Pages, Railway, Drizzle ORM, Playwright (E2E tests), Capacitor (Android).

## Core Principles (Always Apply)

- Optimize what exists before adding new layers
- Prefer $0 solutions; defer paid services until revenue-positive
- Minimize monthly burn (current total: ~$20 USD/month)
- 70% planning and orchestration, 30% implementation
- Lean, battle-tested, revenue-first version of every solution
- No feature bloat

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
- Nigerian/Warri humor welcome — no corporate fluff

## Deployment Map

| Project | Frontend | Backend | Domain |
|---------|----------|---------|--------|
| Dispatch | Cloudflare Pages | Railway (live) | dispatch.unalabs.cloud |
| PeacePad | Cloudflare Pages | Railway (live) | peacepad.ca |
| Una Labs site | Cloudflare Pages | — | unalabs.cloud |
| SayWetin | Cloudflare Pages | Railway | TBD |
| ATEAM | Cloudflare Pages | Railway (paused) | unalabs.cloud/ateam |

## Active Sprint (Week of 2026-04-20)

**Project:** Una Labs site (`APPS/una-labs-site`) stabilization sprint.
**Goal:** Keep intake-to-delivery flow reliable and finalize webhook architecture decisions.
**Blocked item:** Stripe worker webhook architecture is inconsistent across docs and must be resolved before further changes.

## Quick Commands

```powershell
# Dispatch smoke test
cd "C:\FTC HOLDING\APPS\dispatch"; npm run test:e2e:road-alerts

# PeacePad health
npm --prefix APPS/peacepad run verify:deployment-ownership

# Secrets audit
npm run audit:secrets

# Git status
git -C "C:\FTC HOLDING" status -sb
```

## Master Reference

See `FTC_MASTER.md` in the repo root for the full orchestration map, decision log, and velocity tracker.
