# Skillful Hands CIC

Static Astro website for Skillful Hands CIC.

## Commands

From the repository root:

```bash
npm install
npm run dev --workspace=@ftc/skillful-hands
npm run build --workspace=@ftc/skillful-hands
npm run verify:production --workspace=@ftc/skillful-hands
```

The production output is written to `dist`.

## Routes and contact

The website is a compact static multi-page experience:

- `/` Overview, hero photo controls and compact programme pathways
- `/about/` Organisation and founder
- `/programmes/` Programme details
- `/partner-with-us/` Partnership audiences
- `/contact/` Clear email routes for enquiries

Every visible email action uses a standard `mailto:` link. On desktop or
mobile, the visitor's browser opens the email app they have configured, such
as Outlook, Apple Mail, Gmail or another preferred handler. The website does
not choose or store a visitor's email provider.

## Content

Edit public copy and programme content in `src/content/site.ts`. Founder and
workshop photography are supplied by Skillful Hands CIC. The homepage uses an
accessible workshop-photo sequence with pause controls and reduced-motion
support. Programme pathways are static, compact links to the detailed
programme page. The official Skillful Hands CIC logo artwork is used in the
header and footer. The primary hero image is an approved illustrative workshop
scene; the other workshop photographs are authentic supplied assets.

## Deployment

The production website is deployed to the `skillful-hands-cic` Cloudflare
Pages project:

- Canonical domain: <https://skillfulhandscic.uk/>
- Pages fallback: <https://skillful-hands-cic.pages.dev/>
- Production branch: `feat/skillful-hands-foundation`

Use [CLOUDFLARE_PAGES_RUNBOOK.md](./CLOUDFLARE_PAGES_RUNBOOK.md) for future
domain launches and certificate recovery.

Photography permissions and future brand assets remain content-governance
requirements. Monique Hughes's portrait and the current workshop images are
supplied assets.

The final visual polish removes the decorative community ribbon, gives each
programme detail a wider image-and-copy layout, and keeps the footer logo clear
on both desktop and mobile. These are presentation choices, not content claims.

## Reusing this foundation

This app is intentionally a reusable foundation for small, high-quality static
community and service websites. Use
[REUSABLE_STATIC_SITE_PLAYBOOK.md](./REUSABLE_STATIC_SITE_PLAYBOOK.md) when
starting the next client site. It records the reusable structure, quality gates
and rebranding steps proven on this launch.
