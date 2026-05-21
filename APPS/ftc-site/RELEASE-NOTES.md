# Release Notes — FTC Site

## 2026-05-21 — Garden Cleaners GTA/Toronto SEO Expansion

### Summary

- Added a dedicated Toronto and GTA landing page for Garden Cleaners local-intent search coverage.
- Added GTA sub-location pages (Scarborough, North York, Etobicoke, Markham, Vaughan) to expand long-tail local search coverage.
- Expanded Garden metadata keyword targets to include Toronto and GTA cleaning terms.
- Improved search-engine crawl signals for Garden custom domain robots and sitemap behavior.
- Enriched GTA location pages with unique neighborhood content, service-use-case copy, FAQ entities, and local testimonial snippets.

### Changes

- `lib/gardenCleaners.ts`
  - Expanded `gardenCleanersKeywords` with Toronto/GTA local terms.
  - Added `gardenCleanersSeoAreas` for broader local service-area schema coverage.
  - Added Open Graph locale signal (`en_CA`) in Garden metadata.
- `app/garden-cleaners/toronto/page.tsx`
  - New static Toronto page with localized copy, CTA routing, and internal links to GTA sub-location pages.
  - Added JSON-LD `HouseCleaning` and `FAQPage` structured data.
- `app/garden-cleaners/gta/[location]/page.tsx`
  - Added static-generated GTA sub-location SEO pages for Scarborough, North York, Etobicoke, Markham, and Vaughan.
  - Added JSON-LD `HouseCleaning`, `BreadcrumbList`, `FAQPage`, and `Service` (review snippet) schema per local page.
  - Added location-specific neighborhood coverage lists, common request use-cases, and localized FAQ/testimonial content.
- `app/garden-cleaners/page.tsx`
  - Updated structured data `areaServed` to use SEO area list.
  - Added internal link to Toronto/GTA page from Garden homepage.
- `app/sitemap.ts`
  - Added `/garden-cleaners/toronto` and dynamic GTA sub-location entries for indexation.
- `app/robots.ts`
  - Added Garden custom-host branch so robots host/sitemap point to `gardencleaners.ca` when crawled on Garden domain.

### Validation

- File diagnostics on updated SEO files: clean.
- Production build completed successfully (`next build`) with new routes generated, including `/garden-cleaners/toronto` and `/garden-cleaners/gta/[location]` static paths.
- Targeted lint command still reports missing ESLint in this environment (`ESLint must be installed`).

## 2026-05-20 — Garden Portal Dashboard Premium Polish

### Summary

- Upgraded Garden portal dashboard presentation for customer, staff, and admin lanes with stronger visual hierarchy, status-driven scanning, and cleaner interaction affordances.
- Replaced remaining high-visibility inline UI styling in the portal workflow with reusable class-based styles for consistency and easier maintenance.
- Added subtle motion and emphasis patterns for dashboard widgets without changing the underlying business logic.

### UX Improvements

- **KPI hierarchy refinement:** Increased numeric prominence and improved metric readability with tabular number rendering in dashboard KPI cards.
- **Queue clarity:** Added status-toned queue card accents so pending, in-progress, and completed states are easier to scan at a glance.
- **Quotes conversion visibility:** Converted quote status text into status chips and upgraded quote conversion rows into structured cards.
- **Portal shell polish:** Improved spacing and visual rhythm across hero, session access, sticky action rail, and admin tab controls.
- **Admin panel continuity:** Completed class-based styling pass across user-management and audit sections for a more cohesive premium look.

### Motion & Interaction

- Added staggered fade-up reveal for dashboard sections on desktop/tablet.
- Added bar-grow animation for mini chart visualizations.
- Added subtle hover states for KPI cards, queue cards, quote conversion cards, and status chips.
- Disabled section-entry animations on narrow screens to preserve mobile responsiveness.

### Files Changed

- `app/components/garden-cleaners/GardenPortalAccessPanel.tsx`
  - Added status-chip rendering for quote conversion rows.
  - Added status-tone class mapping for queue cards.
- `styles/globals.css`
  - Added/extended Garden dashboard classes for premium visual system, interactions, and responsive safeguards.

### Validation

- `get_errors` on touched files: clean.
- Focused lint (`GardenPortalAccessPanel.tsx`): no new lint regressions from this polish pass; existing pre-existing `no-explicit-any` and one hook dependency warning remain in the component.

## 2026-05-08 — Auth Routing & Theme Restoration

### Fixed Issues

#### 1. Auth Routing: Non-admin users no longer misrouted to Garden portal
- **Problem:** All non-admin users logging in from `unalabs.cloud` were redirected to `https://gardencleaners.ca/portal`, causing brand confusion.
- **Root Cause:** `lib/authDestinations.ts` had a hard-coded fallback that only returned the Garden portal URL, ignoring the request origin.
- **Solution:** Updated `getDefaultPortalUrl()` to be origin-aware. It now checks the request host and routes accordingly:
  - Non-admin users from Garden domain → Garden portal
  - Non-admin users from Una Labs origin → `/products` (Una catalog)
- **Testing:** Verified with two accounts:
  - `mike.fejiro@gmail.com` (admin) → ops.unalabs.cloud ✓
  - `fejiro.efiuvwere@gmail.com` (non-admin from Una) → /products ✓

#### 2. Una Labs Visual Theme: Restored dark appearance
- **Problem:** `unalabs.cloud` pages were rendering with a ghost-white background and light colors instead of the dark theme.
- **Root Cause:** Global CSS included an unscoped light-theme variable reset (`:root { --bg: #f8f8fc; ... }`) that was meant for a future light mode but was affecting all pages including Una Labs.
- **Solution:** Added scoped CSS selectors to force the dark theme only on non-branded routes:
  ```css
  body:not(.brand-garden):not(.brand-og-trades),
  body.brand-una { /* dark theme variables */ }
  ```
- **Impact:** Una Labs pages now render with the original dark background, purple/cyan gradients, and correct text colors.

#### 3. Garden Cleaners Portal Independence (from earlier work)
- **Status:** Verified independent at `https://gardencleaners.ca/portal`
- **Details:** Legacy `/garden-cleaners/portal` on una.cloud now correctly redirects to canonical GC URL
- **Middleware:** Updated to pass /portal through on Garden custom domain without rewriting to legacy path

### Files Changed

- `lib/authDestinations.ts` — Updated `getDefaultPortalUrl()` for origin-aware routing
- `styles/globals.css` — Added scoped dark-theme overrides for Una Labs
- `functions/_middleware.ts` — Allow `/portal` passthrough on Garden domain (from earlier fix)
- `public/_worker.js` — Garden asset path mapping for `/portal`
- `README.md` — Documented auth routing and theme system

### Deployment

- **Build:** Successful (68 static pages, all routes prerendered)
- **Deploy:** Cloudflare Pages `ftc-site-pages` → main branch
- **Status:** Live as of 2026-05-08 20:50 UTC

### Testing Checklist (Manual - Not Yet Executed)

- [ ] Load `https://unalabs.cloud` — should show dark theme
- [ ] Load `https://unalabs.cloud/login` — should show dark theme
- [ ] Sign in as `mike.fejiro@gmail.com` — should redirect to ops.unalabs.cloud
- [ ] Sign in as `fejiro.efiuvwere@gmail.com` — should redirect to /products on unalabs.cloud
- [ ] Load `https://gardencleaners.ca` — should show light theme with green accents
- [ ] Load `https://gardencleaners.ca/portal` — should show independent portal (not redirect)
- [ ] Load `https://unalabs.cloud/garden-cleaners/portal` — should redirect to https://gardencleaners.ca/portal

### Known Limitations

- Cached Cloudflare responses may take up to 60 seconds to refresh; hard browser refresh (Ctrl+Shift+R) may be needed for immediate verification.
- Custom domain (gardencleaners.ca) routing relies on Cloudflare Pages attachment; if domain is not properly attached, it will fall back to Pages deployment URL.
