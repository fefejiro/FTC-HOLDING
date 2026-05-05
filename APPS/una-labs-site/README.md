# Una Labs Site

Next.js 15 static-export site for Una Labs — the AI-powered client delivery platform.

**Live URL:** [unalabs.cloud](https://unalabs.cloud)  
**Deploy target:** Cloudflare Pages (`una-labs-site`)  
**Build output:** `output: 'export'` → static site in `.next/`

---

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## Route contract

| Route | Description |
|-------|-------------|
| `/` | Home — hero, features, social proof, CTA |
| `/start-project` | Client intake form |
| `/demo` | Demo hub |
| `/demo/[slug]` | Product demo iframes |
| `/how-it-works` | Process explainer |
| `/pricing` | Pricing tiers |
| `/products` | Product index |
| `/product/[slug]` | Individual product page |
| `/solutions` | Solutions index |
| `/portal` | Client workspace (requires session) |
| `/dashboard` | Briefing, report, and proposal views |
| `/realtor` | Realtor-specific intake flow |
| `/about` | Company info |
| `/contact` | Contact page |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/status` | Platform status |
| `/login` | Auth entry point |
| `/blog/[slug]` | Blog post |
| `/sitemap.xml` | Auto-generated sitemap |
| `/robots.txt` | Auto-generated robots file |

---

## Content model

Product, solution, and case-study titles and metadata are curated in:

```
lib/site-content.ts
```

Do not derive labels from route slugs — always source from `site-content.ts`.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical base URL (defaults to `https://unalabs.cloud`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 web stream ID (optional) |
| `GOOGLE_SITE_VERIFICATION` | Search Console verification meta tag (optional) |
| `UNALABS_INTAKE_WEBHOOK_URL` | Webhook sink for intake form submissions |
| `UNALABS_CONFIRMATION_EMAIL_WEBHOOK_URL` | Webhook for acknowledgment emails |
| `UNALABS_PIPELINE_API_KEY` | Shared secret for pipeline stage recording |
| `UNALABS_PIPELINE_WEBHOOK_URL` | Webhook for downstream pipeline stage events |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

Copy `.env.example` to `.env.local` for local development.

---

## Architecture

- **Framework:** Next.js 15 App Router, static export
- **Styling:** Tailwind CSS v3
- **Fonts:** Inter + Plus Jakarta Sans (Google Fonts, self-hosted at build time)
- **Auth:** `@ftc/auth` package (Supabase-backed)
- **DB access:** `@ftc/supabase` package
- **AI widget:** `SparkWidget` — chat backed by `workers/stripe-api` Spark endpoints
- **Spark kill switch:** Set `SPARK_ENABLED=1` env var to enable the AI chat widget

---

## Deployment

Cloudflare Pages deploys automatically on push to `main`. No separate build command needed — Pages runs `npm run build` from this directory.

For manual deploy:

```bash
npm run build
npx wrangler pages deploy .next --project-name una-labs-site
```

---

## Related docs

- `DOCS/UNA_LABS_SITE_DEPLOYMENT_SETUP.md` — deployment configuration
- `DOCS/UNALABS_STATUS.md` — current project status
- `DOCS/UNALABS_TEST_PLAN.md` — test coverage and QA plan
- `DOCS/UNALABS_E2E_REPEATABLE_TEST_PLAN.md` — repeatable E2E test steps
- `DOCS/SPARK_ENV_VARS.md` — Spark AI feature env var reference
- `DOCS/LAUNCH-GATE.md` (inside `DOCS/`) — launch readiness checklist
