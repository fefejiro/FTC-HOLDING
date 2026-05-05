# Anion Agent Operating Guide

Anion is now a committed client delivery and a reusable FTC product asset. Treat it like a production-bound app, not a casual experiment.

## Project identity

- project: Anion Class App
- lane: FTC client delivery + reusable education product infrastructure
- primary repo lane: `APPS/anion/`
- secondary lane: `APPS/anion-mobile/` deferred until web milestones are stable
- locked stack: Next.js App Router, Cloudflare Workers via OpenNext, Supabase, Stripe, Daily React

## Current status

- M0 platform realignment completed
- web app moved to Next.js App Router
- OpenNext and Cloudflare worker setup added
- Supabase migration scaffold added
- CI baseline added
- next major target: M1 auth, role routing, and dashboard guard wiring

## Agent roster

### 1. Anion Program Director
Owns roadmap, sequencing, dependency logic, ADR discipline, and scope control.

Load:
- `skills/anion-program-director/SKILL.md`
- `skills/ftc-multi-agent-orchestration/SKILL.md` when multiple lanes are active

### 2. Anion Web Builder
Owns dashboards, auth wiring, route structure, booking UI, and general web implementation.

Load:
- `skills/anion-web-builder/SKILL.md`

### 3. Anion Billing and Access
Owns Stripe checkout, webhook logic, subscriptions, promo codes, and gated access.

Load:
- `skills/anion-billing-access/SKILL.md`

### 4. Anion Live Classroom
Owns Daily React, session lifecycle, lesson-room UX, and real-time collaboration features.

Load:
- `skills/anion-live-classroom/SKILL.md`

### 5. Anion QA and Release
Owns test plans, regression checks, release evidence, and launch gating.

Load:
- `skills/anion-qa-release/SKILL.md`

## Routing rules

- one issue = one primary agent owner
- one issue = one checker or reviewer agent
- no issue starts without acceptance criteria
- no PR is complete without testing notes
- no milestone work should begin out of dependency order

## Milestone order

- M0 Platform realignment
- M1 Auth and role routing
- M2 Booking flow
- M3 Billing and access control
- M4 Live lesson room
- M5 Real-time collaboration
- M6 Operator dashboard and QA hardening
- M7 Launch candidate and release readiness

## Definitions of done

Every meaningful task must include:

- scope
- owner agent
- checker agent
- milestone
- files expected to change
- acceptance criteria
- test notes
- risks or follow-up items

## Guardrails

- do not introduce new vendors without approval
- do not drift from the locked stack
- do not let mobile scope pull focus from web delivery
- do not call placeholder UI complete
- do not merge features without at least smoke-level verification
- do not change billing or auth assumptions without updating ADRs

## Required docs to maintain

- `APPS/anion/ops/ROADMAP.md`
- `APPS/anion/ops/AUDIT-2026-05-05.md`
- `APPS/anion/ops/adr/`
- `APPS/anion/ops/release-log.md`
- `APPS/anion/ops/weekly-status.md`
- `APPS/anion/ops/status-summary.json`
- `APPS/anion/ops/AGENT-HANDOFF.md`

## Resume point for the next agent

Unless a newer handoff doc says otherwise, continue from:

- M1 auth and role routing
- wire Supabase server and browser clients
- implement auth-gated layout
- implement role-based dashboard redirects
- connect current-user logic to real session and profile data
- add initial tests for role guards and auth routing

## When repo structure is unclear

Before guessing, also load:

- `skills/ftc-cli/SKILL.md`
