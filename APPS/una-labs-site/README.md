# Una Labs Site

**Live URL:** [unalabs.cloud](https://unalabs.cloud)  
**Deploy target:** Cloudflare Pages (`una-labs-site`)  
**Stack:** Next.js 15, React 19, Tailwind CSS 3, Supabase  
**Output:** Static export (`output: 'export'`)

---

## What it is

Una Labs is the agency marketing site and client-facing operating surface for FTC Holding. It hosts the public landing page, client intake, project portal, proposals, briefings, and reports — the full intake-to-delivery workflow for Una Labs projects.

Key surfaces:

| Route | Purpose |
|-------|---------|
| `/` | Public homepage |
| `/start` | Client intake form |
| `/portal?id=` | Client project portal |
| `/dashboard/proposal?id=` | Proposal view |
| `/dashboard/report?id=` | Progress report |
| `/dashboard/briefing?id=` | Client briefing packet |
| `/how-it-works` | Product explanation |
| `/solutions` | Industry solutions |
| `/pricing` | Pricing page |
| `/contact` | Contact form |
| `/demo` | Product demos |
| `/login` | Auth entry point |

---

## Local development

```bash
cd APPS/una-labs-site

# Install (from repo root, using workspaces)
npm install

# Dev server (port 3000)
npm run dev

# Lint
npm run lint

# Production build (static export to /out)
npm run build
```

> **Note:** This app requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to function. Copy `.env.example` if it exists, or set these variables in your shell or `.env.local`.

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | No | Site base URL (defaults to `https://unalabs.cloud`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | Google Analytics 4, only loads in production |
| `SPARK_ENABLED` | No | Set to `1` to enable the Spark AI chat widget |

---

## Architecture

```
app/                — Next.js App Router pages and route groups
components/         — Shared UI components
  layout/           — Header, Footer
  sections/         — Page-level content sections
  ui/               — Primitives: Button, Badge, ProductMockups
lib/                — Utilities: metadata helpers, site-content, constants
public/             — Static assets (images, og images)
supabase/           — Supabase client setup
DOCS/               — App-level documentation
```

Design tokens are defined in `tailwind.config.ts`. All components use Tailwind utility classes against those tokens — never hardcoded hex values.

---

## Deployment

Deployed automatically via Cloudflare Pages on push to `main`. Build command:

```
npm run build
```

Output directory: `out`

See `DOCS/UNA_WEBSITE_STANDARD_v1.md` for the full design token contract and delivery pattern.

---

## Key conventions

- Every page has metadata via `buildPageMetadata()` from `lib/metadata`.
- Auth-gated routes redirect to `/login?redirect=<encoded-url>` — never to a 404.
- Images are unoptimized (static export) — use `public/` for all image assets.
- The `sitemap.ts` and `robots.ts` files in `app/` handle SEO.

---

## Related docs

- `DOCS/LAUNCH-GATE.md` — launch readiness checklist
- `DOCS/UNA_WEBSITE_STANDARD_v1.md` — design system and delivery pattern standard
- `../../DOCS/UNA_LABS_SITE_DEPLOYMENT_SETUP.md` — Cloudflare Pages deployment setup
- `../../DOCS/UNALABS_TEST_PLAN.md` — full test plan
