# Reusable Static Site Playbook

## Purpose

Use this foundation for a concise, credible, content-led website where a
database, authentication and a CMS are not justified. It is designed for
community organisations, professional services and small programmes that need
to be clear, accessible, fast and straightforward to maintain.

It is a foundation, not a copy-and-paste identity. Each launch must receive its
own approved content, brand assets, photographs, canonical domain and legal or
governance review.

## Reusable architecture

| Need | Reusable part |
| --- | --- |
| Shared visual system | `src/styles/global.css` design tokens and local fonts |
| Editable organisation content | `src/content/site.ts` |
| Shared metadata and page frame | `src/layouts/PageLayout.astro` |
| Navigation and footer | `src/components/Header.astro` and `src/components/Footer.astro` |
| Standard site journeys | Home, About, Programmes or Services, Partner with us, Contact |
| Lightweight interactivity | Progressive JavaScript only for the mobile menu and hero-photo controls |
| Deployment | Static Astro output on Cloudflare Pages |

## Start a new client site

1. Create an isolated branch or worktree and duplicate only the
   `APPS/skillful-hands` app as the new application. Do not modify unrelated
   FTC applications.
2. Rename the workspace package and update the new app's `astro.config`,
   canonical URL, manifest, sitemap, robots rules and Cloudflare Pages project
   details.
3. Replace all editable organisation data in `src/content/site.ts`: name,
   email, navigation, copy, programmes or services, social links and metadata.
4. Replace brand tokens, fonts and the logo. Use the supplied logo artwork,
   never recreate a distinctive logo using web fonts.
5. Add only approved, permissioned photographs. Optimise their dimensions and
   provide accurate alt text. If a small photo sequence communicates more than
   one static image, keep it restrained, pauseable and reduced-motion safe. Do
   not use a carousel for programme navigation when compact static links are
   clearer.
6. Keep calls to action real. Use an internal route for fuller context and a
   meaningful endpoint such as `mailto:` only where email is the agreed contact
   journey.
7. Update every visible claim to verified client copy. Never infer numbers,
   testimonials, partners, awards, accreditations, funding or impact claims.

## Contact pattern

Use `mailto:recipient@example.org?subject=...&body=...` for a zero-backend
email action. It opens the email handler configured on the visitor's own
device. The site cannot and should not force Outlook, Gmail or a particular
application. Always provide a clear label such as "Open your email app" and a
plain direct email link as a fallback.

## Quality gates

Before release, confirm:

- Build succeeds with `npm run build --workspace=@ftc/<app>`.
- All pages, navigation, primary calls to action and contact links work.
- Responsive visual QA covers 375px, 430px, 768px, 1024px and 1440px.
- Keyboard QA covers the skip link, visible focus states, mobile-menu Escape
  behaviour and focus return, hero-photo controls and all primary links.
- No horizontal overflow, clipped text, excessive blank areas or distorted
  images appear at those sizes.
- `prefers-reduced-motion` limits animation and any carousel can be paused.
- Metadata, canonical URL, Open Graph details, JSON-LD, sitemap, robots and
  manifest match the approved public identity.
- Production verification distinguishes build evidence from live DNS, HTTPS,
  redirects and route evidence.
- On final visual review, remove decorative ribbons that compete with copy,
  keep programme imagery prominent with a generous two-column desktop layout,
  stack image before copy on mobile, and size the full logo clearly in the
  footer.

## Cloudflare Pages release

Use the app's Cloudflare runbook and deploy the generated `dist` directory to
the app's dedicated Pages project. Connect the custom domain only after the
client has authorised the Cloudflare project and DNS changes. Confirm the apex
domain, any agreed `www` redirect, HTTPS and canonical URL in a live browser
before calling the launch complete.

## What remains deliberately out of scope

Do not add a database, user accounts, CMS, tracking suite or backend merely
because the foundation is reusable. Add them only when the client has a defined
operational need, data owner, privacy basis, budget and maintenance plan.
