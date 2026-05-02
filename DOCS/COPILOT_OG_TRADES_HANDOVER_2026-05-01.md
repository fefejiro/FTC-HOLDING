# Copilot Handover - OG Trades Academy

Date: 2026-05-01  
Project: OG Trades Academy / OG Trades lane  
Audience: GitHub Copilot / Agent Mode / implementation agents  
Authority: Codex CTO lane validates before commit or production/client-facing claims

## Purpose

This document gives Copilot the current operating context for the OG Trades lane so it does not confuse it with Dispatch, Garden Cleaners, or Una Labs core.

OG Trades is not the same as Dispatch.

## CTO / Dev Authority Model

The CTO lane decides:

- scope
- GO/HOLD/NO-GO
- canonical URL readiness
- QA acceptance
- commit approval
- deployment/handoff claims

Copilot/Agent Mode is a bounded implementation worker.

Copilot must:

- inspect exact files first
- keep edits scoped to OG Trades files/docs unless instructed otherwise
- run requested checks
- report facts
- wait for CTO approval before commit

Copilot must not:

- merge Dispatch assumptions into OG Trades
- broaden into Garden/SayWetin
- mark live/ready without URL and QA proof
- stage unrelated files
- commit without explicit instruction

## Current Status

Current OG Trades status:

- Status: PENDING / HOLD
- Reason: canonical URLs, live QA, and telemetry enablement need confirmation.
- Public pages/components exist in `APPS/ftc-site`.
- Lead API route exists.
- Portfolio E2E docs list OG Trades as pending until canonical URLs/domain cutover are confirmed.

Do not claim OG Trades is production-handoff-ready until live URLs and QA are proven.

## Important OG Trades Files

Likely public/app files:

```text
APPS/ftc-site/app/og-trades-academy
APPS/ftc-site/app/og-trades-academy-home/page.tsx
APPS/ftc-site/app/work/og-trades-academy/page.tsx
APPS/ftc-site/app/components/og-trades/
APPS/ftc-site/app/api/og-trades-leads/route.ts
```

Important portfolio/status docs:

```text
DOCS/UNALABS_E2E_AUTOMATION_HANDOVER.md
DOCS/UNALABS_E2E_REPEATABLE_TEST_PLAN.md
DOCS/FTC_PROJECT_LEDGER.md
ops/project-status.json
ops/delivery-ledger.jsonl
```

Related but separate:

```text
APPS/dispatch
DOCS/DISPATCH_403_ACCESS_AUDIT.md
```

Do not treat Dispatch as OG Trades unless the task explicitly says Dispatch.

## Known OG Trades Context

From portfolio E2E docs:

- Garden Cleaners is active.
- OG Trades Academy is ready to enable/pending.
- OG Trades requires canonical URL confirmation/domain cutover before enabling in telemetry.

Known routes/pages from repo search:

```text
/og-trades-academy
/og-trades-academy-home
/og-trades-academy/about
/og-trades-academy/community
/og-trades-academy/contact
/og-trades-academy/course
/og-trades-academy/resources
/work/og-trades-academy
/api/og-trades-leads
```

These routes must be verified before any GO claim.

## OG Trades Current Plan

Goal:

- Establish the real current state of OG Trades Academy and prepare it for portfolio E2E/live QA.

Steps:

1. Inspect existing OG Trades pages/components/API route.
2. Confirm canonical public URL/domain.
3. Confirm which routes should be live.
4. Run local build for `APPS/ftc-site`.
5. Run live smoke/E2E if URL is available.
6. Enable/update OG Trades in portfolio E2E config only after URL proof.
7. Update telemetry:
   - `ops/project-status.json`
   - `ops/delivery-ledger.jsonl`
   - `DOCS/FTC_PROJECT_LEDGER.md`
8. Commit only OG Trades/status files after CTO approval.

## OG Trades QA Acceptance

Before moving from HOLD to GO:

- canonical URL returns 200
- main route renders OG Trades branding
- primary CTA works
- contact/lead route or form works
- `/api/og-trades-leads` behavior is verified safely
- no secrets exposed
- portfolio E2E is enabled or updated
- docs/status reflect actual result

## Dispatch Boundary

Dispatch current status is HOLD and separate.

Dispatch files:

```text
APPS/dispatch
DOCS/DISPATCH_403_ACCESS_AUDIT.md
```

Dispatch issue:

- local server blocked by `DATABASE_URL is required`
- 403 verification depends on runtime env and token-flow production QA

Do not change Dispatch files during OG Trades work unless explicitly assigned.

## Standard OG Trades Dev Workflow

Use this format:

```text
Task:
Files inspected:
Files changed:
Commands run:
Results:
- build:
- typecheck:
- live QA:
- E2E:
Project status:
- GO/HOLD/NO-GO:
- blockers:
Unrelated changes left untouched:
Commit status:
```

## OG Trades Do Not Do

- Do not claim domain cutover is complete without live URL proof.
- Do not enable E2E against guessed URLs.
- Do not edit Garden/SayWetin/Dispatch during OG Trades task.
- Do not stage all changes.
- Do not commit without CTO approval.
- Do not expose keys or form webhook secrets.

