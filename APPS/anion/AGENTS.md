# Anion Agent Operating Rules

These are the primary agent instructions for this repository.

## Product and delivery context

Anion Class App is an FTC client committed, production bound education platform built as a reusable FTC product asset.

## Locked stack

- Next.js App Router
- Cloudflare Workers via OpenNext
- Supabase
- Stripe
- Daily React

## Delivery rules

1. Build the web app first. Do not pull `anion-mobile` into active delivery unless the issue explicitly says so.
2. Treat M0 as already completed unless a regression is discovered.
3. Current active next milestone is M1 foundation wiring, auth, role resolution, and dashboard routing.
4. Every issue must have:
   - one primary owner
   - one reviewer
   - acceptance criteria
   - definition of done
   - milestone tag
5. Every meaningful change must update at least one of these when applicable:
   - `ops/ROADMAP.md`
   - `ops/weekly-status.md`
   - `ops/release-log.md`
   - `ops/adr/`
6. No new vendors or architectural pivots without an ADR and approval.
7. Prefer premium execution quality over rushed placeholder work.
8. Leave the repo cleaner than you found it.

## Required behavior

- Read existing code first
- Check current milestone and ADRs before coding
- Respect path specific instructions in `.github/instructions/`
- Add tests or test notes for meaningful changes
- Do not mark work done if it is scaffold only
- Be explicit about assumptions, risks, and follow up work

## Routing model

| Agent | Role |
|-------|------|
| `anion-program-director` | Planning, sequencing, handoff, ADR discipline |
| `anion-web-builder` | App routes, dashboards, auth, Supabase wiring, booking flows |
| `anion-billing-access` | Stripe checkout, webhooks, entitlement logic |
| `anion-live-classroom` | Daily React, session flows, collaboration features |
| `anion-qa-release` | Tests, regressions, release readiness, acceptance checks |

## Current execution order

- **M1 (active):** auth, role resolution, dashboard routing, Supabase profile wiring → owner: `anion-web-builder`, reviewer: `anion-qa-release`
- **M2:** tutor directory, booking flow, session records → owner: `anion-web-builder`
- **M3:** billing and access control → owner: `anion-billing-access`
- **M4:** Daily lesson room → owner: `anion-live-classroom`
- **M5:** real time collaboration, QA hardening, release gating → owner: `anion-qa-release`

## How to start a session in agent mode

1. Invoke `@anion-program-director` first
2. Say: "Read AGENTS.md, ops/ROADMAP.md, and the ADRs. Inspect current repo state. Produce the M1 execution plan."
3. Director will assign tasks to specialist agents
4. After each agent completes a task block, invoke `@anion-qa-release` to review

## Quick-start prompts

**Resume delivery:**
> @anion-program-director Continue from where we left off. Read AGENTS.md and ops/ROADMAP.md and give me the current state and next task.

**Start M1:**
> @anion-web-builder Implement M1 only. Wire Supabase auth and profile resolution. Add role based redirects and dashboard routing. Keep changes reviewable. Add test notes.

**Review work:**
> @anion-qa-release Review the M1 changes for auth guard correctness, role redirects, loading/failure states, and regressions.
