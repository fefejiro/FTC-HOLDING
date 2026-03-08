# Una Labs Site Launch Readiness Checklist

## Goal

Launch Una Labs rebrand without route breaks, then migrate canonical host from
`https://ftc.peacepad.ca` to `https://unalabs.cloud` in Phase B.

## Cloudflare source alignment (must be true before publish)

- Pages project bound to studio domain: `ftc-site-pages`
- Custom domain: `ftc.peacepad.ca`
- Monorepo source root: `APPS/ftc-site`
- Production branch: `main`

## DNS baseline (must remain unchanged unless explicitly noted)

- `CNAME ftc -> <active ftc-site-pages host>.pages.dev` = **Proxied**
- `CNAME api -> uka7e8pj.up.railway.app` = **DNS only**
- `peacepad.ca` root + `www` records remain mapped to PeacePad project
- MX/TXT/DKIM/SPF records = unchanged in this pass
- `saywetin.app` behavior is deferred in this pass

If `https://ftc.peacepad.ca` returns Cloudflare `403` or legacy pages:

1. verify `ftc` CNAME target resolves to the active studio Pages project;
2. verify Cloudflare Pages source root is `APPS/ftc-site`;
3. trigger production redeploy.

## Pre-publish checks

- `npm --workspace=@ftc/ftc-site run build` passes
- `npm --workspace=@ftc/ftc-site run test:e2e` passes
- Route contract verified:
  - `/`
  - `/capabilities`
  - `/work`
  - `/work/[slug]`
  - `/products`
  - `/about`
  - `/work-with-ftc`
- Legacy redirects verified:
  - `/services` -> `/capabilities`
  - `/case-studies` -> `/work`
  - `/contact` -> `/work-with-ftc`
- Canonical redirect check: `*.pages.dev` host redirects to active canonical host
- Mobile pass on hero, cards, and intake form
- Header and footer links checked manually
- Intake API check:
  - `POST /api/intake` returns 200 for valid payload
  - honeypot/rate-limit paths return non-200 safely

## Content checks

- Hero copy aligns with Una Labs identity statement
- Case studies for PeacePad, SayWetin, ATEAM are complete
- Intake form fields are present: name, email, project idea, budget, timeline
- Intake form submit shows success/failure state
- `Start a Project` is primary CTA in hero and final CTA banner
- `robots.txt` and `sitemap.xml` resolve with active canonical host

## Analytics and verification checks

- GA4 script loads only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
- CTA and case-study links emit analytics events
- Google verification meta appears when `GOOGLE_SITE_VERIFICATION` is set

## Publish path (budget-safe)

1. Confirm `ftc-site-pages` project source root is `APPS/ftc-site`.
2. Redeploy production from `main` (Phase A rebrand).
3. Validate DNS resolve + TLS certificate active for `ftc.peacepad.ca`.
4. Validate production route navigation + redirects.
5. Bind `unalabs.cloud` and `www.unalabs.cloud` to `ftc-site-pages`.
6. Switch canonical env (`UNALABS_SITE_URL`) to `https://unalabs.cloud`.
7. Add `UNALABS_REDIRECT_FROM_HOSTS=ftc.peacepad.ca` and redeploy.
8. Re-run smoke checks and then share `https://unalabs.cloud` in outreach profiles.
