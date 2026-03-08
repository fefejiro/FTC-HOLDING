# FTC Site Launch Readiness Checklist

## Goal

Launch FTC V1 at `https://ftc.peacepad.ca` without new domain purchase.

## Cloudflare source alignment (must be true before publish)

- Pages project bound to FTC domain: `ftc-site-pages`
- Custom domain: `ftc.peacepad.ca`
- Monorepo source root: `APPS/ftc-site`
- Production branch: `main`

## DNS baseline (must remain unchanged unless explicitly noted)

- `CNAME ftc -> <active ftc-site-pages host>.pages.dev` = **Proxied**
- `CNAME api -> uka7e8pj.up.railway.app` = **DNS only**
- `peacepad.ca` root + `www` records remain mapped to PeacePad project
- MX/TXT/DKIM/SPF records = unchanged in this pass

If `https://ftc.peacepad.ca` returns Cloudflare `403` or legacy pages:

1. verify `ftc` CNAME target resolves to the active FTC Pages project;
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
- Canonical redirect check: `*.pages.dev` host redirects to `https://ftc.peacepad.ca`
- Mobile pass on hero, cards, and intake form
- Header and footer links checked manually

## Content checks

- Hero copy aligns with FTC identity statement
- Case studies for PeacePad, SayWetin, ATEAM are complete
- Intake form fields are present: name, email, project idea, budget, timeline
- `robots.txt` and `sitemap.xml` resolve with canonical host `https://ftc.peacepad.ca`

## Publish path (budget-safe)

1. Confirm `ftc-site-pages` project source root is `APPS/ftc-site`.
2. Redeploy production from `main`.
3. Validate DNS resolve + TLS certificate active for `ftc.peacepad.ca`.
4. Validate production route navigation + redirects.
5. Share canonical links in LinkedIn, Upwork, Fiverr profiles.
6. Delay custom domain purchase until budget decision.
