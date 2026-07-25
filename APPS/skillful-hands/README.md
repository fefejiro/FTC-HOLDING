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

## Content

Edit public copy in `src/content/site.ts`. The temporary workshop photograph is
by Vurzie Kim and sourced from
[Pexels](https://www.pexels.com/photo/a-young-woman-having-her-hair-braided-15576674/)
under the Pexels licence. It must be replaced with founder-approved photography
before launch.

## Deployment

The production website is deployed to the `skillful-hands-cic` Cloudflare
Pages project:

- Canonical domain: <https://skillfulhandscic.uk/>
- Pages fallback: <https://skillful-hands-cic.pages.dev/>
- Production branch: `feat/skillful-hands-foundation`

Use [CLOUDFLARE_PAGES_RUNBOOK.md](./CLOUDFLARE_PAGES_RUNBOOK.md) for future
domain launches and certificate recovery.

Approved photography, final branding assets, and final founder approval remain
content-governance requirements. The current temporary workshop photograph and
founder portrait placeholder are documented rather than presented as final
approved assets.
