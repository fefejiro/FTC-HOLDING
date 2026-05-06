# Anion Agent Operating Rules

These are the primary agent instructions for this repository.

## Project identity

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

- Program Director: planning, sequencing, handoff, ADR discipline
- Web Builder: app routes, dashboards, auth, Supabase wiring, booking flows
- Billing and Access: Stripe checkout, webhooks, entitlement logic
- Live Classroom: Daily React, session flows, collaboration features
- QA and Release: tests, regressions, release readiness, acceptance checks

## Current execution order

- M1: auth, role resolution, dashboard routing, Supabase profile wiring
- M2: tutor directory, booking flow, session records
- M3: billing and access control
- M4: Daily lesson room
- M5: real time collaboration, QA hardening, release gating
