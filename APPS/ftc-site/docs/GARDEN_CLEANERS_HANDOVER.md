# Garden Cleaners Demo Build Handover

## Summary of changes
- Added a new isolated Garden Cleaners subsite under `/garden-cleaners` inside the existing ftc-site app.
- Reused the existing Una Labs marketing-site shell, CTA patterns, form behavior, route layout, and design primitives.
- Added route-aware header and footer behavior so Garden Cleaners gets its own brand chrome within the subsite.
- Added a dedicated quote request form and API route for demo-ready client presentation.
- Added local SEO metadata for each Garden Cleaners page and updated the sitemap.

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
- `app/components/garden-cleaners/GardenTrustStrip.tsx`
- `app/components/garden-cleaners/GardenServiceCard.tsx`
- `app/components/garden-cleaners/GardenTestimonials.tsx`
- `app/components/garden-cleaners/GardenFaqList.tsx`
- `app/components/garden-cleaners/GardenQuoteForm.tsx`
- `lib/gardenCleaners.ts`

## Files modified
- `app/components/Header.tsx`
- `app/components/Footer.tsx`
- `app/sitemap.ts`
- `styles/globals.css`

## Placeholder content requiring replacement later
- Phone: `(905) 000-0000`
- Email: `hello@gardencleaners.ca`
- Address: `Oshawa, Ontario, Canada`
- Testimonials are polished placeholders for demo use and should be replaced with real client proof before launch.

## Demo behavior
- Quote form validates required fields and submits to `/api/garden-cleaners-quote`.
- If `GARDEN_CLEANERS_QUOTE_WEBHOOK_URL` is configured, submissions forward there.
- If not configured, the form still returns a clean success message so the demo remains functional.

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
