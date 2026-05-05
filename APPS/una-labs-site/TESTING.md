# Una Labs Site — Testing

## Commands

Run from `APPS/una-labs-site/`:

```bash
# Lint (ESLint + Next.js rules)
npm run lint

# TypeScript check (no emit)
npx tsc --noEmit

# Production build — catches route and compilation errors
npm run build
```

There are no automated test scripts in this package. See the manual QA checklist below.

> For the full test plan including worker and admin surfaces, see `../../DOCS/UNALABS_TEST_PLAN.md`.

---

## Manual QA checklist

Run these checks against the live site (`https://unalabs.cloud`) or against a local dev build (`npm run dev`).

### Public marketing routes

- [ ] `/` — Homepage loads, hero copy renders, CTA buttons are present and linked
- [ ] `/how-it-works` — Full-page load, all sections visible
- [ ] `/pricing` — Pricing tiers display correctly
- [ ] `/solutions` — Page loads, no broken images
- [ ] `/contact` — Contact form renders, submit shows a response (success or error message)
- [ ] `/demo` — Demo embeds load (check console for iframe errors)
- [ ] `/products/dispatch` — Product page loads with correct content
- [ ] `/products/peacepad` — Product page loads
- [ ] `/products/saywetin` — Product page loads

### Intake funnel

- [ ] `/start` — Intake form renders all steps
- [ ] Intake form submission → project created → redirect to portal or confirmation

### Auth flows

- [ ] `/login` — Login form renders, Supabase auth request fires
- [ ] Authenticated redirect: accessing `/portal` while logged out → redirects to `/login?redirect=...`
- [ ] After login → redirect returns user to the intended route

### Client-facing surfaces (requires a test project ID)

- [ ] `/portal?id=<id>` — Portal loads, project data renders
- [ ] `/dashboard/proposal?id=<id>` — Proposal renders with correct scope and pricing
- [ ] `/dashboard/report?id=<id>` — Report loads, milestones visible
- [ ] `/dashboard/briefing?id=<id>` — Briefing packet renders

### Error and resilience surfaces

- [ ] `/nonexistent-page` — `not-found.tsx` renders (404 page, not a blank/crash)
- [ ] Client-side error scenario — `error.tsx` shows "Something went wrong" with try-again and home buttons
- [ ] Loading state — `loading.tsx` skeleton renders during page transition (if Suspense boundaries are in use)

### SEO and metadata

- [ ] `<title>` is present and correct on `/`, `/pricing`, `/how-it-works`
- [ ] OG image tag points to `/images/og/default.png` (verify file exists in `public/`)
- [ ] `/robots.txt` — accessible and correct
- [ ] `/sitemap.xml` — accessible, lists key public routes

### Navigation

- [ ] Header links work on desktop and mobile
- [ ] Footer links resolve (no dead 404s)
- [ ] Mobile nav opens and closes correctly

---

## Build gate (required before deploy)

All of these must pass before merging to `main`:

1. `npm run lint` — zero errors
2. `npx tsc --noEmit` — zero TypeScript errors
3. `npm run build` — static export succeeds, `out/` directory generated

---

## What is not tested here

- Admin workflows (see `../../DOCS/UNALABS_TEST_PLAN.md`)
- Stripe webhook flows (see `../../workers/stripe-api/`)
- Supabase data migrations (see `../../DOCS/supabase-una-labs-schema.sql`)
- Spark AI chat widget (see `../../DOCS/SPARK_ENV_VARS.md`)

---

## Last verified

| Check | Date | Result |
|-------|------|--------|
| `npm run build` passes | — | Not yet run in this session |
| Homepage loads on unalabs.cloud | — | Not yet verified |
| Auth redirect works | — | Not yet verified |
