# ADR 0001: Platform Stack Lock for Anion Web

Status: accepted
Date: 2026-05-05
Decision owners: FTC delivery + client approval

## Context
Anion was scaffolded as a Vite + React SPA while project direction committed to a locked stack of Next.js, Cloudflare, Supabase, Stripe, and Daily React.

The mismatch created risk in:
- Server-side route ownership for Stripe webhooks and Daily token issuance.
- Long-term operational consistency for deployment and CI.
- Reusability of Anion as an FTC product asset.

## Decision
Adopt and enforce this stack for the primary web lane:
- Framework: Next.js App Router
- Hosting/runtime: Cloudflare Workers via OpenNext adapter
- Data/auth backend: Supabase
- Payments: Stripe only (for this phase)
- Live classroom: Daily React
- Mobile scope: deferred until web reaches stable M5, unless client requirements force earlier inclusion

## Rejected Alternatives
1. Keep Vite SPA + separate Worker backend
- Rejected due to split operational surface and avoidable architecture overhead for this phase.

2. Use legacy Pages-specific adapter path
- Rejected due to explicit deployment direction to use OpenNext adapter.

## Consequences
Positive:
- Cleaner server route ownership for billing and live-class tokens.
- Unified stack for faster onboarding and reproducibility.
- Better long-term productization path.

Tradeoffs:
- One-time migration cost in M0.
- Need to maintain OpenNext and Wrangler deployment contract.

## Implementation Notes
- M0 is mandatory before M1 feature delivery.
- Any proposed vendor or architecture additions require explicit approval and a new ADR.
