# PR-001: Current State Cleanup

Status: draft
Owner: delivery steward
Date: 2026-05-05

## Scope
- Confirm and freeze platform decisions approved by stakeholder.
- Remove conflicting guidance that assumed a legacy Pages-specific adapter.
- Define M0 phase as a mandatory gate before M1 feature work.
- Establish roadmap and ADR baseline for durable architecture governance.

## Changes
- Added governance roadmap with M0 through M5 phases.
- Added ADR documenting stack lock:
  - Next.js App Router
  - Cloudflare Workers via OpenNext adapter
  - Supabase as primary data/auth backend
  - Stripe as sole payment rail in this phase
  - Daily React as live classroom stack
  - Mobile deferred until web reaches stable M5
- Added M0 work breakdown and success criteria.

## Why This PR Exists
The repository had strong scaffolding but no hard architecture lock in execution docs. This PR removes ambiguity so implementation does not drift.

## Validation
- Manual review of decision coverage against approved directives.
- No runtime code changes in this PR.

## Follow-up PR
- PR-002: M0 Platform Realignment (Next.js migration + OpenNext + CI baseline).
