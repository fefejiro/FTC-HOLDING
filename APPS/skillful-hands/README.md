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

Edit public copy and programme-slide content in `src/content/site.ts`. Founder
photography is supplied and approved by Skillful Hands CIC. The temporary hero
workshop photograph is by Vurzie Kim and sourced from
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

Final hero photography, branding assets, and founder approval remain
content-governance requirements. Monique Hughes's founder portrait is now an
approved supplied asset; the workshop hero remains temporary.
