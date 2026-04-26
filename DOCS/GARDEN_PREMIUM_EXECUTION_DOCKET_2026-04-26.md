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
- Current workspace does not contain `APPS/ftc-site/app/garden-cleaners/portal/page.tsx`.
- Decision required before Phase 5+ portal work:
  1. create and ship portal route in `ftc-site`, or
  2. remove portal references from event/report docs until route exists.

Recommendation: create and ship the portal route so reporting docs stay canonical.

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

## Command Baseline

```powershell
npm --prefix APPS/ftc-site run build
npm run qa:portfolio:e2e
```

## Go / No-Go Gate Before Build Sprint

Proceed to heavy implementation only when all are true:

1. Portal route decision is closed (route shipped or docs corrected).
2. Schema pack is accepted as canonical for content, analytics, and portal data.
3. P0 test matrix is automated or scripted with explicit pass/fail output.
4. Build and deploy runbook remains green after schema and route changes.

## Recommended Next Move

Run a short final planning pass (half day to one day) focused only on:

1. portal route decision,
2. schema field lock,
3. E2E ownership and pass criteria.

Then begin implementation immediately with lower risk and less rework.