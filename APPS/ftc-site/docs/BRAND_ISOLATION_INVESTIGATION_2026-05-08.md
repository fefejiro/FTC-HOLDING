# Brand Isolation — Investigation Findings (2026-05-08)

## TL;DR

Three live brand bleeds remain:
- `https://gardencleaners.ca/about` serves Una Labs `/about` (not Garden's)
- `https://gardencleaners.ca/services` serves Una Labs (or 404)
- `https://www.ogtradesacademy.com/about` serves Una Labs `/about`

Una Labs home + OG home are clean. Garden home shows Garden content but only because the Pages project's default route happens to land there for that host (verified inconsistent — see below).

## Why the Existing Fixes Don't Take Effect

### 1. Next.js `middleware.ts` does not run on this deployment

`wrangler.toml` declares `pages_build_output_dir = ".vercel/output/static"` — a **static-only** Cloudflare Pages deploy. There is no `_worker.js` (no next-on-pages adapter), so all middleware logic in `middleware.ts` is dead code at runtime. Every commit that "fixes" the bleed by editing `middleware.ts` (e.g. `bda11f9b`) has zero effect on the live custom domains.

### 2. `public/_redirects` host-prefix rules are silently ignored

Cloudflare Pages `_redirects` syntax supports path patterns and splats but **does not support host-based matching** (the `https://host/path …` prefix is a Netlify-only feature). Every host-scoped rule in `public/_redirects` (Garden Cleaners, OG Trades) is being ignored by CF Pages. Verified: `gardencleaners.ca/about` returns the Una Labs `/about` page, not a 200 rewrite.

### 3. Some external CF redirect rule is also interfering

`https://unalabs.cloud/garden-cleaners/about` returns `301 Location: /products/garden-cleaners/` — but no rule in `next.config.js redirects()` or `public/_redirects` produces that mapping. This must be a Cloudflare dashboard-level redirect rule (Bulk Redirects / Single Redirects / Page Rules) that needs to be located and removed before any Pages-level routing can be trusted.

## What Actually Works on Static-Only CF Pages

Only two mechanisms run at the edge for a static-only Pages deploy:

1. **Path-based rules in `_redirects`** (no host predicates).
2. **Cloudflare Pages Functions** in a `functions/` directory at the project root. These DO run on every request, have access to `request.headers.host`, and can rewrite via `env.ASSETS.fetch(rewrittenRequest)` while keeping the URL the user sees unchanged.

## Recommended Fix (Architectural)

Implement `APPS/ftc-site/functions/_middleware.ts` (Pages Function). Logic:

```
on every request:
  host = request.host
  if host in {gardencleaners.ca, www.gardencleaners.ca, gardencleaners.pages.dev}:
    if path is one of {/, /about, /services, /contact, /quote, /portal}:
      rewrite to /garden-cleaners[+path]   (env.ASSETS.fetch)
    else if path starts with /garden-cleaners:
      308 redirect to clean path           (Response.redirect)
    else if path starts with /og-trades-academy or /work/og-trades-academy:
      308 redirect to /
  if host in {ogtradesacademy.com, www.ogtradesacademy.com, ogtradesacademy.ca, www.ogtradesacademy.ca, og-trades-pages.pages.dev}:
    same pattern with /og-trades-academy prefix and OG-public-paths set
  else (unalabs.cloud, ftc-holding etc.):
    pass through (next())
```

The prerendered HTML for both `garden-cleaners/<page>.html` and `og-trades-academy/<page>.html` already exists in `.vercel/output/static/` (verified). The middleware just needs to map the host-scoped clean path to the brand sub-path internally.

## Pre-flight Required Before Implementing

1. **Audit CF dashboard for orphan redirect rules.** Specifically the `301 → /products/garden-cleaners/` rule needs to be located and removed in the CF dashboard for `unalabs.cloud` (and check Garden / OG zones too).
2. **Verify custom domain bindings.** Confirm which Cloudflare Pages projects have `gardencleaners.ca`, `ogtradesacademy.com`, and `unalabs.cloud` attached. If they all map to the same project (`ftc-site-pages`), the Pages Function approach works. If they map to separate projects, the middleware needs to be deployed to each.
3. **Strip host-prefix rules from `public/_redirects`.** Replace with a header comment noting that host-based routing lives in `functions/_middleware.ts`.
4. **Add `tsconfig.json` exclude for `functions/`** (or install `@cloudflare/workers-types`) so local typecheck doesn't fail on the Pages Function.

## Verification After Deploy

```powershell
# Custom-domain clean paths must serve brand content (not Una Labs).
curl -s https://gardencleaners.ca/about    | findstr "Garden Cleaners"
curl -s https://gardencleaners.ca/services | findstr "Garden Cleaners"
curl -s https://www.ogtradesacademy.com/about | findstr "Trades Academy"

# Brand sub-paths on custom domains must redirect to clean URLs.
curl -sI https://gardencleaners.ca/garden-cleaners/about | findstr "308"
curl -sI https://www.ogtradesacademy.com/og-trades-academy/about | findstr "308"

# Una Labs default routes must remain intact.
curl -s https://unalabs.cloud/        | findstr "Una Labs"
curl -s https://unalabs.cloud/about   | findstr "Una Labs"
```

Then re-run live Playwright suites:
- `APPS/ftc-site/tests/garden-cleaners-public.spec.ts`
- `APPS/ftc-site/tests/og-trades-public.spec.ts`

## Status

- Investigation complete.
- Implementation deferred — requires CF dashboard access and a deploy/verify cycle that should not be done blind.
- See draft Pages Function: deleted from working tree pending dashboard audit; recreate from this doc when ready.
