# Garden Cleaners Demo Build Handover

## Summary of changes
- Added a new isolated Garden Cleaners subsite under `/garden-cleaners` inside the existing `ftc-site` app.
- Reused the existing Una Labs marketing-site shell, CTA patterns, form behavior, route layout, and design primitives.
- Added route-aware header and footer behavior so Garden Cleaners gets its own brand chrome within the subsite.
- Added a dedicated quote request form and API route for demo-ready client presentation.
- Added local SEO metadata for each Garden Cleaners page and updated the sitemap.
- Upgraded the homepage with a more client-facing deep-cleaning structure inspired by a local-services landing page pattern.
- Replaced the temporary illustration-led media treatment with real Garden Cleaners photography and collage-derived crops.

## New routes
- `/garden-cleaners`
- `/garden-cleaners/about`
- `/garden-cleaners/services`
- `/garden-cleaners/contact`
- `/garden-cleaners/quote`
- API: `/api/garden-cleaners-quote`

## Files created
- `app/garden-cleaners/page.tsx`
- `app/garden-cleaners/about/page.tsx`
- `app/garden-cleaners/services/page.tsx`
- `app/garden-cleaners/contact/page.tsx`
- `app/garden-cleaners/quote/page.tsx`
- `app/api/garden-cleaners-quote/route.ts`
- `app/components/garden-cleaners/GardenHero.tsx`
- `app/components/garden-cleaners/GardenDeepCleaningFeature.tsx`
- `app/components/garden-cleaners/GardenServiceShowcase.tsx`
- `app/components/garden-cleaners/GardenImagePanel.tsx`
- `app/components/garden-cleaners/GardenTrustStrip.tsx`
- `app/components/garden-cleaners/GardenServiceCard.tsx`
- `app/components/garden-cleaners/GardenTestimonials.tsx`
- `app/components/garden-cleaners/GardenFaqList.tsx`
- `app/components/garden-cleaners/GardenQuoteForm.tsx`
- `lib/gardenCleaners.ts`
- `public/images/garden-cleaners/hero-cleaning-team.svg`
- `public/images/garden-cleaners/deep-cleaning-kitchen.svg`
- `public/images/garden-cleaners/commercial-cleaning-office.svg`
- `public/images/garden-cleaners/hero-office-team.png`
- `public/images/garden-cleaners/commercial-cleaner.png`
- `public/images/garden-cleaners/cleaning-collage.png`
- `public/images/garden-cleaners/gc-desk-cleaning.png`
- `public/images/garden-cleaners/gc-floor-cleaning.png`
- `public/images/garden-cleaners/gc-team-supplies.png`
- `public/images/garden-cleaners/gc-washroom-cleaning.png`
- `public/images/garden-cleaners/gc-owner-portrait.png`
- `public/images/garden-cleaners/gc-office-space-clean.png`

## Files modified
- `app/components/Header.tsx`
- `app/components/Footer.tsx`
- `app/sitemap.ts`
- `styles/globals.css`
- `app/garden-cleaners/about/page.tsx`
- `app/garden-cleaners/contact/page.tsx`
- `app/garden-cleaners/quote/page.tsx`
- `app/garden-cleaners/services/page.tsx`
- `docs/GARDEN_CLEANERS_HANDOVER.md`

## Placeholder content requiring replacement later
- Phone: `(905) 000-0000`
- Email: `hello@gardencleaners.ca`
- Address: `Oshawa, Ontario, Canada`
- Testimonials are polished placeholders for demo use and should be replaced with real client proof before launch.

## Demo behavior
- Quote form validates required fields and submits to `/api/garden-cleaners-quote`.
- If `GARDEN_CLEANERS_QUOTE_WEBHOOK_URL` is configured, submissions forward there.
- If not configured, the form still returns a clean success message so the demo remains functional.

## Visual refinement notes
- The homepage now has a dedicated deep-cleaning feature section with stronger local-services copy and a right-side media panel.
- The hero uses a real office-cleaning team image and small proof pills so the page feels more like a real local-services landing page.
- The trust section now includes owner-forward team photography instead of copy-only trust pills.
- Services now include an additional sanitization showcase so the subsite feels more complete and less text-only.
- About, contact, and quote all now carry real commercial-cleaning imagery so the subsite feels like one cohesive business rather than a generic template.

## Image processing note
- The final photographic assets came from:
  - `hero-office-team.png`
  - `commercial-cleaner.png`
  - `cleaning-collage.png`
- The collage was split into six separate crops using native Windows image processing and exported as:
  - `gc-desk-cleaning.png`
  - `gc-floor-cleaning.png`
  - `gc-team-supplies.png`
  - `gc-washroom-cleaning.png`
  - `gc-owner-portrait.png`
  - `gc-office-space-clean.png`
- Current section mapping:
  - Hero: `hero-office-team.png`
  - Trust section: `commercial-cleaner.png`
  - About: `gc-team-supplies.png`
  - Deep cleaning feature: `gc-floor-cleaning.png`
  - Commercial showcase: `gc-desk-cleaning.png`
  - Services sanitization showcase: `gc-washroom-cleaning.png`
  - Contact: `gc-office-space-clean.png`
  - Quote: `gc-owner-portrait.png`
- The temporary SVG illustrations remain in the repo but are no longer the primary Garden Cleaners media set.

## SEO confirmation
- Root Una Labs metadata was left intact.
- Garden Cleaners pages each have page-level metadata and canonical URLs.
- `robots.ts` was not changed.
- `sitemap.ts` now includes the Garden Cleaners routes.

## Local run
- `npm.cmd --prefix APPS/ftc-site run build`
- `npm.cmd --prefix APPS/ftc-site run dev`

## Recommended next steps
- Replace placeholder contact details with client-provided data.
- Replace placeholder testimonials with approved proof.
- If the client wants real lead delivery, set `GARDEN_CLEANERS_QUOTE_WEBHOOK_URL` in the deployment environment.
- If the client later provides brand colors or a proper wordmark, swap those in without touching the route structure or SEO setup.
