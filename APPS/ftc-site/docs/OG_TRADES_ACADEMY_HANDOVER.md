# OG_Trades Academy Handover

## What was built

An OG_Trades Academy microsite was added inside the Una Labs Next.js app and is served from:

- `/og-trades-academy`
- `/og-trades-academy/about`
- `/og-trades-academy/course`
- `/og-trades-academy/resources`
- `/og-trades-academy/community`
- `/og-trades-academy/contact`

Related Una Labs portfolio route:

- `/work/og-trades-academy`

Lead endpoint:

- `POST /api/og-trades-leads`

## Core files

Content/config:

- `lib/ogTradesAcademy.ts`

Pages:

- `app/og-trades-academy/page.tsx`
- `app/og-trades-academy/about/page.tsx`
- `app/og-trades-academy/course/page.tsx`
- `app/og-trades-academy/resources/page.tsx`
- `app/og-trades-academy/community/page.tsx`
- `app/og-trades-academy/contact/page.tsx`

Components:

- `app/components/og-trades/OgTradesHero.tsx`
- `app/components/og-trades/OgTradesEnrollmentForm.tsx`
- `app/components/og-trades/OgTradesBrandMark.tsx`

Shared integration:

- `app/components/Header.tsx`
- `app/components/Footer.tsx`
- `app/sitemap.ts`
- `lib/recentWork.ts`
- `app/work/og-trades-academy/page.tsx`

Styling:

- `styles/globals.css`

Brand asset added locally:

- `public/images/brand/og-trades-logo.jpg`

## Assets and source references used

The build uses the user-supplied OG_Trades references rather than invented placeholders:

- Beacons profile: `https://beacons.ai/ogtradesacademy.com`
- Course checkout: `https://shop.beacons.ai/ogtradesacademy.com/f2481efd-649b-4c42-badf-f1626ace2ea3`
- Community hub: `https://tinyurl.com/ogtradesacademy`
- YouTube: `https://youtube.com/@og_tradesacademy`
- TikTok: `https://www.tiktok.com/@dobble__g`
- Profile image CDN: from Beacons
- Course image CDN: from Beacons
- Logo image: imported from user-provided local file into `public/images/brand/og-trades-logo.jpg`

## Lead flow behavior

The course/contact form posts to `POST /api/og-trades-leads`.

Validation includes:

- required name
- required email
- select-based enum validation
- honeypot field (`website`)
- anti-bot timing check (`startedAt`)

Optional webhooks:

- `OG_TRADES_LEADS_WEBHOOK_URL`
- `OG_TRADES_CONFIRMATION_WEBHOOK_URL`

Without those env vars, valid submissions still succeed but only log server-side.

## CTA and conversion decisions

Current intent:

- homepage should feel like a financial landing page, not a link-in-bio page
- direct purchase path should stay easy to reach
- course page should support both immediate checkout and question-first users

Changes made across iterations:

- removed redundant course-page CTA pairing where both actions effectively led to the same Beacons flow
- added direct OG header CTA (`Enroll Now`)
- kept course CTA focused on checkout first
- added mobile sticky bottom CTA bar on the course page

## Visual direction history

The OG pages went through several passes:

1. dark premium academy look
2. cleaner blue branded pass with real OG logo
3. brighter broker-style white/blue financial landing page

Current direction:

- bright white/blue broker-style shell
- white cards and navy copy
- blue CTA treatment
- darker market-data visual panel in the hero for contrast

This direction was requested explicitly by the user as a more typical bright New York forex broker page.

## Important constraints

- Do not introduce fake testimonials, fake student counts, or unsupported profit claims.
- Keep the financial-risk disclaimer in place.
- Treat the site as trading education, not financial advice.
- Preserve the real Beacons checkout URL unless the client supplies a replacement.

## Verification already completed

The site has been built locally multiple times with:

```powershell
npm.cmd run build
```

Production route checks were previously verified for:

- homepage and OG subpages returning `200`
- sitemap including OG routes
- live form endpoint accepting a valid submission

## Recent commits

Notable OG-related commits on `main` include:

- `3058a9f` Launch OG Trades Academy microsite
- `8b123c6` Streamline OG Trades checkout CTAs
- `28d512a` Improve OG Trades readability and mobile layout
- `f8d7f1a` Use OG Trades logo and blue brand accents
- `b994598` Polish OG header and tighten page spacing
- `395833a` Restyle OG site as bright broker landing page

## Follow-up ideas

- connect real lead webhook + confirmation email
- add blog/article content under a true OG content hub if needed
- replace the synthetic chart visual with a more polished finance dashboard mock if desired
- run a focused mobile QA pass on production after Cloudflare finishes propagating the latest design changes
