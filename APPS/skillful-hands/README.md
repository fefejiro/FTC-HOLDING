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

- `/` Overview and programme carousel
- `/about/` Organisation and founder
- `/programmes/` Programme details
- `/partner-with-us/` Partnership audiences
- `/contact/` Clear email routes for enquiries

Every visible email action uses a standard `mailto:` link. On desktop or
mobile, the visitor's browser opens the email app they have configured, such
as Outlook, Apple Mail, Gmail or another preferred handler. The website does
not choose or store a visitor's email provider.

## Content

Edit public copy and programme-slide content in `src/content/site.ts`. Founder
and workshop photography are supplied by Skillful Hands CIC. The homepage uses
a small, accessible workshop-photo carousel with pause controls and
reduced-motion support. The official logo artwork has not yet been supplied as
a standalone asset, so the header uses the existing SH monogram until it is.

## Deployment

The production website is deployed to the `skillful-hands-cic` Cloudflare
Pages project:

- Canonical domain: <https://skillfulhandscic.uk/>
- Pages fallback: <https://skillful-hands-cic.pages.dev/>
- Production branch: `feat/skillful-hands-foundation`

Use [CLOUDFLARE_PAGES_RUNBOOK.md](./CLOUDFLARE_PAGES_RUNBOOK.md) for future
domain launches and certificate recovery.

Final logo artwork, full brand asset pack, photography permissions and founder
approval remain content-governance requirements. Monique Hughes's portrait and
the current workshop images are supplied assets.

## Reusing this foundation

This app is intentionally a reusable foundation for small, high-quality static
community and service websites. Use
[REUSABLE_STATIC_SITE_PLAYBOOK.md](./REUSABLE_STATIC_SITE_PLAYBOOK.md) when
starting the next client site. It records the reusable structure, quality gates
and rebranding steps proven on this launch.
