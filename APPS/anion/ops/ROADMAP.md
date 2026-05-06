# Anion Delivery Roadmap

Last updated: 2026-05-06
Primary production lane: anion web app

## Delivery Principles
- Stay on locked stack only: Next.js, Cloudflare Workers (OpenNext), Supabase, Stripe, Daily React.
- Keep work in reviewable phases with explicit entry/exit criteria.
- Do not accept architecture sprawl or unapproved vendor additions.
- Maintain ADR and changelog discipline on every significant platform decision.

## M0: Platform Realignment (new mandatory gate)
Goal: Align repo foundations with approved production stack before feature build-out.

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

Status: In progress (core auth flow implemented; hardening in cleanup)

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
- Apply and verify RLS policies in target Supabase environment.
- Remove temporary server-side service-role fallback in user resolution.
- Confirm callback redirect allow-list is correctly set for all environments.
- Re-run unattended auth smoke with policy-only reads.

## M2: Booking System
Goal: End-to-end tutor booking flow.

Status: Not started

Scope:
- Tutor discovery and filtering.
- Booking creation and lifecycle.
- Parent approval gates and tutor confirmations.

## M3: Billing
Goal: Production-safe billing with Stripe only.

Status: Not started

Scope:
- Checkout session API route.
- Stripe webhook processing.
- Subscription state sync in Supabase.
- Billing portal and plan enforcement.

## M4: Live Classroom
Goal: Session-linked Daily React room flow.

Status: Not started

Scope:
- Daily room token issuance from server routes.
- Join readiness checks and room lifecycle state.
- Tutor and student session joins from booked classes.

## M5: Operations + QA Stabilization
Goal: Stable launch readiness for web lane.

Status: Not started

Scope:
- Operator dashboard metrics and moderation.
- Testing baseline (unit + integration + e2e smoke).
- Reliability hardening and release checklist.

## Mobile Policy
anion-mobile is deferred until web lane achieves stable M5 readiness, unless client requirements explicitly pull mobile scope earlier.
