# FTC Site Project Context

## Purpose

FTC's public web shell that explains studio identity, showcases products/case studies, and converts visitors into project intake.

## Architecture

- Next.js 14 App Router
- Static-first content model in `lib/content.ts`
- Reusable component system for homepage and internal pages
- Playwright e2e smoke coverage for navigation and case-study routes

## Current IA

- Home
- Capabilities
- Work
- Work detail (`/work/[slug]`)
- Products
- About
- Work With FTC

## Canonical domain policy

- Canonical host: `ftc.peacepad.ca`
- Requests arriving on `*.pages.dev` are redirected to canonical host.
- `robots.txt` and `sitemap.xml` emit canonical host URLs.

## Content strategy

- Product-led portfolio framing for PeacePad, SayWetin, and ATEAM
- Capability pillars linked to filterable work index
- Clear conversion path from homepage to intake

## Operational notes

- Subdomain-first launch path with canonical URL `https://ftc.peacepad.ca`
- Domain purchase/custom binding deferred
- No backend form processing implemented yet (intake form is structure-only)
