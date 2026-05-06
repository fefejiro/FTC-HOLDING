# PR-002: M0 Platform Realignment

Status: draft
Owner: delivery steward
Date: 2026-05-05

## Scope
- Migrate anion web lane from Vite to Next.js App Router.
- Add Cloudflare Workers deployment path using OpenNext adapter.
- Introduce Tailwind and base design tokens.
- Initialize Supabase migrations directory and baseline schema file.
- Normalize env contract for Next.js server/client boundaries.
- Add CI baseline for check and build.

## Key Changes
- Added App Router structure under app/(public), app/(auth), and app/api.
- Added Next.js + OpenNext + Wrangler config and scripts.
- Added foundational global styles and token variables.
- Added migration scaffold at supabase/migrations/20260505_000001_init_foundation.sql.
- Updated README, roadmap, status docs, and release log for M0.
- Added GitHub Actions workflow scoped to anion and shared package paths.

## Out of Scope
- Full Supabase auth/profile wiring (M1)
- Booking lifecycle implementation (M2)
- Stripe checkout/webhook production logic (M3)
- Daily room token issuance and live session runtime (M4)
- Operator metrics and end-to-end QA hardening (M5)

## Validation Plan
- npm install in APPS/anion
- npm run check
- npm run build
- npm run build:worker

## Risks
- OpenNext package versions can move quickly; keep lockfile pinned and review on each upgrade.
- Cloudflare compatibility flags may require updates when using new Next.js features.
