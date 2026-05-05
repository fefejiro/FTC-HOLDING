# FTC HOLDING Agent Routing

This monorepo contains multiple FTC apps, product experiments, client delivery lanes, and shared packages. Treat it like a portfolio operating system, not a single app.

## How to use this file

Use this file as the first routing layer when working in GitHub Copilot agent mode or VS Code agent mode.

1. Identify the app or package you are touching.
2. Load the nearest app-specific `AGENTS.md` if one exists.
3. Load the relevant `SKILL.md` files before acting.
4. Keep changes scoped to one delivery lane unless the task explicitly spans multiple areas.

## Path routing

- `APPS/anion/` → load `APPS/anion/AGENTS.md`
- `APPS/anion/` → preferred skills:
  - `skills/anion-program-director/SKILL.md`
  - `skills/anion-web-builder/SKILL.md`
  - `skills/anion-billing-access/SKILL.md`
  - `skills/anion-live-classroom/SKILL.md`
  - `skills/anion-qa-release/SKILL.md`
- repo-wide orchestration or lane coordination → also load `skills/ftc-multi-agent-orchestration/SKILL.md`
- repo structure unclear, prior work failed, or validation is needed → also load `skills/ftc-cli/SKILL.md`

## Monorepo rules

- Do not make unrelated edits.
- Do not change secrets, credentials, or deployment settings unless explicitly instructed.
- Do not introduce new vendors or dependencies unless required and justified.
- Prefer small, reviewable pull requests.
- Keep docs, tests, and implementation in sync.
- Do not mark work complete without evidence.

## Pull request minimums

Every meaningful pull request should include:

- summary
- files changed
- testing performed
- risks
- follow-up recommendations

## Current Anion policy

Anion is a committed FTC client project and a reusable FTC product asset.

- web app first
- mobile deferred until web is stable or client scope changes
- locked stack: Next.js App Router, Cloudflare Workers via OpenNext, Supabase, Stripe, Daily React
- premium-quality execution required
