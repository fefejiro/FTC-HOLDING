# M2-M5 Lightweight Implementation Plan

Use `NEXT-24H-EXECUTION-BOARD.md` as the active execution queue.
This file remains the structured sequencing reference for M2-M5 scaffolding.

Last updated: 2026-05-06
Owner: anion web lane
Scope: structured scaffolding only, no production feature completion

## Guardrails
- Keep stack fixed: Next.js App Router, Supabase, Stripe, Daily.
- No new dependencies unless required to unblock validation.
- Prefer typed contracts and explicit placeholder responses over hidden assumptions.
- Every placeholder route must be safe-by-default and non-production marked.

## M2: Booking System (Foundation)
### Work package M2-WP1: Booking contracts and route map
Actions:
- Define booking lifecycle states and request/response contracts in shared app types.
- Reserve API route surface for discovery, booking creation, and booking state reads.
- Return non-production placeholders with clear upgrade TODOs.

Acceptance criteria:
- Contracts compile under strict TypeScript.
- Route map is documented and linked from roadmap execution notes.
- Placeholders return deterministic JSON shape and non-2xx where feature is not implemented.

### Work package M2-WP2: Data seam definition
Actions:
- Define Supabase table seams (bookings, availability windows, role links) in implementation notes.
- Document validation boundary: input validation in route layer, policy validation in DB/RLS.

Acceptance criteria:
- Ops notes include minimal table and RLS seam checklist.
- No production DB writes added in this scaffolding pass.

## M3: Billing (Stripe)
### Work package M3-WP1: Checkout and portal scaffolds
Actions:
- Add `/api/billing/checkout` and `/api/billing/portal` placeholder POST routes.
- Add typed request/response contracts and request parsing stubs.
- Return `501` with stable contract payload and TODO pointers.

Acceptance criteria:
- Routes compile and are reachable in Next.js runtime.
- Contract types are importable from a single API types module.
- Responses include `ok`, `placeholder`, `code`, and `message` fields.

### Work package M3-WP2: Webhook contract hardening seam
Actions:
- Upgrade existing `/api/webhooks/stripe` placeholder to typed event envelope contract.
- Validate minimal headers/body presence without performing signature verification yet.

Acceptance criteria:
- Route returns `400` for malformed payload and `501` for valid placeholder path.
- TODO marker identifies required production upgrades (signature verify + idempotency + sync).

## M4: Live Classroom (Daily)
### Work package M4-WP1: Room token issuance contract scaffold
Actions:
- Upgrade `/api/daily/room` placeholder to typed token issuance request/response.
- Add validation stubs for booking id, participant role, and user id.
- Keep issuance disabled (`501`) until server auth + Daily credentials are wired.

Acceptance criteria:
- Invalid requests return `400` with structured validation errors.
- Valid-shaped requests return deterministic placeholder payload.
- Route clearly marked non-production.

## M5: Operations + QA Stabilization
### Work package M5-WP1: Smoke test baseline
Actions:
- Add a starter smoke test checklist doc covering auth, booking seam, billing seam, daily seam, and deployment health.
- Keep checklist executable manually without adding test framework dependencies.

Acceptance criteria:
- Checklist is short, actionable, and can be run before each release candidate.
- Each step has expected result and pass/fail recording field.

### Work package M5-WP2: Operational status endpoint
Actions:
- Add minimal `/api/status` endpoint exposing phase readiness summary.
- Ensure endpoint is safe for public diagnostics and does not expose secrets.

Acceptance criteria:
- Endpoint returns `200` with static scaffold status map.
- Includes explicit placeholder flags for M2-M5.

## Definition of done for this pass
- Plan document exists and is reviewed in ops lane.
- M3/M4/M5 scaffolds merged without behavior regressions.
- `npm run check` and `npm run build` pass.
