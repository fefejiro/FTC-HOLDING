# Una Labs Site Project Context

## Purpose

Una Labs public web shell that explains studio identity, showcases products/case studies, and converts visitors into project intake.

## Architecture

- Next.js 14 App Router
- Static-first content model in `lib/content.ts`
- Reusable component system for homepage and internal pages
- Playwright e2e smoke coverage for navigation and case-study routes

## Current IA

- Home
- Studio (`/capabilities`)
- Work
- Work detail (`/work/[slug]`)
- Products
- About
- Start a Project (`/work-with-ftc`)

## Canonical domain policy

- Phase A canonical host: `ftc.peacepad.ca`
- Phase B canonical host target: `unalabs.cloud`
- Requests arriving on `*.pages.dev` are redirected to canonical host.
- `robots.txt` and `sitemap.xml` emit canonical host URLs.

## Content strategy

- Product-led portfolio framing for PeacePad, SayWetin, and ATEAM
- Capability pillars linked to filterable work index
- Clear conversion path from homepage to intake

## Operational notes

- Phase A runs on `https://ftc.peacepad.ca`
- Phase B migrates canonical to `https://unalabs.cloud` with old-host 308 redirects
- Intake backend is live at `POST /api/intake` with anti-spam + rate limiting
