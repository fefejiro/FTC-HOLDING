# Garden Cleaners Premium Completion Handoff (2026-05-06)

## Executive Summary
Garden Cleaners is production-capable and client-facing, with premium structure already in place (content architecture, media quality, quote pipeline, portal route, and structured SEO).

The remaining work is mostly premium polish + operations activation, not a full rebuild.

## Verified Complete (Code-Backed)

1. Premium homepage structure and messaging are implemented.
- 3-step workflow, estimate framework, regional coverage, and service standards are live.
- Source: app/garden-cleaners/page.tsx

2. Portal route exists and is wired into the site flow.
- Source: app/garden-cleaners/portal/page.tsx

3. Contact identity is no longer placeholder.
- Current phone and email are real values in config.
- Source: lib/gardenCleaners.ts

4. Quote capture pipeline persists to database.
- Inserts into garden_cleaners_quotes.
- Source: app/api/garden-cleaners-quote/route.ts

5. Quote form analytics lifecycle is implemented.
- Events present: garden_quote_submit_attempt, garden_quote_submit_success, garden_quote_submit_error.
- Source: app/components/garden-cleaners/GardenQuoteForm.tsx

6. SEO + schema baseline is in place.
- Metadata helper, canonical support, HouseCleaning + FAQ JSON-LD.
- Sources: lib/gardenCleaners.ts, app/garden-cleaners/page.tsx

## Pending Premium Tasks (Actionable)

### P0 (Do First)

1. Replace testimonial placeholders with approved proof.
- Current testimonials use generic initials and draft-style social proof.
- Owner: Client + Content
- File: lib/gardenCleaners.ts

2. Activate production lead routing endpoints.
- Configure GARDEN_CLEANERS_QUOTE_WEBHOOK_URL in deployment env.
- Configure RESEND_API_KEY and GARDEN_CLEANERS_ADMIN_EMAIL (avoid fallback address behavior).
- Owner: DevOps
- File: app/api/garden-cleaners-quote/route.ts

3. Lock official brand package if available.
- Apply approved wordmark/color refinements (if client has final assets).
- Owner: Design + Frontend
- Primary file: lib/gardenCleaners.ts

### P1 (Premium Growth Layer)

1. Google Business Profile setup and optimization.
- Owner: Growth/SEO

2. Recurring booking path hardening (conversion-first flow).
- Owner: Product + Frontend

3. Durham Region expansion assets/pages/targeted funnel support.
- Owner: Growth + Content

### P1 (Analytics Contract Gap)

Documented portal CTA events are now implemented in source:
- garden_portal_cta_click
- garden_portal_region_quote_click
- garden_portal_sticky_click

Status:
- Completed on 2026-05-06.
- Source: app/components/garden-cleaners/GardenPortalAccessPanel.tsx
- Existing event coverage now includes:
  - garden_portal_entry_click
  - garden_portal_cta_click
  - garden_portal_region_quote_click
  - garden_portal_sticky_click
  - garden_quote_submit_attempt
  - garden_quote_submit_success
  - garden_quote_submit_error

Owner: Frontend + Analytics (verification in dashboard still required)
Reference docs:
- DOCS/archive/GARDEN_PORTAL_ANALYTICS_EVENT_MAP.md
- DOCS/archive/GARDEN_PORTAL_REPORTING_BASELINE.md

## Build Validation Note

- Attempted build command: npm --prefix APPS/ftc-site run build
- Result: blocked by unrelated pre-existing workspace issue in PACKAGES/auth/src/index.ts (window type reference in package build)
- Impact: no Garden Cleaners file type or lint error detected in the changed portal component.

## Decision: Premium Readiness

- Product is "Premium Functional" now.
- Product is not yet "Premium Complete" until P0 items are closed.

## 48-Hour Close Plan

1. Day 1
- Replace testimonials with approved real proof.
- Set webhook/email env vars in production.
- Run one live quote submission and verify persistence + notifications.

2. Day 2
- Validate event flow in analytics dashboard.
- Publish a short client-facing release note with before/after conversion instrumentation status.

## Client-Safe Status Line

Garden Cleaners is live and operating with premium service structure. Remaining tasks are final trust polish (real proof), production notification wiring, and full portal analytics instrumentation.
