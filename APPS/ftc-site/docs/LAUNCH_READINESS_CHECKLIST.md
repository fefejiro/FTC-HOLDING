# FTC Site Launch Readiness Checklist

## Goal

Launch FTC V1 at `https://ftc.peacepad.ca` without new domain purchase.

## DNS baseline (must remain unchanged unless noted)

- `CNAME ftc -> ftc-site.pages.dev` = **Proxied**
- `CNAME api -> uka7e8pj.up.railway.app` = **DNS only**
- `CNAME peacepad.ca -> ftc-holding.pages.dev` = unchanged in this pass
- `CNAME www -> ftc-holding.pages.dev` = unchanged in this pass
- MX/TXT/DKIM/SPF records = unchanged in this pass

If `https://ftc.peacepad.ca` returns Cloudflare `403`, verify the `ftc` CNAME target is a resolvable Pages default domain.

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

1. Confirm custom domain binding for `ftc.peacepad.ca` in Cloudflare Pages project.
2. Validate DNS resolve + TLS certificate active for `ftc.peacepad.ca`.
3. Validate production route navigation + redirects.
4. Share canonical links in LinkedIn, Upwork, Fiverr profiles.
5. Delay custom domain purchase until budget decision.
