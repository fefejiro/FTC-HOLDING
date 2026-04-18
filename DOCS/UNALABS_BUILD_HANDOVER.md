# Una Labs — Build Handover & Implementation Plan
Last updated: 2026-04-18
Author: Claude (Sonnet 4.6) via Mike (fejiro007)

---

## READ THIS FIRST — CRITICAL CONTEXT

This document is the single source of truth for continuing Una Labs development.
It is written for Claude Code, Codex, or any developer picking this up cold.

**Do not re-architect. Do not simplify. Follow the deploy path exactly.**

---

## What Is Una Labs

Una Labs (`unalabs.cloud`) is a professional services platform under FTC HOLDING.
It is the public face of a suite of real, deployed products:

| Product | URL | What it is |
|---|---|---|
| Una Labs (marketing + SaaS) | `unalabs.cloud` | The platform clients buy |
| Dispatch | `dispatch.unalabs.cloud` | Live Ottawa roadside dispatch system (client product) |
| PeacePad | `peacepad.ca` | AI conflict mediation, web + mobile + browser extension |
| Saywetin | `saywetin.app` | Nigerian language/music intelligence, web + mobile |
| ATEAM | internal only | AI orchestration engine — powers Una Labs backend, never customer-facing |

ATEAM is NOT a customer product. It is the internal AI engine that processes Una Labs intakes.
Position: "The engine room. We built it. That's why delivery is different."

---

## Repo Structure (Relevant Parts)

```
C:\FTC HOLDING\                         ← git root
├── APPS\
│   ├── una-labs-site\                  ← Next.js 15 static export → unalabs.cloud
│   ├── dispatch\                       ← Vite + Railway → dispatch.unalabs.cloud
│   ├── peacepad\                       ← Next.js + Railway → peacepad.ca
│   ├── saywetin\                       ← Next.js + Railway → saywetin.app
│   ├── ATEAM\                          ← Local-only AI orchestration (bridge + Telegram)
│   └── peacepad-extension\             ← Chrome/browser extension (WhatsApp/Gmail/Slack)
├── workers\
│   └── stripe-api\                     ← Cloudflare Worker → una-stripe-api.workers.dev
│       ├── src\index.ts                ← Worker source (DO NOT add API routes to the site)
│       ├── wrangler.toml
│       └── setup-secrets.ps1
├── PACKAGES\                           ← Shared: auth, config, logger, supabase, types
└── DOCS\                               ← All handover + architecture docs
```

---

## Una Labs Site — Tech Stack

- **Framework:** Next.js 15, `output: 'export'` (static — NO server-side routes, NO API routes)
- **Styling:** Tailwind CSS with custom design tokens (see `tailwind.config.ts`)
- **Deploy target:** Cloudflare Pages, project name `ftc-site-pages`
- **Domain:** `unalabs.cloud`
- **Payment backend:** Separate Cloudflare Worker (`una-stripe-api`)

**CRITICAL:** The site is a static export. You CANNOT add `app/api/` routes. All backend logic lives in the Worker.

---

## ⚠️ DEPLOY PATH — MEMORIZE THIS

### Deploy the Site (una-labs-site → unalabs.cloud)

```powershell
Set-Location "c:\FTC HOLDING\APPS\una-labs-site"
npm run build
npx wrangler pages deploy out --project-name=ftc-site-pages --branch=main
```

**Common mistakes:**
- Running `wrangler` from root `C:\FTC HOLDING` fails — it sees the root `wrangler.toml` (a different project)
- Running `git push` does NOT deploy the site — Pages is not wired to git auto-deploy
- The build output is `out/` (static export), not `.next/`

### Deploy the Stripe Worker

```powershell
Set-Location "c:\FTC HOLDING\workers\stripe-api"
npx wrangler deploy
```

### Set a Worker Secret (PowerShell — note: must use `echo` pipe, not CLI stdin)

```powershell
Set-Location "c:\FTC HOLDING\workers\stripe-api"
cmd /c "echo YOUR_VALUE_HERE" | npx wrangler secret put SECRET_NAME
```

**CRITICAL — BOM issue:** PowerShell stdin pipes add a UTF-8 BOM (U+FEFF) to values.
The worker's `cleanSecret()` function already strips this. Never remove that function.

---

## What Is Live and Working (as of 2026-04-18)

| Feature | Status | Notes |
|---|---|---|
| `unalabs.cloud` | ✓ Live | Full marketing site |
| `/start` intake form | ✓ Live | 2-step: details → plan picker |
| `/start/summary` + Stripe | ✓ Live | Stripe Checkout, 14-day trial, CAD |
| `/confirmation` | ✓ Live | Verifies session, fires webhooks |
| Stripe Worker | ✓ Live | `una-stripe-api.fejiro-efiuvwere.workers.dev` |
| Live Stripe key | ✓ Set | `rk_live_...` in worker secrets |
| Live prices (all 8) | ✓ Set | All CAD monthly + annual in worker secrets |
| RBC bank account | ✓ Connected | Payouts → RBC |
| `/how-it-works` | ✓ Live | 4-step interactive, mockups, FAQ |
| `/pricing` | ✓ Live | All 4 plans with toggle |
| `/demo` | ✗ Missing | Homepage CTA links here — 404 |
| Login → real auth | ✗ Placeholder | Form renders, no backend |
| Industry tabs (filter) | ✗ Broken | Tabs exist, content doesn't change |
| Webhooks (admin notify) | ✗ Not set | `UNALABS_NEW_PROJECT_WEBHOOK_URL` empty |
| ATEAM → intake wire | ✗ Not built | Highest priority real-product step |

---

## Stripe Configuration

| Secret | Value | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `rk_live_51TMK0E5M2AZUCbRe...` | OAuth restricted live key |
| `STRIPE_PRICE_STARTER_MONTHLY` | `price_1TNbbd5M2AZUCbReEyubdwVq` | CA$67/mo |
| `STRIPE_PRICE_STARTER_ANNUAL` | `price_1TNbbe5M2AZUCbReJQVY14Qs` | CA$684/yr |
| `STRIPE_PRICE_PROFESSIONAL_MONTHLY` | `price_1TNbbd5M2AZUCbRep5dLdnJ0` | CA$135/mo |
| `STRIPE_PRICE_PROFESSIONAL_ANNUAL` | `price_1TNbbe5M2AZUCbReo3Ssc2tk` | CA$1,296/yr |
| `STRIPE_PRICE_AGENCY_MONTHLY` | `price_1TNbbd5M2AZUCbRe5rCIGwQJ` | CA$339/mo |
| `STRIPE_PRICE_AGENCY_ANNUAL` | `price_1TNbbe5M2AZUCbRe89sEZlDU` | CA$3,252/yr |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | `price_1TNbbd5M2AZUCbReTSrmgs8Q` | CA$679/mo |
| `STRIPE_PRICE_ENTERPRISE_ANNUAL` | `price_1TNbbe5M2AZUCbRekGVcW0SP` | CA$6,516/yr |
| `UNALABS_SITE_URL` | `https://unalabs.cloud` | In wrangler.toml vars |

Worker URL: `https://una-stripe-api.fejiro-efiuvwere.workers.dev`
Stripe account: `acct_1TMK0E5M2AZUCbRe` (fejiro.efiuvwere@gmail.com)

---

## Implementation Plan — What to Build Next

### Phase 1 — Fix Broken Things (Priority: Immediate, ~3–4 hours total)

#### 1A. Create `/demo` page
**File:** `APPS/una-labs-site/app/demo/page.tsx` (new)
**What:** Tabbed page with embedded Loom recordings, one per product.
The homepage has `ctaSecondaryHref="/demo"` — this 404s right now.

Structure:
```
Hero: "See Una Labs in action"
Tabs: [All] [Intake & Scoping] [Delivery Tracking] [AI Automation] [Payments]
Each tab: Loom embed + 2-line caption + CTA to /start
Below: "These aren't mockups. These are real products we've built and deployed."
Product cards: Dispatch | PeacePad | Saywetin (link to live URLs)
```

Loom URLs: Mike records these — screen captures of:
1. `unalabs.cloud/start` flow (intake → summary → Stripe)
2. `dispatch.unalabs.cloud` (submit request → operator queue → status)
3. PeacePad preflight API or extension in action
4. (Optional) Saywetin language recognition

**Why real products:** Una Labs' demo IS the real deployed suite. Not mockups.
This is the competitive moat — Ignition records walkthroughs of their own SaaS.
Una Labs shows real client products. Different category entirely.

#### 1B. Fix industry tabs in HowItWorksContent
**File:** `APPS/una-labs-site/components/sections/HowItWorksContent.tsx`
**What:** `activeTab` state exists but nothing conditionally renders based on it.
The 4-step STEPS array should vary per tab, or at minimum the intro copy should change.

Minimum fix — change the headline/subheadline per tab:
```typescript
const TAB_CONTEXT = {
  'All': { headline: 'How a request becomes delivery', sub: 'Four governed stages...' },
  'Agencies': { headline: 'How agencies deliver without scope creep', sub: 'Client intake...' },
  'Professional Services': { headline: 'Structured delivery for professional teams', sub: '...' },
  'SaaS Teams': { headline: 'Ship features with governed delivery', sub: '...' },
  'Accounting': { headline: 'Structured client delivery for accounting firms', sub: '...' },
}
```

#### 1C. Fix broken product page hrefs
**File:** `APPS/una-labs-site/components/sections/HowItWorksContent.tsx`
These feature grid hrefs 404:
- `/product/approval-sign-off` → change to `/how-it-works`
- Payments card href → `/pricing` (not `/product/intake-scoping`)

#### 1D. Add ATEAM page
**File:** `APPS/una-labs-site/app/ateam/page.tsx` (new)
**What:** Single quiet page. No pricing. No CTA to sign up.
Content:
```
Headline: "ATEAM — The engine behind Una Labs"
Body: ATEAM is the AI orchestration layer we built internally to power Una Labs.
Every project that comes through the platform is processed, scoped, and tracked by ATEAM.
We didn't buy it. We built it.

[What ATEAM does]
- Reads intake submissions and generates structured scopes
- Tracks project state and milestone progression
- Fires notifications and generates delivery reports
- Powers the AI automation behind every Una Labs engagement

Footer note: "ATEAM is not a customer product. It is our internal operating system.
If you're a technical partner or investor and want to learn more: hello@unalabs.cloud"
```

Add to nav (subtle): Footer only, or a small link in the About page. Not in main nav.

---

### Phase 2 — Make the Product Real (Priority: High, ~1–2 days)

#### 2A. Wire ATEAM to intake webhook
**What:** When a customer completes Stripe checkout, `/confirmation` fires `POST /api/activate-project`.
That worker currently sends a webhook to `UNALABS_NEW_PROJECT_WEBHOOK_URL` (currently empty).

**Steps:**
1. Start ATEAM bridge: `cd APPS/ATEAM && node Server/bridge.js`
2. Expose via cloudflared: `tmp-bin\cloudflared.exe tunnel --url http://127.0.0.1:3001`
3. Set the tunnel URL as the webhook secret:
   ```powershell
   Set-Location "c:\FTC HOLDING\workers\stripe-api"
   cmd /c "echo https://YOUR-TUNNEL.trycloudflare.com/task" | npx wrangler secret put UNALABS_NEW_PROJECT_WEBHOOK_URL
   ```
4. ATEAM receives: `{ type: 'una_new_subscription', activation: { email, tier, billing, intake_id } }`
5. ATEAM processes → Claude generates scoped brief → emails client

**Result:** First real paying customer gets an AI-generated proposal. Product is real.

#### 2B. Add `/products/` portfolio section
New pages showing real deployed products as case studies:
- `unalabs.cloud/products/dispatch` — "We built a live dispatch system for Ottawa"
- `unalabs.cloud/products/peacepad` — "AI conflict mediation, web + mobile + browser extension"
- `unalabs.cloud/products/saywetin` — "Language intelligence for Nigerian culture"

Each page: what it is, what we built, live link, CTA to commission similar work via /start.

**Why:** This is the portfolio that replaces fake testimonials. Real products > made-up quotes.

---

### Phase 3 — Real Product Dashboard (Priority: Medium, ~1 week)

#### 3A. Supabase schema for projects
```sql
-- projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  intake_id text,
  email text,
  tier text,
  billing text,
  stripe_session_id text,
  status text default 'intake', -- intake | scoping | proposal | active | delivered
  created_at timestamptz default now()
);

-- milestones table
create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id),
  title text,
  status text default 'pending', -- pending | in_progress | complete
  due_date date,
  completed_at timestamptz
);
```

#### 3B. Real dashboard at `/dashboard`
Replace CSS mockup with real Supabase data.
ATEAM writes project state to Supabase when processing intake.
Dashboard reads it via Supabase client.

#### 3C. Real login → dashboard
Connect `/login` to Supabase auth (magic link or email/password).
Use existing `PACKAGES/auth` package — it already exists.
On login, redirect to `/dashboard` showing their projects.

---

### Phase 4 — Social Content / Demo Videos (Parallel, anytime)

Record with Loom or OBS:
1. `unalabs.cloud/start` → summary → Stripe (2 min)
2. `dispatch.unalabs.cloud` full flow (3 min)
3. PeacePad extension on WhatsApp Web (60 sec — social hook)
4. Saywetin language recognition (60 sec)

Cut each into:
- Full version → embed in `/demo` page
- 60-second version → Instagram/LinkedIn Reel
- Screenshot stills → Twitter/X posts

---

## Key Design Tokens (for any new pages)

```
Colors:
  brand-teal: #4DB8A8          (primary)
  brand-orange: #FF3D00        (accent)
  tx-heading: #1A1A2E          (headings)
  tx-secondary: #4A4A6A        (body)
  bg-offwhite: #F8F8FC         (page backgrounds)
  border: #E5E5F0              (borders)

Font sizes (Tailwind classes):
  text-display    → hero headlines
  text-h2         → section headlines
  text-body-lg    → lead paragraphs
  text-body       → standard body
  text-body-sm    → secondary info
  text-caption    → labels/tags

Components available:
  <Badge variant="teal|orange" />     → `components/ui/Badge.tsx`
  <Button variant="primary|secondary|ghost" size="sm|md|lg" href="..." />
  <FinalCTASection />                  → reusable bottom CTA
  <Header /> <Footer />               → layout
```

---

## File Locations — Quick Reference

| What | Where |
|---|---|
| Site pages | `APPS/una-labs-site/app/` |
| Site components | `APPS/una-labs-site/components/` |
| Site constants/config | `APPS/una-labs-site/lib/` |
| Stripe Worker source | `workers/stripe-api/src/index.ts` |
| Worker config | `workers/stripe-api/wrangler.toml` |
| Worker secrets setup | `workers/stripe-api/setup-secrets.ps1` |
| ATEAM bridge | `APPS/ATEAM/Server/bridge.js` |
| ATEAM entry UI | `APPS/ATEAM/Public/index.html` + `app.js` |
| Dispatch app | `APPS/dispatch/client/src/` |
| Shared packages | `PACKAGES/` |
| This document | `DOCS/UNALABS_BUILD_HANDOVER.md` |
| Stripe handover | `DOCS/stripe-setup-handover.md` |
| Ecosystem map | `DOCS/UNALABS_ECOSYSTEM_MAP.md` |

---

## How to Start a New Session (Claude or Codex)

Paste this at the start of every new session:

```
Read these files before doing anything:
1. C:\FTC HOLDING\DOCS\UNALABS_BUILD_HANDOVER.md  ← START HERE
2. C:\FTC HOLDING\CLAUDE.md
3. C:\FTC HOLDING\DOCS\stripe-setup-handover.md

Context:
- Working on Una Labs (unalabs.cloud) — Next.js 15 static export on Cloudflare Pages
- Stripe payments are live (rk_live key set, all 8 prices set, RBC connected)
- Site deploys via: cd APPS/una-labs-site && npm run build && npx wrangler pages deploy out --project-name=ftc-site-pages --branch=main
- DO NOT run wrangler from the repo root (wrong project)
- DO NOT add API routes to the Next.js app (static export only)
- The Stripe Worker is separate: cd workers/stripe-api && npx wrangler deploy

Current task: [DESCRIBE WHAT YOU WANT TO BUILD FROM THE PLAN ABOVE]
```

---

## Known Gotchas (Do Not Repeat These Mistakes)

| Gotcha | What happens | Fix |
|---|---|---|
| Run `wrangler` from repo root | Targets wrong project (root wrangler.toml) | `Set-Location "c:\FTC HOLDING\workers\stripe-api"` first |
| Pipe secrets via PowerShell | BOM (U+FEFF) prepended to value | Use `cmd /c "echo VALUE"` pipe, not direct PS pipe |
| Add `app/api/` routes to site | Build fails — static export | All backend → Worker |
| `rk_live_` key via Stripe CLI | Can't create products/prices | Use `Invoke-RestMethod` against REST API directly |
| Path with spaces in PowerShell | Command fails | Always quote paths or `Set-Location` first |
| `git push` to deploy site | Nothing happens | Must run `wrangler pages deploy` manually |
| Dynamic routes without `runtime="edge"` | CF Pages build fails | Add `export const runtime = 'edge'` to dynamic pages |

---

## Contacts & Accounts

| Service | Account | Notes |
|---|---|---|
| Cloudflare | fejiro007 | Pages + Workers |
| Stripe | fejiro.efiuvwere@gmail.com | acct_1TMK0E5M2AZUCbRe |
| Railway | — | peacepad + saywetin + dispatch backends |
| Supabase | — | Shared project, dispatch.* schema isolated |
| Domain | unalabs.cloud | Cloudflare DNS |

---

*End of handover. If something is unclear, read the file it references before assuming.*
