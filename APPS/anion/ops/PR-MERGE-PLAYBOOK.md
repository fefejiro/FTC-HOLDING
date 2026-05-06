# Anion Release Integration Playbook (53-58)

## Current PRs
- #53 P0 security hardening
- #54 trust docs pack
- #55 e2e + CI lane
- #56 CI isolation for Anion lane
- #57 Daily retry + Stripe recovery
- #58 observability baseline

## Recommended merge order
1. PR #53
2. PR #57
3. PR #58
4. PR #55
5. PR #56 (selective workflow-only)
6. PR #54

## Why this order
- #53 establishes mandatory security controls (rate limiting, webhook idempotency, audit trail).
- #57 layers resilience (Daily retry + webhook failure capture/replay) on top of #53.
- #58 adds request correlation and structured logging across the same critical APIs.
- #55 fixes broken auth utilities and adds smoke/CI quality gates.
- #56 is taken selectively for workflow isolation (`.github/workflows/ci.yml` path scoping only).
- #54 is docs-heavy and safest to apply last after runtime behavior is finalized.

## Keep/Drop matrix (this integration PR)
- Keep from #53: API security hardening files + migration `20260508_000005`.
- Keep from #54: trust/ops docs, plus one final `ops/CLIENT-HANDOVER.md` and `ops/status-summary.json`.
- Keep from #55: auth utility fixes, smoke test baseline, Anion workspace scripts.
- Keep from #56: only CI isolation updates needed for Anion lane; drop duplicate/noisier docs.
- Keep from #57: retry utility, replay script/runbook, migration `20260509_000006`, merged into shared API handlers.
- Keep from #58: logger/request-id + observability doc + merged API instrumentation.
- Drop from all PRs: redundant/no-op edits and broad `package-lock.json` rewrites not required by final dependency set.

## Owner merge + deploy order
1. Merge this integration PR to `main`.
2. Confirm required checks green: `anion-web-ci / Typecheck & Build`, `anion-web-ci / E2E Smoke`.
3. Apply pending Supabase migrations in order (`000005` then `000006`) in production.
4. Configure all external blockers in `ops/CLIENT-HANDOVER.md` (Stripe, Daily, Supabase, Cloudflare).
5. Deploy worker: `npm run build:worker --workspace APPS/anion` then `npm run deploy:worker --workspace APPS/anion`.
6. Execute post-deploy smoke flow (login redirect, pricing, checkout auth gate, Daily room token path).
7. If Stripe webhook failures exist, follow `ops/STRIPE-WEBHOOK-RECOVERY.md` replay flow.

## Guardrails
- Before merge and after deploy, run:
  - `npm run check --workspace APPS/anion`
  - `npm run build --workspace APPS/anion`
- If lockfile drift appears, regenerate once and keep only dependency changes required by final merged scripts/deps.
