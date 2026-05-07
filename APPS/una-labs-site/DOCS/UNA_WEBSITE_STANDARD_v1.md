# Una Labs Website Standard — v1.0

> **Status:** Active  
> **Applies to:** All Una Labs client-facing web surfaces (portal, dashboard, client sites, public marketing)  
> **Last updated:** 2026  
> **Maintained by:** Una Labs Engineering

---

## 1. Purpose

This document defines the canonical delivery pattern, component reuse rules, design token contracts, and quality bar for every web surface shipped under the Una Labs brand. Client sites (Garden Cleaners, OG Trades, Polar, Contrast, etc.) are stamped from this standard — deviation requires explicit sign-off.

---

## 2. Delivery Pattern

Every client engagement maps to the following sequential surface pattern:

```
Intake (/start)
  → Proposal (/dashboard/proposal?id=)
  → Contract (/dashboard/contract?id=)   [future sprint]
  → Client Portal (/portal?id=)
  → Progress Report (/dashboard/report?id=)
  → Client Briefing (/dashboard/briefing?id=)
  → Handover / Archive                   [future sprint]
```

Each surface is independently accessible via URL + `id` param. No surface may block access to a prior surface in the chain. Auth-gated surfaces must redirect to `/login?redirect=<encoded-url>` — never to a dead 404.

---

## 3. Design Tokens

All new surfaces must use these Tailwind tokens only. Never hardcode hex values.

### Color
| Token | Usage |
|---|---|
| `brand-teal` | Primary actions, CTAs, active states, progress indicators |
| `brand-orange` | Warnings, overdue states, highlight badges |
| `bg-offwhite` | Page background |
| `bg-subtle` | Card/section background |
| `border-border` | All card and divider borders |
| `tx-heading` | All `<h1>`–`<h3>` text |
| `tx-secondary` | Labels, subtitles |
| `tx-muted` | Supporting copy, timestamps |

### Typography classes
| Class | Usage |
|---|---|
| `text-display` | Hero/page titles |
| `text-h2` | Section headers |
| `text-h3` | Card headers |
| `text-h4` | Sub-card, sidebar headers |
| `text-body` | Default body copy |
| `text-body-sm` | Captions, footnotes, table cells |

### Spacing
- Use Tailwind scale only (`p-4`, `gap-6`, `mt-8`, etc.)
- No inline `style={{ margin: ... }}` except for computed layout values

---

## 4. Component Inventory

### Shared Components (`components/portal/`)

| Component | Purpose |
|---|---|
| `StageRail` | 7-step project stage progress rail |
| `ProjectClarityCards` | 4-KPI grid: where, what's next, blockers, confidence |
| `SectionCard` | Generic bordered section card wrapper |
| `normalizeStageId()` | Maps raw DB status string → STAGE_RAIL id |

### Global Components (`components/`)

| Component | Purpose |
|---|---|
| `AssistantDrawer` | Floating AI intent-based Q&A drawer (fixed bottom-right) |
| `templates/ClientSiteShell` | Reusable client site wrapper (see §5) |

### Rules
1. Never duplicate `StageRail` or `ProjectClarityCards` inline — always import from `components/portal/`
2. `AssistantDrawer` must be injected in: every portal page, every briefing page, every client site shell
3. `SectionCard` is the only approved card wrapper — no ad-hoc `div` + `border` + `rounded` combos
4. New shared components go into `components/portal/` (domain-specific) or `components/` (global)

---

## 5. Client Site Shell (`components/templates/ClientSiteShell.tsx`)

All external client sites (Garden, OG, Polar, Contrast) derive from `ClientSiteShell`. The shell provides:

- Header with client logo + project name
- Supabase auth check with redirect-to-login fallback
- Stage-aware navigation highlight
- `AssistantDrawer` injection point (always present)
- Footer with Una Labs attribution

**Parameterisation:**
- `clientName: string` — shown in header and footer
- `primaryColor?: string` — Tailwind class override for brand accent (default: `brand-teal`)
- `logoUrl?: string` — header logo image URL (optional, falls back to text wordmark)
- `children: React.ReactNode` — page content

**Never bypass the shell** to add custom auth logic. Extend via `children` only.

---

## 6. Auth Contract

- Auth check: `supabase.auth.getSession()` — all gated pages
- Unauthenticated: `router.push('/login?redirect=<current-url>')`
- No page may throw an uncaught error when session is missing — always handle `unauthenticated` state gracefully
- Magic link + password flows both supported via `@ftc/auth` — do not implement custom auth

---

## 7. Data Contract

- Portal + Briefing data: `/api/project-home` (via `getStripeApiUrl()`)
- Supabase direct reads: `project_artifacts`, `milestones`, `contracts`, `invoices`, `instant_bills`, `change_requests` tables
- Proposal + Report data: fetched from Supabase `projects` table directly
- No API call may be made at build time — all data fetching is client-side (static export constraint)
- All data fetches must handle `error` and `loading` states explicitly — no silent failures

---

## 8. Print / Export

- All briefing and report pages must be print-safe
- Use `print:hidden` on interactive chrome (buttons, nav, assistant drawer)
- Use `hidden print:block` for print-only content (generation timestamp, instruction footer)
- `window.print()` is the approved export trigger — no PDF libraries required at this stage

---

## 9. Quality Bar (Pre-Merge Checklist)

Before any PR merges to main:

- `npx tsc --noEmit` passes with zero errors
- `npm run build` completes with zero errors
- No `any` type except in explicitly commented legacy interop
- All new auth-gated pages handle `loading`, `unauthenticated`, `error`, and `ready` states
- All new pages respond to unknown or missing `?id` with a clear error message and never crash
- No hardcoded hex color values
- `AssistantDrawer` is present on all portal and client surfaces
- Print safety is verified on all report and briefing pages
- Responsive behavior is verified at 375px, 768px, and 1280px

---

## 10. Launch Gate Prerequisites

See `DOCS/LAUNCH-GATE.md` for the full per-project launch checklist.

A surface is considered **launch-ready** only when:
1. All milestones are marked `complete` or `approved`
2. Contract is signed
3. All outstanding invoices are paid
4. Briefing PDF has been generated and acknowledged by the client
5. Portal returns HTTP 200 with a valid project payload
6. No open client blockers in the portal action center

---

## 11. Versioning

- This document is `v1.0` — changes require a PR with `DOCS:` commit prefix
- Breaking changes (token renames, component removals) require a minor version bump and migration notes appended to this file
- All client sites reference the version they were built against in their `README.md`
