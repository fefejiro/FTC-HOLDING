# FTC HOLDING — Project Brief

**Legal entity:** Fejiro Technology Consultancy Inc. (FTC Holding)
**Public brand:** Una Labs (`unalabs.cloud`)
**Operator:** Manchi (Mike Fejiro) — solo founder
**Stage:** Seed — live products, Stripe connected, no confirmed ARR yet
**Monthly burn:** ~$20 USD ($5 Railway Dispatch + $5 Railway PeacePad + $10 GitHub Copilot Pro)

---

## What This Is

FTC Holding is a one-person product studio building and operating AI-powered software products. All products live in this monorepo. The studio operates under the **Una Labs** brand publicly.

The strategy is revenue-first: stabilize and monetize existing products before building new ones.

---

## Product Portfolio

### Revenue-generating / Live

| Product | Description | Domain | Status |
|---------|-------------|--------|--------|
| **Dispatch** | Roadside assistance dispatch tool for Ottawa operators | `dispatch.unalabs.cloud` | Live — paying clients (Kevin, Cheta) |
| **PeacePad** | AI-assisted co-parenting and conflict mediation app | `peacepad.ca` | Live — no confirmed ARR |

### Pre-revenue / Active

| Product | Description | Domain | Status |
|---------|-------------|--------|--------|
| **SayWetin** | Shazam-style recognition for Nigerian music and lingo | `saywetin.app` | Live (Android) — API on HOLD (404s) |
| **OG Trades Academy** | Forex and trade education platform | `ogtradesacademy.com` | Pre-launch — domain live, enrollment pending |
| **Una Labs site** | Agency and portfolio marketing site | `unalabs.cloud` | Live — intake flow active |

### Internal / Pre-build

| Product | Description | Status |
|---------|-------------|--------|
| **ATEAM** | Internal AI agent orchestration OS | Demo mode — Railway paused ($0 burn) |
| **Anion Class App** | Tutor-discovery and booking platform | Foundation scaffold — auth not yet wired |
| **GuardSignal** | Context-aware motorcycle anti-theft system | Pre-build validation — no folder yet |
| **Gidi Dashers** | Food delivery PWA + admin portal | Active — TWA on Play Store |

---

## Client Work

| Client | Product | Status |
|--------|---------|--------|
| Garden Cleaners | Branded client portal on ftc-site | GO pending final client acceptance |

---

## Business Model

- **SaaS subscriptions:** PeacePad, SayWetin (planned)
- **Platform fees:** OG Trades Academy enrollment
- **Consulting/delivery:** Dispatch (per-operator), Garden Cleaners (flat project fee)
- **Future:** ATEAM licensing, GuardSignal hardware + subscription

---

## Key Risks

1. No confirmed ARR despite multiple live products
2. SayWetin and Dispatch are both on HOLD with env/infra blockers
3. Solo operator — no redundancy for incidents or outages
4. OG Trades Academy domain/webhook unverified

---

## How Decisions Are Made

- **Revenue-first:** Do not move to lower-priority work while a blocker exists on higher-priority work
- **$0 principle:** Prefer free-tier solutions; defer paid services until revenue-positive
- **Evidence-based done:** A feature is done when there is an HTTP 200 or a passing test — not when it compiles
- **CTO approval:** All merges to `main` require owner approval (see `AI_GUARDRAILS.md`)

---

*For current project status, see `DOCS/FTC_PROJECT_LEDGER.md`.
For architecture decisions, see `ARCHITECTURE.md`.
For deployment commands, see `DEPLOYMENT.md`.*
