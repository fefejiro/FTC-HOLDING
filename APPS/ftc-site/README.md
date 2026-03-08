# Una Labs Site

Next.js App Router site for Una Labs studio identity, portfolio, and client conversion flow.

## Route contract

- `/` Home
- `/capabilities` (Studio)
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

- Phase A canonical URL: `https://ftc.peacepad.ca`
- Phase B canonical URL target: `https://unalabs.cloud`
- Keep `peacepad.ca`, `www.peacepad.ca`, `api.peacepad.ca`, and `saywetin.app`
  production mappings unchanged in this rollout.

## Runtime configuration

Optional environment variables:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4 web stream id, enables analytics)
- `GOOGLE_SITE_VERIFICATION` (Search Console verification meta tag)
- `UNALABS_INTAKE_WEBHOOK_URL` (preferred webhook sink for intake submissions)
- `FTC_INTAKE_WEBHOOK_URL` (fallback webhook sink for compatibility)
- `UNALABS_SITE_URL` (preferred canonical URL override, for Phase B switch)
- `FTC_SITE_URL` (fallback canonical URL override)
- `UNALABS_REDIRECT_FROM_HOSTS` (comma-separated legacy hosts to 308 to canonical)
- `UNALABS_SMOKE_BASE_URL` and `UNALABS_SMOKE_PAGES_URL` (preferred smoke script vars)
- `FTC_SMOKE_BASE_URL` and `FTC_SMOKE_PAGES_URL` (fallback smoke vars)
