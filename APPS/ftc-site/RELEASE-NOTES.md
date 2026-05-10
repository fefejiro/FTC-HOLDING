# Release Notes — FTC Site

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
