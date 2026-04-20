# FTC Master Orchestration
Last updated: 2026-04-20

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
| 5 | **SayWetin** | Live (Android) | $0 | No revenue | iOS blocked; wait for contracted client |
| 6 | **GuardSignal** | Pre-build | $0 | No revenue | Validate core loop before any build |

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

**Project:** Una Labs site (unalabs.cloud)
**Goal:** Close production gaps and stabilize intake-to-delivery flow
**Success:** Una Labs build passes, webhook path decision finalized, dashboard and portal routes validated
**Do not work on:** New feature expansion in other products

## Una Labs Sprint — Score: 8/13

| Phase | What | Status |
|-------|------|--------|
| Phase 0–4 | Auth, proposals, reporting, pipeline, billing | ✅ Done |
| Phase 5 | Contracts/E-sign | ✅ Done (e967a47) |
| Phase 5b | Admin contracts table | ✅ Done (e59ede8) |
| Phase 6 | Invoicing — auto-generate on milestone approval | ✅ Done |

Next: Phase 7 — Instant Bill (one-off Stripe PaymentLink)

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

# Secrets audit (run weekly)
npm run audit:secrets

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
| Domain map | DOCS/DOMAIN_AND_OWNERSHIP_MAP.md |
| Dispatch context | APPS/dispatch/DOCS/CONTEXT.md |
| Dispatch decisions | APPS/dispatch/DOCS/DECISIONS.md |
| Dispatch velocity | APPS/dispatch/DOCS/VELOCITY_LOG.md |
| ATEAM phase status | APPS/ATEAM/Docs/current_phase.md |
| ATEAM decisions | APPS/ATEAM/Docs/DECISIONS.md |
| ATEAM velocity | APPS/ATEAM/Docs/VELOCITY_LOG.md |

---

## Copilot Onboarding Prompt (Paste at start of every new session)

> I am Manchi, solo founder of Fejiro Technology Consultancy Inc. (FTC Holding / Una Labs). Stack: React, React Native, Node.js, Next.js, Supabase, Cloudflare, Railway. Projects: Dispatch (live, paying clients), PeacePad (live), OG Trades Academy (pre-launch), ATEAM (internal), SayWetin (live), GuardSignal (pre-build). Principles: optimize existing systems first, minimize burn, defer paid services until revenue-positive, 70% planning 30% building. IDE: VS Code on Windows. No contractions, no em dashes, direct tone. Lean, revenue-first solutions always. Active sprint: Dispatch reliability hardening.
