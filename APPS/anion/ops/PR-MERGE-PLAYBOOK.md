# Anion Copilot PR Merge Playbook (52-55)

## Current PRs
- #52 handover polish
- #53 P0 security hardening
- #54 trust docs pack
- #55 e2e + CI lane

## Recommended merge order
1. PR #53
2. PR #55
3. PR #54
4. PR #52 (selective/cherry-pick only)

## Why this order
- #53 introduces runtime security controls and migration baseline.
- #55 adds test/CI gates and fixes auth import issues.
- #54 is docs-heavy and low runtime risk.
- #52 overlaps with #54 on `ops/CLIENT-HANDOVER.md` and `ops/status-summary.json` and includes broad lockfile churn; treat as selective.

## Selective strategy for PR #52
- Keep only valuable deltas not already present in #54:
  - `.env.example` Stripe price vars if still missing
  - any non-conflicting runbook improvements
- Avoid taking massive `package-lock.json` rewrite unless dependency graph truly changed.

## Guardrails
- After each merge/cherry-pick run:
  - `npm run check --workspace APPS/anion`
  - `npm run build --workspace APPS/anion`
- If lockfile conflict occurs, regenerate once from root with `npm install` and commit minimal lockfile update.
