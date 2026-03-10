# Client Logo Strip Handover

Date: 2026-03-10
Project: `APPS/ftc-site`
Canonical repo root: `C:\FTC HOLDING`

## 1. Summary of Changes

Added a premium homepage credibility section titled `Selected clients` directly below the hero and above the studio / builder section.

The section uses a reusable `ClientLogoStrip` component and presents FTC direct-client logos in a quiet, premium trust-strip treatment.

## 2. Files Modified

- `app/page.tsx`
- `styles/globals.css`

## 3. Files Created

- `app/components/ClientLogoStrip.tsx`
- `docs/CLIENT_LOGO_STRIP_HANDOVER.md`
- `public/images/clients/Canadian Tire Logo .jpg`
- `public/images/clients/lcbo-logo-1097364160.jpg`
- `public/images/clients/Ontario Government Logo.png`
- `public/images/clients/The_Home_Depot-Logo .png`

## 4. Expected Logo Asset Folder and Filename Mapping Placeholder

Current expected folder:

- `public/images/clients/`

Current filename mapping wired in `ClientLogoStrip.tsx`:

- `LCBO` → `/images/clients/lcbo-logo-1097364160.jpg`
- `Canadian Tire` → `/images/clients/Canadian Tire Logo .jpg`
- `Home Depot` → `/images/clients/The_Home_Depot-Logo .png`
- `Ontario Government` → `/images/clients/Ontario Government Logo.png`

If filenames change later, update the `clientLogos` array inside:

- `app/components/ClientLogoStrip.tsx`

## 5. Placement Location on Homepage

The section is placed:

- below the homepage hero
- above the studio / builder section

This preserves the existing narrative while adding credibility early in the page flow.

## 6. Responsive Behavior Notes

- desktop: four-column balanced logo strip
- tablet: two-column grid
- small mobile: single-column stack
- logos are centered and normalized visually through constrained height and grayscale styling
- cards use subtle hover only; no loud border treatment

## 7. SEO Preserved Confirmation

Confirmed for this pass:

- no route names changed
- homepage H1 preserved
- metadata untouched
- canonical behavior untouched
- sitemap untouched
- robots untouched
- no blog route or metadata changes

## 8. Follow-Up Note

The final exact filenames are currently wired from the provided asset set. If replacement assets or cleaner SVG versions are later provided, update only the `clientLogos` list and keep the section structure unchanged.
