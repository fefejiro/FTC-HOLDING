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

- Canonical host: `unalabs.cloud`
- Requests arriving on `*.pages.dev` should redirect to canonical/public hosts.
- `robots.txt` and `sitemap.xml` emit canonical host URLs.
- Brand host routing is handled at Cloudflare Pages edge via `functions/_middleware.ts`.
- Current host ownership map:
	- Una Labs: `unalabs.cloud`, `www.unalabs.cloud`
	- Garden Cleaners: `gardencleaners.ca`, `www.gardencleaners.ca`
	- OG alias: `og.unalabs.cloud`
	- OG public custom domains (`ogtradesacademy.com`, `www.ogtradesacademy.com`) are pending external DNS verification.

## Content strategy

- Product-led portfolio framing for PeacePad, SayWetin, and ATEAM
- Capability pillars linked to filterable work index
- Clear conversion path from homepage to intake

## Operational notes

- Production canonical runs on `https://unalabs.cloud`
- Legacy hosts should 308 to canonical where applicable
- Intake backend is live at `POST /api/intake` with anti-spam + rate limiting
