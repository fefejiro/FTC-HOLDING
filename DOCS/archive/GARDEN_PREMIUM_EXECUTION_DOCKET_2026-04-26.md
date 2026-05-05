# Garden Premium Execution Docket (2026-04-26)

## Purpose

Tie Garden Cleaners documentation into one execution-ready source before additional build work.

This docket captures:
- current verified implementation state,
- premium upgrade scope,
- schema pack needed for safe implementation,
- end-to-end test matrix,
- go/no-go gates for build start.

## Current Verified State

- Garden website routes are live in code:
  - `/garden-cleaners`
  - `/garden-cleaners/about`
  - `/garden-cleaners/services`
  - `/garden-cleaners/contact`
  - `/garden-cleaners/quote`
- Quote API route exists: `/api/garden-cleaners-quote`.
- Image hardening update shipped:
  - stable object-fit behavior in `GardenImagePanel.tsx`
  - WebP assets added under `public/images/garden-cleaners`
  - media config updated to WebP source paths.
- Analytics and reporting docs define a regional portal funnel contract.

## Known Gap To Resolve Before Heavy Build

- Documentation references `/garden-cleaners/portal` in analytics docs.
- Gap status: resolved by shipping `APPS/ftc-site/app/garden-cleaners/portal/page.tsx` and adding route checks.

## Locked Decisions (Closed)

1. Portal route decision: locked to ship now.
  - Implemented route: `/garden-cleaners/portal`.
  - Implemented analytics CTA attributes:
    - `garden_portal_cta_click`
    - `garden_portal_region_quote_click`
    - `garden_portal_sticky_click`
2. Schema lock decision: locked in code.
  - Canonical shared contracts: `APPS/ftc-site/lib/gardenContracts.ts`.
  - Quote payload, analytics payload fields, and portal domain enums/types are now explicit.
3. P0 E2E ownership and pass gates: locked.
  - Config owner: `tests/e2e/portfolio-sites.json`.
  - Runtime owner: `scripts/run-portfolio-e2e.mjs`.
  - Garden route gate now includes `/garden-cleaners/portal/`.

## Premium Upgrade Scope (Garden Only)

### Website

- Premium information architecture:
  - stronger hero value proposition,
  - 3-step service workflow,
  - trust signal density,
  - clearer service depth,
  - transparent pricing anchors,
  - regional coverage section,
  - stronger proof and FAQ conversion support.
- Media and thumbnail normalization:
  - strict aspect wrappers,
  - no stretched images,
  - service-card thumbnails,
  - social preview images,
  - portal tile thumbnails.
- SEO and SERP uplift:
  - route-level metadata quality,
  - social preview metadata,
  - LocalBusiness and Service schema,
  - breadcrumb schema,
  - canonical consistency,
  - sitemap and robots validation.

### Portal

- Auth-gated client and staff shells.
- Client lane: request timeline, quote and status visibility.
- Staff lane: intake queue, assignment controls, region workflow starter.

## Schema Pack (Build Contract)

## 1) Content Section Schema (page composition contract)

```json
{
  "pageKey": "garden_home",
  "version": 1,
  "sections": [
    {
      "id": "hero",
      "kind": "hero",
      "headline": "string",
      "subheadline": "string",
      "primaryCta": { "label": "string", "href": "string" },
      "secondaryCta": { "label": "string", "href": "string" },
      "media": { "src": "string", "alt": "string", "aspect": "16:9" }
    }
  ]
}
```

## 2) Analytics Event Schema (canonical payload)

```json
{
  "event": "garden_portal_cta_click",
  "location": "portal_hero",
  "label": "request_regional_quote",
  "href": "/garden-cleaners/quote",
  "surface": "garden",
  "page": "/garden-cleaners/portal",
  "ts": "ISO-8601"
}
```

Rules:
- `event`, `location`, and `label` are required for click events.
- Form lifecycle events must include `result` and `errorCode` when applicable.

## 3) Portal Domain Schema (minimum relational model)

```json
{
  "quotes": {
    "id": "uuid",
    "clientEmail": "string",
    "region": "string",
    "serviceNeeded": "string",
    "status": "new|triaged|scheduled|completed|cancelled",
    "createdAt": "timestamp"
  },
  "portalUsers": {
    "id": "uuid",
    "role": "client|staff|admin",
    "email": "string",
    "createdAt": "timestamp"
  },
  "assignments": {
    "id": "uuid",
    "quoteId": "uuid",
    "staffUserId": "uuid",
    "assignedAt": "timestamp"
  }
}
```

## End-To-End Test Matrix (Required Before Broad Build)

## P0 (revenue and trust critical)

1. Home to quote CTA path works and returns 200.
2. Quote form validation blocks invalid payloads and shows clear error.
3. Quote submit success path returns success state.
4. Quote submit error path returns error state and does not silently fail.
5. Garden media renders without distortion on mobile/tablet/desktop.
6. Canonical metadata and title/description are present on all Garden routes.

## P1 (quality hardening)

1. Event chain emits intent -> attempt -> success/error with expected payload fields.
2. Service cards and preview thumbnails remain sharp at all breakpoints.
3. Sitemap includes all intended Garden public routes.
4. Portal route behavior is consistent for trailing and non-trailing slash.

## P0 E2E Ownership and Pass Criteria

1. Ownership
  - Test matrix source of truth: `tests/e2e/portfolio-sites.json`.
  - Execution engine and report output: `scripts/run-portfolio-e2e.mjs`.
  - Build gate operator: deploy owner on duty.
2. Pass criteria
  - All Garden P0 route checks return an allowed status.
  - `home` check title includes `Garden Cleaners`.
  - `portal` check title includes `Regional Portal`.
  - Any route failure blocks release promotion until resolved.

## Command Baseline

```powershell
npm --prefix APPS/ftc-site run build
npm run qa:portfolio:e2e
```

## Go / No-Go Gate Before Build Sprint

Proceed to heavy implementation only when all are true:

1. Portal route decision is closed (route shipped).
2. Schema pack is accepted as canonical for content, analytics, and portal data.
3. P0 test matrix is automated or scripted with explicit pass/fail output.
4. Build and deploy runbook remains green after schema and route changes.

## Execution Status

- Final planning pass complete.
- Three low-risk decisions are locked and implemented.
- Homepage premium sections now include workflow, estimate anchors, regional coverage, and service standards.
- Services page now includes service-selection guidance and quote pricing anchors.
- Portal route now includes authenticated session checks, role-based lane unlocks, and live project record loading for client and operations contexts.
- Authenticated portal data wiring is active with dedicated sign-in entry (password + magic link), guarded staff/admin status transitions, queue refresh control, and status/search filtering.
- Portal lane now includes schema-safe derived routing intelligence: inferred region tags, inferred owner labels, and region-level queue filtering without requiring new database columns.
- Added migration `202604260004_garden_queue_routing_fields.sql` introducing `projects.service_region` and `projects.assigned_owner` for first-class queue routing and staff ownership.
- Added migration `202604260005_backfill_garden_routing_fields.sql` to auto-backfill region and owner values from existing project name/description data.
- Added migration `202604260006_garden_routing_constraints.sql` to enforce canonical persisted `service_region` values at schema level.
- Portal queue loader now prefers persisted `service_region` / `assigned_owner` fields and automatically falls back to legacy inference when columns are not yet deployed.
- Staff/admin operations now include an "Assign to me" action that writes `assigned_owner` when schema is available.
- Staff/admin operations now include per-record region editing with "Save region" to persist `service_region` directly from queue cards.
- Queue writes now use optimistic update + rollback behavior and return explicit rollout guidance when `service_region` / `assigned_owner` columns are missing.
- Role guardrails are now explicit: admin can complete jobs and save region, staff can triage/schedule and self-assign ownership.
- Added deployment runbook `DOCS/GARDEN_PORTAL_ROUTING_DEPLOYMENT_RUNBOOK.md` with ordered rollout and rollback guidance.
- Added postdeploy SQL checks `scripts/garden-routing-postdeploy-verification.sql` for schema, constraint, and data-quality verification.
- Remaining work is optional: replace inferred region/owner with explicit persisted fields when schema expansion is approved.