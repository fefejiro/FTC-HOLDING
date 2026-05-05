# Copilot Instructions — FTC Holding / Una Labs

You are working with Manchi, solo founder of Fejiro Technology Consultancy Inc. (FTC Holding / Una Labs).

---

## Workspace Context

FTC-HOLDING is a portfolio monorepo. It contains multiple independent production applications and shared packages. Treat each project folder as a separate product with its own users, brand, and deployment pipeline.

Projects:
1. **Dispatch** — Ottawa roadside assistance. Live. Paying clients: Kevin, Cheta. Backend on Railway.
2. **PeacePad** — AI co-parenting mediation. Live (web + Android). Backend on Railway.
3. **OG Trades Academy** — Trade school platform. Pre-launch. Domain held.
4. **ATEAM** — Internal AI agent OS. Live in demo mode. Railway backend paused ($0 burn).
5. **SayWetin** — Shazam for Nigerian lingo/music. Live (Android). iOS blocked.
6. **GuardSignal** — Context-aware anti-theft for motorcycles. Pre-build validation phase.

Tech stack: React, React Native, Node.js, Next.js, Supabase, Cloudflare Pages, Railway, Drizzle ORM, Playwright (E2E tests), Capacitor (Android).

---

## Mandatory Rules (Apply to Every Task)

### Scope
- Keep every change scoped to the project folder or files mentioned in the task.
- Do not touch files in other project folders unless the task explicitly requires it.
- Do not make broad refactors. Make the smallest change that solves the problem.
- Do not redesign apps, navigation, or data models unless explicitly asked.

### Protected Files and Settings
- Do not modify `.env` files or any environment variable definitions.
- Do not modify deployment configuration files (`wrangler.toml`, `railway.json`, Cloudflare Pages settings, etc.).
- Do not modify billing settings, API key definitions, or secret references.
- Do not add, remove, or upgrade dependencies unless the task explicitly requires it.

### Brand and Positioning
- Each project has its own brand identity. Do not merge or confuse them.
- Dispatch, PeacePad, SayWetin, ATEAM, and OG Trades Academy are distinct products.
- Do not apply Una Labs branding to individual product apps unless explicitly asked.

### Testing
- Always include testing notes in every PR description.
- Do not claim tests passed unless you actually ran them.
- Do not remove or skip existing tests.
- If a test requires a desktop environment (Playwright, Railway live endpoint), flag it explicitly.

### Honesty
- If you cannot complete a task safely within scope, say so. Do not proceed with risky changes.
- If CI is failing due to a pre-existing issue unrelated to the task, note it but do not fix it unless asked.

---

## Response Style

- No contractions
- No em dashes
- Direct, concise, actionable
- Always provide next steps, not just explanations
- Nigerian/Warri humor welcome — no corporate fluff

---

## Deployment Map

| Project | Frontend | Backend | Domain |
|---------|----------|---------|--------|
| Dispatch | Cloudflare Pages | Railway (live) | dispatch.unalabs.cloud |
| PeacePad | Cloudflare Pages | Railway (live) | peacepad.ca |
| Una Labs site | Cloudflare Pages | — | unalabs.cloud |
| SayWetin | Cloudflare Pages | Railway | TBD |
| ATEAM | Cloudflare Pages | Railway (paused) | unalabs.cloud/ateam |

---

## Core Principles

- Optimize what exists before adding new layers
- Prefer $0 solutions; defer paid services until revenue-positive
- Minimize monthly burn (current total: ~$20 USD/month)
- Lean, battle-tested, revenue-first version of every solution
- No feature bloat

---

## Model Routing

| Task Type | Model to Use |
|-----------|-------------|
| Architecture, planning, long-form docs, refactoring | Claude Opus 4.6 |
| Bug fixing, QA, rapid iteration, stack traces | GPT-5.4 |
| Edge case testing, final polish, small edits | Gemini 2.0 |
| Inline autocomplete | Auto |

---

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

---

## Master Reference

See `FTC_MASTER.md` in the repo root for the full orchestration map, decision log, and velocity tracker.
See `docs/prompts/README.md` for the prompt library and agent selection guide.
