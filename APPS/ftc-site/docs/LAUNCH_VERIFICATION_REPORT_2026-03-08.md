# FTC Launch Verification Report (2026-03-08)

## Scope

- FTC V1 cutover on `https://ftc.peacepad.ca`
- Cloudflare Pages source/build alignment for monorepo
- Route contract, redirect contract, and canonical host checks
- Regression check for PeacePad domain mapping

## Implementation and deployment trail

### Code commits applied to `main`

1. `e7b2494` - `ftc-site: enforce studio CTA and cutover verification updates`
2. `596a039` - `ftc-site: make work route static for Cloudflare Pages build`
3. `3d52e29` - `ftc-site: enforce legacy route redirects at middleware layer`
4. `bfbc9b3` - `ftc-site: clean hero featured-work proof strip copy`
5. `b730071` - `ftc-site: add intake API, analytics events, outreach pack, and prod smoke script`

### Cloudflare Pages project

- Project: `ftc-site-pages`
- Domains: `ftc-site-pages.pages.dev`, `ftc.peacepad.ca`
- Production commit now canonical: `b730071`
- Canonical deployment id: `5aca4295-2ae3-4702-a9fd-fa323ddca227` (active)

### Source/build alignment status

Project-level build config has been explicitly aligned to monorepo app root:

- `root_dir = APPS/ftc-site`
- `build_command = npm run build:deps && npx @cloudflare/next-on-pages@1`
- `destination_dir = .vercel/output/static`

## Verification results

### 1) Local preflight

- `npm --workspace=@ftc/ftc-site run build`: pass
- `npm --workspace=@ftc/ftc-site run test:e2e`: pass (12/12)
- `npm --workspace=@ftc/ftc-site run smoke:prod`: pass

### 2) Production route contract (HTTP)

Returned `200`:

- `/`
- `/capabilities`
- `/work`
- `/products`
- `/about`
- `/work-with-ftc`
- `/robots.txt`
- `/sitemap.xml`
- `/work/peacepad`
- `/api/intake` (valid payload)

Returned `308`:

- `/services -> /capabilities`
- `/case-studies -> /work`
- `/contact -> /work-with-ftc`
- `https://ftc-site-pages.pages.dev/ -> https://ftc.peacepad.ca/`

### 3) Business acceptance checks

- Hero is studio-first (`Intelligent software. Creative AI. Real-world systems.`)
- Hero primary CTA is `Start a Project`
- Final CTA banner primary action is `Start a Project`
- PeacePad, SayWetin, and ATEAM are visible in hero proof strip and project sections
- Mobile snapshot check passed for hero readability, CTA visibility, and section flow
- `/work-with-ftc` intake form now posts to live API with success/error states and honeypot field
- CTA and case-study click events are instrumented for GA4 when configured

### 4) PeacePad mapping regression check

Cloudflare Pages project bindings were verified:

- `ftc-site-pages` owns: `ftc-site-pages.pages.dev`, `ftc.peacepad.ca`
- `ftc-holding` remains mapped to: `ftc-holding.pages.dev`, `peacepad.ca`, `www.peacepad.ca`

No PeacePad domain mapping changes were made during this cutover.

### 5) Completed V1 tasks in this pass

- Item 1: Lead capture wired end-to-end (`/work-with-ftc` -> `POST /api/intake`)
- Item 2: Analytics scaffold added (GA4 pageviews + CTA/case-study/form events)
- Item 3: Content/component tightening (status badges + stronger case-study conversion path)
- Item 4: External profile rollout pack updated (LinkedIn, Upwork, Fiverr snippets/checklist)
- Item 7: Ops hardening added (`scripts/smoke-prod.mjs` + runbook commands)
