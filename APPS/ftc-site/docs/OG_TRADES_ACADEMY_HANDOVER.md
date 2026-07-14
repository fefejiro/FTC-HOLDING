# OG_Trades Academy Handover

## What was built

An OG_Trades Academy microsite was added inside the Una Labs Next.js app and is served from:

- approved production URL: `https://www.ogtradesacademy.com/`
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

Current implementation first attempts to persist valid submissions to Supabase table `og_trades_leads`, then optionally calls webhook and confirmation endpoints when those env vars are configured.

Optional webhooks:

- `OG_TRADES_LEADS_WEBHOOK_URL`
- `OG_TRADES_CONFIRMATION_WEBHOOK_URL`

Webhooks are delivery/notification enhancements, not a requirement for keeping the approved `www.ogtradesacademy.com` domain live.

Live lead persistence is not verified on production. On 2026-07-14, a controlled POST to `https://www.ogtradesacademy.com/api/og-trades-leads` returned `308` to the homepage instead of accepting JSON. Diagnostic POSTs to `https://og.unalabs.cloud/api/og-trades-leads` and `https://unalabs.cloud/api/og-trades-leads` returned `405`.

A no-DNS code fix was added in `public/_worker.js` to handle `POST /api/og-trades-leads` in the static Pages worker and persist to Supabase table `og_trades_leads`. Deploy that source fix without changing DNS/domain connection, then rerun controlled submission and Supabase readback.

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

- Real, approved testimonials are allowed and recommended for professionalism and conversion. They may use first name, initials, or anonymized descriptors if the source is real and permission is clear.
- Testimonial copy should focus on clarity, structure, confidence, discipline, mentorship, and community support.
- Do not introduce invented testimonials, fake student counts, unsupported profit claims, financial advice, or guaranteed trading outcomes.
- Keep the financial-risk disclaimer in place.
- Treat the site as trading education, not financial advice.
- Preserve the real Beacons checkout URL unless the client supplies a replacement.
- Do not change DNS, Cloudflare domain bindings, apex routing, or OG Trades connection settings. The current approved live domain is `https://www.ogtradesacademy.com/`.

## Verification already completed

The site has been built locally multiple times with:

```powershell
npm.cmd run build
```

Production route checks were previously verified for:

- homepage and OG subpages returning `200`
- sitemap including OG routes
- live form endpoint accepting a valid submission

Current-state audit on 2026-07-14:

- `https://www.ogtradesacademy.com/` returned HTTP `200`.
- `https://www.ogtradesacademy.com/course` returned HTTP `200`.
- `https://www.ogtradesacademy.com/about`, `/resources`, `/community`, and `/contact` returned HTTP `200`.
- `POST https://www.ogtradesacademy.com/api/og-trades-leads` returned HTTP `308` to the homepage, so lead capture is not verified on the approved production host.
- `public/_worker.js` now includes an OG lead handler for `POST /api/og-trades-leads`; it passed `node --check` and `npm run build`. Production deploy/runtime verification is still pending.
- Playwright Chromium was repaired locally and the live OG public spec passed 11 checks with 1 skipped enrollment API assertion:
  - command: `PLAYWRIGHT_BASE_URL=https://www.ogtradesacademy.com npx playwright test tests/og-trades-public.spec.ts`
  - result: 11 passed, 1 skipped
- Source CTAs were updated so OG page links use clean approved-domain paths such as `/course`, `/community`, and `/resources` rather than `/og-trades-academy/...` on the custom-domain experience.
- The apex `https://ogtradesacademy.com/` still redirects through Squarespace to `https://www.ogtradesacademy.com`; this is informational only and not a blocker because the approved production URL is the `www` host.
- Browser/headless link QA:
  - YouTube returned `200` and loaded `OG_Trades Academy - YouTube`.
  - TikTok returned `200`.
  - Instagram returned `200`.
  - Beacons profile returned Cloudflare `403`.
  - Beacons checkout returned Cloudflare `403`.
  - `tinyurl.com/ogtradesacademy` resolved to the Beacons checkout URL and returned Cloudflare `403`.
  - The Beacons/TinyURL results may be bot protection, but they need human browser confirmation before community/checkout links can be marked fully verified.

Recommended live QA command after browser repair:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://www.ogtradesacademy.com"
npx playwright test tests/og-trades-public.spec.ts
```

## Recent commits

Notable OG-related commits on `main` include:

- `3058a9f` Launch OG Trades Academy microsite
- `8b123c6` Streamline OG Trades checkout CTAs
- `28d512a` Improve OG Trades readability and mobile layout
- `f8d7f1a` Use OG Trades logo and blue brand accents
- `b994598` Polish OG header and tighten page spacing
- `395833a` Restyle OG site as bright broker landing page

## Follow-up ideas

- verify Supabase lead persistence with one controlled production QA submission
- connect real lead webhook + confirmation email if OG wants additional delivery/notification automation
- collect and publish real approved testimonials focused on learning clarity, structure, mentorship, discipline, and community
- add blog/article content under a true OG content hub if needed
- replace the synthetic chart visual with a more polished finance dashboard mock if desired
- run a focused mobile QA pass on `https://www.ogtradesacademy.com/`
