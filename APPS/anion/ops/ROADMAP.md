# Anion Delivery Roadmap

Last updated: 2026-05-26 (Daily classroom local contract update)
Primary production lane: anion web app

## Delivery Principles
- Stay on locked stack only: Next.js, Cloudflare Workers (OpenNext), Supabase, Stripe, Daily React.
- Keep work in reviewable phases with explicit entry/exit criteria.
- Do not accept architecture sprawl or unapproved vendor additions.
- Maintain ADR and changelog discipline on every significant platform decision.
- Do not report overall status as green while critical blockers in `ops/PRODUCTION-READINESS.md` are open.

## Active Production Closure Order (current)
1. Phase 1: Call production closure with authenticated evidence (parent visibility/denial, tutor join/rejoin, student join/rejoin) - currently blocked by missing valid confirmed production role test credentials and external config proof
2. Same-day truth alignment across runtime `/api/status` and governance docs
3. External production gates (Stripe, Daily, Supabase callback allow-list)
4. Background/theme finish only on validated call-flow surfaces
5. Hard verification for booking->call and billing->subscription sync
6. Final canonical go/no-go report

## M0: Platform Realignment (new mandatory gate)
Goal: Align repo foundations with approved production stack before feature build-out.

Status: Complete

Scope:
- Migrate anion from Vite SPA to Next.js App Router.
- Add canonical route structure for public and role-based authenticated areas.
- Add OpenNext Cloudflare Workers deployment setup.
- Add Tailwind and initial design token layer.
- Create Supabase migrations folder and first schema baseline.
- Clean and standardize environment variable contract.
- Add CI baseline for typecheck and build.

Exit criteria:
- App runs in Next.js dev mode.
- Production build succeeds.
- OpenNext build artifact generation succeeds.
- CI workflow exists and passes on branch.
- Migrations folder exists with initial schema migration.

## M1: Foundation Wiring
Goal: Authenticated role routing and base dashboards.

Status: Implemented in code; production closure still open

Scope:
- Supabase auth/session wiring and role resolution.
- Auth-gated layout and dashboard routing.
- Student, parent, tutor, operator dashboard shells.

Delivered:
- Auth-gated layout and dashboard role redirect are live.
- Login magic-link flow wired to /auth/callback.
- Callback route handles PKCE code exchange and token fallback path.
- Base role dashboards are scaffolded and route correctly after sign-in.

Remaining to close M1:
- Client-owned runtime env vars and any final environment allow-list updates.
- Manual auth smoke and role-routing verification during handoff.

## M2: Booking System
Goal: End-to-end tutor booking flow.

Status: Implemented in code; awaiting production-closure verification

Scope:
- Tutor discovery and filtering.
- Booking creation and lifecycle.
- Parent approval gates and tutor confirmations.

## M3: Billing
Goal: Production-safe billing with Stripe only.

Status: Implemented in code; blocked by external production configuration

Scope:
- Checkout session API route.
- Stripe webhook processing.
- Subscription state sync in Supabase.
- Billing portal and plan enforcement.

## M4: Live Classroom
Goal: Session-linked Daily React room flow.

Status: Implemented in code; local Daily contract green; Phase 1 production evidence still open

Scope:
- Daily room token issuance from server routes.
- Join readiness checks and room lifecycle state.
- Tutor and student session joins from booked classes.
- Parent booking visibility without Daily call participation.

## M5: Operations + QA Stabilization
Goal: Stable launch readiness for web lane.

Status: In progress (hard verification and canonical signoff pending)

Scope:
- Operator dashboard metrics and moderation.
- Testing baseline (unit + integration + e2e smoke).
- Reliability hardening and release checklist.

## Mobile Policy
anion-mobile is deferred until web lane achieves stable M5 readiness, unless client requirements explicitly pull mobile scope earlier.
