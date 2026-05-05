# Cloudflare Pages Git Hardening (OG + Garden)

Date: 2026-04-29

## Scope

Harden Pages deployments for:

- `og-trades-pages`
- `gardencleaners`

This repo is a monorepo rooted at `C:\FTC HOLDING\_restore_repo`.

## 1) Connect `og-trades-pages` to Git

In Cloudflare Dashboard:

1. `Workers & Pages` -> `og-trades-pages`
2. Click `Connect to Git`
3. Provider: GitHub
4. Repository: `fejiro/FTC-HOLDING`
5. Production branch: `main`

## 2) Lock build settings (both Pages projects)

For each project (`og-trades-pages`, `gardencleaners`) set:

- Build command:
  - `npm ci && FTC_SITE_PAGES_TARGET=og-trades npm run pages:build:ftc-site` (for `og-trades-pages`)
  - `npm ci && npm run pages:build:ftc-site` (for `gardencleaners`, no target override)
- Build output directory:
  - `APPS/ftc-site/.vercel/output/static`
- Root directory:
  - repository root (leave blank unless explicitly configured otherwise)
- Node version:
  - `20`

## 3) Environment variables

`og-trades-pages`:

- `FTC_SITE_PAGES_TARGET=og-trades`

`gardencleaners`:

- no `FTC_SITE_PAGES_TARGET` override required

Both projects should keep required runtime vars already used by `ftc-site` (if set in current config).

## 4) Domain mapping sanity check

`og-trades-pages` should own:

- `ogtradesacademy.com`
- `www.ogtradesacademy.com`

`gardencleaners` should own:

- `gardencleaners.ca`
- `www.gardencleaners.ca` (if used)

## 5) Branch protection and deploy controls

Recommended:

- Production deploys from `main` only
- Preview deploys from PR branches
- Auto-deploy on push to `main` enabled
- Required reviewer for Cloudflare production settings changes

## 6) Verification checklist (post-save)

After saving settings and triggering a deploy:

1. `ogtradesacademy.com` shows OG content (not Una/Garden)
2. `gardencleaners.ca` shows Garden content
3. Garden nav routes resolve correctly:
   - `/`
   - `/about`
   - `/services`
   - `/contact`
   - `/quote`
   - `/portal`
4. No missing static assets in browser devtools network panel

## 7) Rollback

If wrong content appears:

1. Re-check custom domain assignment in Pages
2. Re-check `FTC_SITE_PAGES_TARGET` for `og-trades-pages`
3. Redeploy last known good commit

