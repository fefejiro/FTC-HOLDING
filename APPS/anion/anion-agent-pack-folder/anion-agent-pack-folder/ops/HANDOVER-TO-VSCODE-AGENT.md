# VS Code Agent Mode Handover for Anion

Use this file when you switch into Agent Mode and want the next agent to continue from the right place.

## Current repo state

Treat the following as already true unless the repo proves otherwise:

- M0 platform realignment is complete
- `anion` is now the main web delivery lane
- Next.js App Router is the active runtime
- OpenNext and Cloudflare setup exist
- basic API route scaffolds exist for health, Daily room, and Stripe webhook
- a Supabase migrations folder exists
- CI baseline exists
- `anion-mobile` is deferred

## What not to redo

- do not recreate M0
- do not reintroduce Vite files
- do not switch away from the locked stack
- do not start mobile by default

## Immediate next milestone

### M1 foundation wiring

Goal:
A user can authenticate, resolve their role, and land on the correct dashboard.

Target outputs:
- Supabase server and browser client setup
- current user hook wired to real auth and profile data
- auth gated layout
- role based dashboard redirects
- initial tests for role guards and auth routing

## Open decisions to capture while working

If these are not resolved yet, document them clearly and do not guess silently:
- Supabase project target
- Cloudflare staging and production environment naming
- Stripe canonical product and price IDs
- Daily domain or account binding

## First prompt to use with Program Director

Read `AGENTS.md`, `.github/copilot-instructions.md`, `ops/ROADMAP.md`, and the ADRs.

Then inspect the repo and produce a short M1 execution plan with:
1. primary agent
2. reviewer agent
3. files expected to change
4. acceptance criteria
5. definition of done
6. blockers or approvals needed

Do not restart M0. Continue from the current repo state.

## First prompt to use with Web Builder

Implement M1 only.

Wire Supabase auth and profile resolution into the current Next.js App Router structure.
Add role based redirects and dashboard routing.
Keep changes reviewable.
Add test notes or tests for auth and role guard behavior.
Update relevant ops docs if implementation decisions change.

## First prompt to use with QA and Release

Review the M1 PR for:
- auth guard correctness
- role redirect correctness
- loading and failure states
- missing tests
- regressions against the locked stack
