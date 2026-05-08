# Brand Isolation Architecture for ftc-site

**Status:** Live in production  
**Last Updated:** May 7, 2026  
**Scope:** Garden Cleaners (gardencleaners.ca), OG Trades Academy (ogtradesacademy.com), Una Labs (unalabs.cloud), Polar Anchor, Contrast

---

## Overview

ftc-site is a **multi-tenant Next.js application** serving multiple independent brands from a shared codebase. Each brand has:

- Custom domain(s) (e.g., `gardencleaners.ca`, `ogtradesacademy.com`)
- Separate Cloudflare Pages project (or multiple domains on one project)
- Branded routes (`/garden-cleaners`, `/og-trades-academy`, etc.)
- Host detection helpers (in `lib/[brand].ts`)
- Custom homepage and navigation

The architecture ensures **complete brand isolation** so no brand content ever leaks to another brand's domain.

---

## Key Components

### 1. Root Brand Router (`app/components/RootBrandRouter.tsx`)

**What it does:**
- Client-side safety net that prevents wrong-brand content from rendering on a branded domain
- Detects `window.location.host` and compares against the current route
- If mismatch detected, redirects to the correct branded route before anything renders

**How it works:**
```typescript
// If host is gardencleaners.ca but route is /og-trades-academy/course
// → Redirect to /garden-cleaners (root of branded site)

// If host is ogtradesacademy.com but route is /garden-cleaners/quote
// → Redirect to /og-trades-academy (root of branded site)

// If host is unalabs.cloud (default) → Allow any route to render
```

**Why it's needed:**
- Primary redirects in `public/_redirects` (Cloudflare Pages) are the first line of defense
- But if a build is deployed to multiple Pages projects or domains, redirects may not apply uniformly
- This component ensures the UI layer prevents brand bleed as a fallback

**Applied at:** Root layout (`app/layout.tsx`) — wraps Header, main, and Footer for all routes

### 2. Host Detection Helpers

Each brand has a dedicated lib file with host detection:

| Brand | File | Key Functions |
|-------|------|---|
| **Garden Cleaners** | `lib/gardenCleaners.ts` | `isGardenCleanersCustomHost(host)`, `getGardenCleanersBrandedPath(pathname)` |
| **OG Trades** | `lib/ogTradesAcademy.ts` | `isOgTradesCustomHost(host)`, `getOgTradesBrandedPath(pathname)` |
| **Polar Anchor** | `lib/polarAnchor.ts` | `isPolarAnchorCustomHost(host)`, `getPolarAnchorBrandedPath(pathname)` |

Example from `lib/gardenCleaners.ts`:
```typescript
const gardenCleanersCustomHosts = new Set<string>([
  'gardencleaners.ca',
  'www.gardencleaners.ca',
  'gardencleaners.pages.dev'
]);

export function isGardenCleanersCustomHost(host = '') {
  const normalized = host.trim().toLowerCase().replace(/:\d+$/, '');
  return gardenCleanersCustomHosts.has(normalized);
}
```

### 3. Branded Routes

Each brand has its own directory tree under `app/`:

```
app/
├── page.tsx                           # Una Labs (default home)
├── garden-cleaners/
│   ├── page.tsx                       # Garden home
│   ├── about/page.tsx
│   ├── portal/page.tsx
│   └── quote/page.tsx
├── og-trades-academy/
│   ├── page.tsx                       # OG Trades home
│   ├── about/page.tsx
│   ├── course/page.tsx
│   └── community/page.tsx
├── polar-anchor/
│   ├── page.tsx                       # Polar home
│   └── ...
└── components/
    ├── garden-cleaners/
    │   ├── GardenHero.tsx
    │   ├── GardenPortalAccessPanel.tsx
    │   └── ...
    ├── og-trades/
    │   ├── OgTradesHero.tsx
    │   └── ...
    └── RootBrandRouter.tsx            # BRAND ISOLATION ROUTER
```

### 4. Infrastructure Redirects (`public/_redirects`)

Primary redirect rules for each brand (Cloudflare Pages):

```
# Garden Cleaners: redirect custom domain to branded route
https://gardencleaners.ca/ /garden-cleaners 200
https://www.gardencleaners.ca/ /garden-cleaners 200
https://gardencleaners.ca/quote /garden-cleaners/quote 200
...

# OG Trades: redirect custom domain to branded route
https://ogtradesacademy.com/ /og-trades-academy 302
https://www.ogtradesacademy.com/ /og-trades-academy 302
...
```

---

## How Brand Isolation Works: End-to-End

### Scenario 1: User visits gardencleaners.ca

1. **DNS** → gardencleaners.ca resolves to Cloudflare Pages
2. **Cloudflare Pages** → Loads ftc-site (same build serves all domains)
3. **_redirects** → Rule `https://gardencleaners.ca/ /garden-cleaners 200` applies
   - Request URL stays as `gardencleaners.ca/`
   - But content served from `/garden-cleaners` route
4. **RootBrandRouter** (client-side) → Detects `host=gardencleaners.ca` and `pathname=/garden-cleaners`
   - Hosts match → Allow render ✅
   - User sees Garden Cleaners homepage
5. **User navigates** → Click on "About" → route becomes `/garden-cleaners/about`
   - RootBrandRouter checks: host still `gardencleaners.ca`, pathname is `/garden-cleaners/about`
   - Still within branded tree → Allow ✅

### Scenario 2: Redirect fails; user lands on wrong route

1. User somehow visits `gardencleaners.ca/og-trades-academy/course`
   - (shouldn't happen with `_redirects`, but this is the fallback)
2. **RootBrandRouter** detects:
   - `host = gardencleaners.ca`
   - `pathname = /og-trades-academy/course`
   - Mismatch! ❌
3. **RootBrandRouter redirects** → `window.location.replace('/garden-cleaners')`
4. User is taken to `/garden-cleaners` (branded root)

### Scenario 3: User visits unalabs.cloud

1. **RootBrandRouter** detects:
   - `host = unalabs.cloud` (NOT a custom branded host)
   - `isGardenCleanersCustomHost(host)` returns false
   - `isOgTradesCustomHost(host)` returns false
2. **RootBrandRouter allows render** → Content displays normally
   - Any route is valid on unalabs.cloud

---

## For Developers: Adding a New Brand

### Step 1: Create lib helpers (`lib/newBrand.ts`)

```typescript
// lib/newBrand.ts
const newBrandCustomHosts = new Set<string>([
  'newbrand.ca',
  'www.newbrand.ca',
  'newbrand.pages.dev'
]);

export function isNewBrandCustomHost(host = '') {
  const normalized = String(host || '').trim().toLowerCase().replace(/:\d+$/, '');
  return newBrandCustomHosts.has(normalized);
}

export function getNewBrandBrandedPath(pathname = '/', options: { host?: string; customDomain?: boolean } = {}) {
  const normalized = normalizePathname(pathname);
  const useCustomDomain = options.customDomain ?? isNewBrandCustomHost(options.host || '');
  return useCustomDomain ? normalized : `/new-brand${normalized}`;
}

// ... export other helpers (navLinks, config, metadata, etc.)
```

### Step 2: Create routes (`app/new-brand/page.tsx`, etc.)

```typescript
// app/new-brand/page.tsx
import { getNewBrandMetadata } from '../../lib/newBrand';

export function generateMetadata() {
  return getNewBrandMetadata({
    title: 'New Brand | Tagline',
    description: 'Description'
  });
}

export default function NewBrandHomePage() {
  // ... your content
}
```

### Step 3: Register in RootBrandRouter

Update `app/components/RootBrandRouter.tsx`:

```typescript
import { isNewBrandCustomHost } from '../../lib/newBrand';

// Inside useEffect:
if (isNewBrandCustomHost(host) && !pathname.startsWith('/new-brand')) {
  window.location.replace('/new-brand');
  return;
}
```

### Step 4: Add Cloudflare Pages redirects

Edit `public/_redirects`:

```
# New Brand hosts
https://newbrand.ca/ /new-brand 302
https://www.newbrand.ca/ /new-brand 302
```

### Step 5: Update Header component (if needed)

The Header component already auto-detects brands via `isGardenCleanersCustomHost`, `isOgTradesCustomHost`, etc. If you add a new brand, add similar detection to Header if you want custom branding per domain.

---

## Testing Brand Isolation

### Local Testing

**Method 1: Modify `/etc/hosts` (simulate domain)**

```
127.0.0.1 gardencleaners.local
127.0.0.1 ogtradesacademy.local
```

Then visit `http://gardencleaners.local:3000` (Next.js dev server).

**Method 2: Use query parameter override (development only)**

```typescript
// In RootBrandRouter, add override for dev:
const hostOverride = new URLSearchParams(window.location.search).get('brand_host');
const host = hostOverride || window.location.host;
```

### Production Testing Checklist

- [ ] **gardencleaners.ca** → Shows Garden homepage (no Una Labs hero)
- [ ] **gardencleaners.ca/garden-cleaners/about** → Shows Garden About page
- [ ] **gardencleaners.ca/og-trades-academy** (if somehow reached) → Redirects to /garden-cleaners
- [ ] **ogtradesacademy.com** → Shows OG Trades homepage
- [ ] **ogtradesacademy.com/course** → Shows OG Trades course page
- [ ] **unalabs.cloud** → Shows Una Labs homepage
- [ ] **unalabs.cloud/garden-cleaners** → Shows Garden sub-route (valid on default host)
- [ ] No console errors; no layout shift or flash of wrong brand

### Browser DevTools Check

```javascript
// In browser console on gardencleaners.ca:
window.location.host  // Should be 'gardencleaners.ca'
window.location.pathname // Should start with '/garden-cleaners' or '/'
```

---

## Troubleshooting

### Issue: Wrong brand flickers on custom domain

**Cause:** RootBrandRouter didn't run before content rendered, or redirect didn't fire.

**Fix:**
1. Confirm RootBrandRouter is wrapping Header/main/Footer in root layout.
2. Check browser console for `useEffect` errors.
3. Verify host detection function returns correct value: `isGardenCleanersCustomHost('gardencleaners.ca')` should be `true`.

### Issue: Custom domain shows 404 or blank

**Cause:** `_redirects` rule didn't apply, and RootBrandRouter isn't configured for that host.

**Fix:**
1. Add host to the brand's `lib/[brand].ts` custom hosts set.
2. Add rule to `public/_redirects`.
3. Rebuild and redeploy to Cloudflare Pages.

### Issue: Brand A's content shows on Brand B's domain

**Cause:** Brand isolation failed at multiple levels (infrastructure + application).

**Fix:**
1. **Immediate (production hotfix):** Update `_redirects` to force-redirect mismatch (status 301 or 302).
2. **Short-term:** Confirm RootBrandRouter is active on all routes.
3. **Long-term:** Review Header and other shared components for hardcoded brand logic.

---

## Architecture Principles

1. **Defense in depth:** Multiple layers (Cloudflare `_redirects`, RootBrandRouter, Host header checks in Header component, branded route separation).

2. **Host as source of truth:** Always compare `window.location.host` against expected branded hosts. Never rely on URL path alone.

3. **Safe fallback:** If redirect fails, error gracefully (show branded root or error) rather than mixed content.

4. **Immutable in production:** Once a brand is registered and live, don't change its custom hosts without coordinating with Cloudflare Pages setup.

5. **Explicit over implicit:** Each brand explicitly declares its hosts and paths. No assumptions about "default" brands.

---

## Related Documents

- [PRODUCTION_FIX_DEPLOYMENT_2026-05-07.md](./PRODUCTION_FIX_DEPLOYMENT_2026-05-07.md) — Recent production fixes for brand bleed
- [GARDEN_GOOGLE_AUTH_HANDOVER_2026-05-07.md](./GARDEN_GOOGLE_AUTH_HANDOVER_2026-05-07.md) — Garden-specific auth setup
- [bleed-stop-checklist.md](./bleed-stop-checklist.md) — Checklist for verifying brand isolation

---

## Contact

For questions about brand architecture, refer to the portfolio status at `https://unalabs.cloud/status?project=ftc-site` or the git history for recent brand isolation fixes.

---

**Last Review:** 9e00f140 (May 7, 2026) — Root brand router architecture implemented  
**Next Review:** After next brand is added to ftc-site
