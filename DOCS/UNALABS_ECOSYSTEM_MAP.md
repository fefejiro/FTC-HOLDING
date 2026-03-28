# Unalabs Ecosystem Map

Last updated: 2026-03-28
Canonical repo root: `C:\FTC HOLDING`

## Purpose

This document defines the current umbrella relationship between FTC, Unalabs, the active products, and the extension track. It is a documentation-first architecture map, not a repo-move plan.

## One-Page Map

```text
FTC HOLDING
  Legal, holding, consulting, and operating entity
        |
        v
Unalabs
  Public studio and umbrella brand for product innovation
        |
        +-- PeacePad
        |     AI communication and conflict mediation product
        |
        +-- Saywetin
        |     Nigerian language, music, and culture intelligence product
        |
        +-- ATEAM
        |     Internal AI operating system and orchestration layer
        |
        +-- Dispatch
        |     Ottawa roadside assistance dispatch system (client product)
        |
        +-- Extensions
              Channel-specific product surfaces starting with PeacePad WhatsApp/browser
```

## Layered View

### 1. Business Layer

- `FTC HOLDING` is the legal, operational, and consulting entity.
- `Unalabs` is the umbrella studio and product lab used to present products, case studies, capabilities, and future launches.
- Product brands remain distinct under the Unalabs umbrella.

### 2. Product Layer

#### PeacePad
- Role: AI communication, co-parenting, and conflict-mediation product.
- Surface types: web, mobile shell, API.
- Adjacent extension track: browser and messaging intervention surfaces.

#### Saywetin
- Role: Nigerian language, lyric, music recognition, and cultural-intelligence product.
- Surface types: web, mobile shell, API.
- Positioned as a standalone product under Unalabs, not as a PeacePad feature.

#### ATEAM
- Role: internal AI operating system, orchestration workspace, and reusable agent engine.
- Current posture: active codebase with local-first orientation; ownership and root tracking still need formalization.
- Strategic role: platform and internal operating capability first, product surface second.

#### Extensions
- Role: channel-specific intervention surfaces.
- Current concrete example: `APPS/peacepad-extension` for WhatsApp Web, Gmail, and Slack pre-send mediation.
- Future shape: multiple extensions or channel adapters can live under this category without forcing them into one product UI.

### 3. Capability / Platform Layer

These capabilities cut across multiple products, even when implementation is currently product-local:

- communication analysis and tone moderation
- AI rewrite / calming assistance
- orchestration and agent execution
- cultural language interpretation
- audio recognition and lyric/context enrichment
- shared auth, config, logging, and typing packages

Current local code locations already reflect some of this split:
- product apps in `APPS/`
- shared packages in `PACKAGES/`
- extension surface in `APPS/peacepad-extension`
- worker experiments in `workers/`

### 4. Deployment Ownership Layer

#### Unalabs site / studio surface
- Current code location: `APPS/ftc-site`
- Purpose: public studio, portfolio, and product umbrella presence.
- Brand role: this is the current codebase most directly representing the Unalabs umbrella.

#### PeacePad
- Frontend owner: Cloudflare Pages
- API owner: Railway
- Mobile shell: Capacitor release track separate from web deploys

#### Saywetin
- Frontend owner: Cloudflare Pages
- API owner: Railway
- Mobile shell: Capacitor release track separate from web deploys

#### PeacePad extension
- Runtime surface: browser extension package and host-site content scripts
- Backend dependency: PeacePad API
- No evidence in this pass of a separate production backend owned by the extension itself

#### ATEAM
- Public surface: `unalabs.cloud/ateam` — live, CF Pages deployed
- Local orchestration layer: `APPS/ATEAM/` — bridge server + Telegram gateway
- API: Railway (`ateam-api-production.up.railway.app`)

#### Dispatch
- Ottawa roadside assistance system for a client operator
- Frontend + API: Railway (`dispatch-api-production.up.railway.app`)
- Database: Supabase shared project, isolated in `dispatch.*` schema
- See: `DOCS/DISPATCH_HANDOVER_2026-03-28.md`

## Operating Interpretation

### FTC vs Unalabs
- Use `FTC HOLDING` for legal ownership, operating structure, and consulting context.
- Use `Unalabs` for product umbrella, public narrative, studio positioning, and cross-product explanation.

### Product positioning
- PeacePad and Saywetin are product brands.
- ATEAM is a platform/internal systems brand that can later become a clearer internal platform layer or a standalone tool.
- Extensions are distribution surfaces, not a substitute for product identity.

## What this document does not claim

- It does not assert any hidden production infrastructure beyond what is documented locally.
- It does not force an immediate repo restructure.
- It does not merge products under one UI or one deploy surface.

## Immediate use

Use this document as the source of truth when explaining the ecosystem in:
- onboarding
- repo handovers
- architecture discussions
- future `unalabs.cloud` product/navigation planning
- decisions about whether a new capability belongs in a product, a package, or an extension
