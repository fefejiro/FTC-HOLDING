# Una Labs Site

Next.js App Router site for the public-facing Una Labs build lab: products, client launches, business trust, and project intake.

## Public route contract

- `/` Home
- `/products`
- `/work` (Client Launches)
- `/work/[slug]`
- `/og-trades-academy`
- `/og-trades-academy/*`
- `/ateam` (legacy redirect route only)
- `/work-with-ftc` (Start a Project)
- `/capabilities` (Studio)
- `/about`

Legacy compatibility redirects:

- `/services` -> `/capabilities`
- `/case-studies` -> `/work`
- `/contact` -> `/work-with-ftc`

## Content model

Project and capability content is defined in:

- `lib/content.ts`

Primary interface:

- `ProjectCaseStudy`

## Component system

Reusable components used across pages:

- `Hero`
- `CapabilityCard`
- `ProjectCard`
- `ServiceCard`
- `CTABanner`

## Local commands

```powershell
npm run dev
npm run build
npm run test:e2e
npm run smoke:prod
```

The site runs on port `3001` (via `@ftc/config`).

## Local ATEAM integration

The real ATEAM app runs separately on port `3000` from `APPS/ATEAM`.

When Una Labs is running locally:

- Una Labs: `http://localhost:3001`
- Real ATEAM upstream: `http://127.0.0.1:3000`
- Public site redirect route: `http://localhost:3001/ateam`
- Preferred standalone ATEAM app host in production: `https://ateam.unalabs.cloud`
- Operator Mission Control proxy: `http://localhost:3001/ateam/operator`
- Deep links also proxy through: `/ateam/operator/office`, `/ateam/operator/factory`, `/ateam/operator/memory`, `/ateam/operator/team`

Optional override:

- `ATEAM_UPSTREAM_ORIGIN` lets you point the Una Labs proxy at a different ATEAM origin.

Example:

```powershell
$env:ATEAM_UPSTREAM_ORIGIN="http://127.0.0.1:3000"
npm run dev
```

Cloudflare Pages / Vercel-style build note:

- the build now includes a small compatibility step that mirrors `.next` into the monorepo path expected by the hosted build pipeline
- this keeps the existing stack intact and avoids introducing a new deployment service

## Core public journey

1. Visitor lands on the public site and learns what Una Labs offers.
2. Visitor chooses `Enter ATEAM` and is sent into the standalone ATEAM app at `https://ateam.unalabs.cloud`.
3. ATEAM opens as its own operating surface, not a marketing section inside the public site.
4. Operator users keep the full Mission Control shell in the private operator deployment without leaking those controls into the public site.
5. `/ateam` on the public site remains a compatibility redirect, not the canonical product surface.

## Public site vs standalone/private ATEAM

- Public site compatibility route: `/ateam`
- Preferred public ATEAM host: `https://ateam.unalabs.cloud`
- Private operator host: `https://ops.unalabs.cloud`
- Private operator proxy routes: `/ateam/operator/*` on the ops host, plus `/api/operator/ateam/*` for private JSON access

The public Una Labs site stays focused on company narrative, trust, proof, and CTA paths. ATEAM itself now belongs on its own host so it can feel like a live system instead of an embedded brochure section. The public site should link into ATEAM, not impersonate it. `/ateam` exists only as a compatibility redirect into the standalone host.

Operator security model:

- browser auth happens through Cloudflare Access on `ops.unalabs.cloud`
- the ops worker verifies the Access identity and allowlisted email
- the ops worker validates the Access JWT against `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`
- the ops worker injects trusted scope headers to Railway server-side only
- the public host never proxies private operator APIs
- if Access is not configured yet, the ops worker can enforce worker-level Basic Auth as a secure fallback

## Current launch mode

- Canonical URL: `https://unalabs.cloud`
- Brand hosts are routed at Cloudflare edge (Pages Function in `functions/_middleware.ts`)
- Garden hosts: `https://gardencleaners.ca`, `https://www.gardencleaners.ca`
- OG alias host: `https://og.unalabs.cloud`
- OG public domains are attached in Cloudflare but may remain pending until external DNS is updated:
  - `https://ogtradesacademy.com`
  - `https://www.ogtradesacademy.com`
- Keep `peacepad.ca`, `www.peacepad.ca`, `api.peacepad.ca`, and `saywetin.app`
  production mappings unchanged in this rollout.

## Runtime configuration

Optional environment variables:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4 web stream id, enables analytics)
- `GOOGLE_SITE_VERIFICATION` (Search Console verification meta tag)
- `UNALABS_INTAKE_WEBHOOK_URL` (preferred webhook sink for intake submissions)
- `FTC_INTAKE_WEBHOOK_URL` (fallback webhook sink for compatibility)
- `UNALABS_CONFIRMATION_EMAIL_WEBHOOK_URL` (optional webhook for acknowledgment emails after intake submission)
- `UNALABS_PIPELINE_API_KEY` (shared secret for internal pipeline stage recording at `/api/intake/pipeline`)
- `UNALABS_PIPELINE_WEBHOOK_URL` (optional webhook sink for downstream commercial stage events such as qualified lead, booked call, proposal sent, and closed/won)
- `ATEAM_UPSTREAM_ORIGIN` (origin for the real ATEAM runtime and workflow API proxy; defaults to `http://127.0.0.1:3000` in local dev)
- `UNALABS_OPS_SITE_URL` / `NEXT_PUBLIC_OPS_SITE_URL` (optional override for the private operator host; defaults to `https://ops.unalabs.cloud`)
- `UNALABS_SITE_URL` (preferred canonical URL override, for Phase B switch)
- `FTC_SITE_URL` (fallback canonical URL override)
- `UNALABS_REDIRECT_FROM_HOSTS` (comma-separated legacy hosts to 308 to canonical)
- `UNALABS_SMOKE_BASE_URL` and `UNALABS_SMOKE_PAGES_URL` (preferred smoke script vars)
- `FTC_SMOKE_BASE_URL` and `FTC_SMOKE_PAGES_URL` (fallback smoke vars)

Recommended public contact address:

- `hello@unalabs.cloud`

Recommended production secret setup:

- Point `UNALABS_INTAKE_WEBHOOK_URL` to your internal lead sink / automation.
- Point `UNALABS_CONFIRMATION_EMAIL_WEBHOOK_URL` to the endpoint that sends the user acknowledgment email.
- Use `UNALABS_PIPELINE_API_KEY` for internal scripts or automations that record downstream pipeline stages.

## Client handovers

Recent client-specific implementation notes live in `docs/`.

OG_Trades Academy handover:

- `docs/OG_TRADES_ACADEMY_HANDOVER.md`

## Revenue pipeline updates

You can record downstream sales stages without opening the internal mission-control page.

Command:

```bash
npm run pipeline:update -- --request-id UL-20260330-ABC123 --event lead_qualified --owner Mike --offer scoped-first-pass --source ateam_workflow
```

Examples:

```bash
npm run pipeline:update -- --request-id UL-20260330-ABC123 --event call_booked --booked-for "2026-04-02 2:30 PM ET" --owner Mike

npm run pipeline:update -- --request-id UL-20260330-ABC123 --event proposal_sent --proposal-id PROP-014 --value 2500 --notes "Scoped pack approved"

npm run pipeline:update -- --request-id UL-20260330-ABC123 --event project_closed_won --value 5000 --notes "Moved into build execution track"
```

Environment:

- `UNALABS_PIPELINE_API_KEY` for authenticated production requests
- `UNALABS_PIPELINE_BASE_URL` if you want to point the script somewhere other than `https://unalabs.cloud`
