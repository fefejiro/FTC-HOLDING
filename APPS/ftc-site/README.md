# FTC Site

Next.js App Router site for FTC's studio identity, portfolio, and client conversion flow.

## Route contract

- `/` Home
- `/capabilities`
- `/work`
- `/work/[slug]`
- `/products`
- `/about`
- `/work-with-ftc`

Legacy compatibility redirects:

- `/services` -> `/capabilities`
- `/case-studies` -> `/work`
- `/contact` -> `/work-with-ftc`

## Content model

Project and capability content is defined in:

- `lib/content.ts`

Primary interface:

- `ProjectCaseStudy`

## Component system

Reusable components used across pages:

- `Hero`
- `CapabilityCard`
- `ProjectCard`
- `ServiceCard`
- `CTABanner`

## Local commands

```powershell
npm run dev
npm run build
npm run test:e2e
npm run smoke:prod
```

The site runs on port `3001` (via `@ftc/config`).

## Current launch mode

- Canonical launch URL: `https://ftc.peacepad.ca`
- Keep `CNAME ftc -> ftc-site.pages.dev` in Cloudflare as **Proxied**
- Keep `peacepad.ca`, `www`, `api`, and mail records unchanged in this rollout

## Runtime configuration

Optional environment variables:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4 web stream id, enables analytics)
- `GOOGLE_SITE_VERIFICATION` (Search Console verification meta tag)
- `FTC_INTAKE_WEBHOOK_URL` (optional webhook sink for intake submissions)
