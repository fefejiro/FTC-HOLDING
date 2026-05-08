# Production Fix Deployment - 2026-05-07 (Auth Bleed & Hangs)

## Overview

Three production bugs are now fixed in code:

1. **gardencleaners.ca homepage rendering Una Labs marketing** (branding bleed) → Defensive client-side host redirect added.
2. **una-labs-site dashboard stuck on "Loading your portal..." forever** → Added 8s + 12s timeout fallbacks.
3. **gardencleaners.ca portal showing "Supabase public environment is not configured"** → **ENV-VAR ISSUE IN CLOUDFLARE** (not code).

## Code Changes

### ftc-site (Garden Cleaners + Una Labs + OG Trades)

#### NEW: `app/components/HomeHostRouter.tsx`

- Defensive client-side redirect for branded hosts.
- If `window.location.host` is `gardencleaners.ca` or similar, redirect immediately to `/garden-cleaners`.
- If host is an OG Trades domain, redirect to `/og-trades-academy`.
- Falls back if `_redirects` fails to apply (Cloudflare multi-project binding issue).
- **Reason:** Production was rendering the Una Labs "Rough request in. Scoped delivery out." hero on gardencleaners.ca despite the `_redirects` rule. This ensures branding can never bleed, even if the infrastructure redirect fails.

#### UPDATED: `app/page.tsx`

- Wraps `<HomePageExperience />` with `<HomeHostRouter>`.
- No visual change on unalabs.cloud (the Una Labs host).
- Safe cleanup for branded custom hosts.

### una-labs-site (Una Labs portal)

#### UPDATED: `app/dashboard/DashboardClient.tsx`

- Added `loadingTimeout` variable in the main effect.
- **OAuth callback timeout (8s):** If the URL hash contains `access_token=` but Supabase never fires a `SIGNED_IN` event within 8 seconds, fall back to unauthenticated (user can then sign in via the login form).
- **Hard safety timeout (12s):** If the dashboard remains in "loading" phase after 12 seconds (network hang, missing env, API failure), render an error state instead of spinning forever.
- **Reason:** Previous code could hang indefinitely if Supabase env was missing or the auth callback never completed.

---

## Deployment Checklist (CRITICAL)

### Prerequisite: Verify Cloudflare Pages Projects

The Garden Cleaners portal requires **separate infrastructure** from the Una Labs portal.

1. **Garden Cleaners Pages project** (e.g., `gardencleaners` or similar):
   - Bound to domain(s): `gardencleaners.ca`, `www.gardencleaners.ca`
   - Environment variables set (Production):
     - `NEXT_PUBLIC_SUPABASE_URL` = Garden's Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Garden's Supabase anon key
   - *Note:* Currently missing or pointing at a paused project, causing "Supabase public environment is not configured" in production.

2. **Una Labs Pages project** (e.g., `una-labs` or similar):
   - Bound to domain(s): `unalabs.cloud`, `www.unalabs.cloud`
   - Environment variables set (Production):
     - `NEXT_PUBLIC_SUPABASE_URL` = Una Labs' Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Una Labs' Supabase anon key

3. **Reference:** See `DOCS/GARDEN_GOOGLE_AUTH_HANDOVER_2026-05-07.md` for Supabase project URLs and Google OAuth client IDs.

### Deploy Steps

1. Commit the three code changes above (Garden HomePage router + redirects, Una Labs dashboard timeouts) to `origin/main`.

2. **Build and deploy ftc-site to the Garden Cleaners Pages project:**
   - Run the build in CI with the Garden project's env vars.
   - Deploy to the Garden Pages project. Confirm the build hash matches production.
   - No immediate visible change, but the HomePage router now acts as a safety net.

3. **Build and deploy una-labs-site to the Una Labs Pages project:**
   - Run the build in CI with the Una Labs project's env vars.
   - Deploy to the Una Labs Pages project.
   - Dashboard now has timeout fallbacks; "Loading..." can no longer hang forever.

4. **Test Garden Cleaners portal (gardencleaners.ca):**
   - Visit `https://gardencleaners.ca/garden-cleaners/portal#portal-access`.
   - Confirm **Homepage now redirects correctly** if visited on gardencleaners.ca (no Una Labs hero).
   - Click "Continue with Google".
   - Confirm Supabase OAuth redirect succeeds (if env vars were correctly set in step 1).
   - If still showing "Supabase public environment is not configured," env vars are still missing or wrong. Re-check the Cloudflare Pages project settings for Production.

5. **Test Una Labs dashboard (unalabs.cloud/dashboard):**
   - Visit `https://unalabs.cloud/dashboard/`.
   - If not signed in: confirm "Sign-in required" message appears promptly (not "Loading..." forever).
   - If signed in: confirm projects + milestones load within 12 seconds, or error is shown.

---

## Why the Portal Shows "Supabase public environment is not configured"

Next.js static export bakes environment variables at **build time**, not runtime. The variables are read from the build environment and embedded in the JavaScript bundle.

When the Garden Pages project (bound to gardencleaners.ca) is built **without** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, the resulting JavaScript throws an error when trying to create the Supabase client:

```typescript
// In PACKAGES/supabase/src/index.ts
export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  // ... tries to read NEXT_PUBLIC_SUPABASE_URL ...
  if (!url) {
    throw new Error('Public Supabase URL is required. Set VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.');
  }
  // ...
}
```

This error is caught in `GardenPortalAccessPanel.tsx` and displayed as "Portal auth unavailable":

```typescript
catch (error) {
  setLoadError("Supabase public environment is not configured for this deployment.");
  setAuthState("unavailable");
}
```

**Fix:** Ensure the Garden Pages project has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in its Environment Variables (Production) **before** the next deploy.

---

## Verify Separation (Confirmations)

After all deployments:

- ✅ gardencleaners.ca homepage does NOT show "Rough request in. Scoped delivery out." (redirects to /garden-cleaners).
- ✅ gardencleaners.ca portal allows Google login and reaches the admin dashboard (uby400@gmail.com, mike.fejiro@gmail.com).
- ✅ gardencleaners.ca magic link, OTP, and password login paths are not visible.
- ✅ unalabs.cloud/dashboard does NOT hang on "Loading your portal..." if auth is unavailable or slow (shows error or "Sign-in required" within 12s).
- ✅ unalabs.cloud/dashboard allows Google login and shows projects + milestones for authenticated users.
- ✅ unalabs.cloud homepage still renders the Una Labs marketing hero.

---

## Handover Reference

See `DOCS/GARDEN_GOOGLE_AUTH_HANDOVER_2026-05-07.md` for:
- Supabase project URLs (Garden vs. Una Labs).
- Google OAuth client IDs (Garden vs. Una Labs).
- Admin allowlists (Garden = uby400@gmail.com, mike.fejiro@gmail.com; Una Labs = mike.fejiro@gmail.com, fejiro.efiuvwere@gmail.com).
- Previous validation steps (magic link removed, Google-only path confirmed, no OTP/password).

---

## Questions or Issues

If the Garden portal still shows "Supabase public environment is not configured" after deployment:

1. **Verify Cloudflare Pages:** Confirm the Pages project bound to gardencleaners.ca has Environment Variables (Production) set with the correct Garden Supabase URL and key.
2. **Rebuild and redeploy:** Even if env vars are now set, the old build (without env) is still live. Rebuild and deploy a new version.
3. **Check domain binding:** Confirm gardencleaners.ca is bound to the Garden Pages project, not another project.
4. **Supabase project status:** Confirm the Supabase project itself is active and not paused/archived.

If the Una Labs dashboard still hangs:

1. **Check Supabase connectivity:** Confirm the Una Labs Supabase project is reachable and the anon key is correct.
2. **Check auth state:** Confirm the browser's local auth session is valid or expired (not stuck).
3. **Browser console:** Check for JavaScript errors in the browser console (DevTools).

---

**Deployed:** commit hash will be recorded once pushed to origin/main.  
**Status:** Code ready; awaiting Cloudflare Pages env-var verification and redeploy.
