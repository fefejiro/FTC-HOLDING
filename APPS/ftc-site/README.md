# Una Labs Site

Next.js App Router site for the public-facing Una Labs build lab: products, client launches, the public ATEAM workflow, operator handoff, and project intake.

## Public route contract

- `/` Home
- `/products`
- `/work` (Client Launches)
- `/work/[slug]`
- `/ateam`
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
- Public workflow route: `http://localhost:3001/ateam`
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
2. Visitor opens `/ateam` and sees only four public modules: `Intake`, `System`, `Work`, and `Output`.
3. Visitor drops in one rough idea and answers the short clarifiers.
4. ATEAM turns the idea into a live run with visible state, jobs, timeline movement, and run-owned artifacts.
5. The output pack returns a recommended move, visual concept, prototype direction, build watch, and next step.
6. `Continue with Una Labs` opens `/work-with-ftc?from=ateam` with the workflow pack prefilled.
7. Operator users keep the full ATEAM Mission Control shell in the private operator deployment without leaking those controls into the public view.
8. Submitting the intake returns a success state with a request reference and response expectation.

## Public vs private ATEAM

- Public route: `/ateam`
- Public modules: `Intake`, `System`, `Work`, `Output`
- Private operator host: `https://ops.unalabs.cloud`
- Private operator proxy routes: `/ateam/operator/*` on the ops host, plus `/api/operator/ateam/*` for private JSON access

The public flow is intentionally narrowed so clients only see the trustworthy high-level system narrative. Office, Factory, approvals, logs, and overrides remain inside the operator control plane. On the public production host, the Cloudflare Worker currently owns `/ateam*`, so `/ateam/operator/*` is intentionally not exposed there.

Operator security model:

- browser auth happens through Cloudflare Access on `ops.unalabs.cloud`
- the ops worker verifies the Access identity and allowlisted email
- the ops worker validates the Access JWT against `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD`
- the ops worker injects trusted scope headers to Railway server-side only
- the public host never proxies private operator APIs
- if Access is not configured yet, the ops worker can enforce worker-level Basic Auth as a secure fallback

## Current launch mode

- Phase A canonical URL: `https://ftc.peacepad.ca`
- Phase B canonical URL target: `https://unalabs.cloud`
- Keep `peacepad.ca`, `www.peacepad.ca`, `api.peacepad.ca`, and `saywetin.app`
  production mappings unchanged in this rollout.

## Runtime configuration

Optional environment variables:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4 web stream id, enables analytics)
- `GOOGLE_SITE_VERIFICATION` (Search Console verification meta tag)
- `UNALABS_INTAKE_WEBHOOK_URL` (preferred webhook sink for intake submissions)
- `FTC_INTAKE_WEBHOOK_URL` (fallback webhook sink for compatibility)
- `UNALABS_CONFIRMATION_EMAIL_WEBHOOK_URL` (optional webhook for acknowledgment emails after intake submission)
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
