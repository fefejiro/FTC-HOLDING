# Copilot Handover - Garden Cleaners

Date: 2026-05-01  
Project: Garden Cleaners  
Audience: GitHub Copilot / Agent Mode / implementation agents  
Authority: Codex CTO lane validates before commit or client-facing claims

## Purpose

This document gives Copilot the current Garden Cleaners truth, known plans, current dirty work, and dev workflow rules.

Use this before touching Garden Cleaners code, docs, QA, SMTP/auth, portal, or handoff files.

## CTO / Dev Authority Model

The CTO lane decides:

- scope
- GO/HOLD/NO-GO
- client-facing claims
- commit approval
- production handoff readiness

Copilot/Agent Mode is a bounded implementation worker.

Copilot must:

- inspect exact files first
- keep edits scoped
- avoid secrets
- run requested checks
- report facts
- wait for CTO approval before commit

Copilot must not:

- stage unrelated files
- commit without explicit instruction
- mark production ready without QA evidence
- reopen resolved SMTP issues without new evidence
- overwrite telemetry/status files with stale assumptions

## Current Status

Garden Cleaners current MVP status:

- Controlled walkthrough: GO
- Full handoff: GO pending final owner/client acceptance and security signoff
- Technical blocker: none known for current MVP handoff
- SMTP/email sender issue: resolved
- Latest remaining work: uncommitted Garden UI/header/portal polish needs visual QA and commit approval

## Live URLs

```text
https://gardencleaners.ca
https://gardencleaners.ca/garden-cleaners/portal
https://gardencleaners.ca/garden-cleaners/portal#portal-access
```

## Production Admin Accounts

```text
fejiro.efiuvwere@gmail.com
uby400@gmail.com
```

Do not share passwords. Use invite/reset/login flows only.

## Email / SMTP Truth

Resolved and committed:

```text
e05855d1 docs(garden): mark custom SMTP verified and handoff ready
```

Current truth:

- SMTP provider: Resend
- Sender display name: FTC Client Portal
- Sender email: no-reply@unalabs.cloud
- Resend domain: verified
- Supabase SMTP: enabled
- Gmail sender display: verified as FTC Client Portal
- Auth email body/header: FTC Client Portal
- Magic link lands on `/garden-cleaners/portal#portal-access`
- Admin dashboard verified after login

Do not re-open "Una Labs sender display" unless a fresh email proves regression.

## Key Garden Commits

```text
2f0c8e42 fix(garden): redirect auth links to portal
316731c7 fix(garden): polish portal login and stabilize live QA tests
114dce1a docs(garden): add client handoff and Una Labs closeout package
a5956d09 docs(garden): update handoff gates and auth status
00bb262e docs: update Garden login status and SayWetin video QA
e05855d1 docs(garden): mark custom SMTP verified and handoff ready
```

## Important Garden Files

Code:

```text
APPS/ftc-site/app/garden-cleaners/page.tsx
APPS/ftc-site/app/garden-cleaners/portal/page.tsx
APPS/ftc-site/app/components/Header.tsx
APPS/ftc-site/app/components/garden-cleaners/GardenPortalAccessPanel.tsx
APPS/ftc-site/app/components/garden-cleaners/GardenServiceShowcase.tsx
APPS/ftc-site/app/components/garden-cleaners/GardenBrandMark.tsx
APPS/ftc-site/app/components/garden-cleaners/GardenImagePanel.tsx
APPS/ftc-site/app/api/garden-cleaners-quote/route.ts
APPS/ftc-site/app/api/garden-cleaners-job/route.ts
APPS/ftc-site/app/api/garden-cleaners-job-assign/route.ts
APPS/ftc-site/app/api/garden-cleaners-job-status/route.ts
APPS/ftc-site/app/api/garden-cleaners-my-jobs/route.ts
APPS/ftc-site/lib/gardenCleaners.ts
APPS/ftc-site/lib/gardenContracts.ts
supabase/migrations/202604290001_garden_cleaners_portal_mvp.sql
```

Docs:

```text
DOCS/GARDEN_CUSTOM_SMTP_IMPLEMENTATION_RESULT.md
DOCS/GARDEN_PRODUCTION_ACCOUNT_SETUP_RESULT.md
DOCS/GARDEN_PRODUCTION_HANDOFF_GATE.md
DOCS/GARDEN_48H_HANDOFF_SPRINT_BOARD.md
DOCS/GARDEN_CLIENT_WALKTHROUGH_PACK.md
DOCS/GARDEN_CLIENT_HANDOFF_PACKAGE.md
DOCS/GARDEN_ADMIN_QUICK_START_GUIDE.md
DOCS/GARDEN_CLIENT_ACCEPTANCE_SIGNOFF.md
DOCS/GARDEN_CLIENT_SCREENSHOT_WALKTHROUGH_GUIDE.md
DOCS/GARDEN_PRODUCTION_ADMIN_LOGIN_VERIFICATION.md
DOCS/GARDEN_AUTH_ALIGNMENT_WITH_FTC_STANDARD.md
```

Telemetry:

```text
ops/project-status.json
ops/delivery-ledger.jsonl
DOCS/FTC_PROJECT_LEDGER.md
```

## Current Garden UI Polish Work

Current uncommitted/active intent:

- Add clear `Portal Login` CTA to Garden header/nav.
- Keep `Get a Quote` visible and separate.
- Link `Portal Login` to `/garden-cleaners/portal#portal-access`.
- Move portal sign-in card into first viewport.
- Hide blank unauthenticated `Role:` card.
- Show `Sign in to view your dashboard.` before login.
- Preserve/admin verify dashboard after login.
- Ensure mobile makes login easy to find.

Expected changed files:

```text
APPS/ftc-site/app/components/Header.tsx
APPS/ftc-site/app/garden-cleaners/portal/page.tsx
APPS/ftc-site/app/components/garden-cleaners/GardenPortalAccessPanel.tsx
```

Before commit:

1. Start local dev server.
2. Verify desktop and mobile:
   - `/garden-cleaners`
   - `/garden-cleaners/portal`
   - `/garden-cleaners/portal#portal-access`
3. Confirm:
   - header shows `Portal Login`
   - quote CTA remains visible
   - login card appears in first viewport
   - no blank `Role:` card
   - mobile layout has no overlap/wrapping problems
   - admin dashboard still works after login
4. Run build/typecheck.
5. Commit only Garden UI files after approval.

## Garden Client Handoff Plan

Goal:

- Complete current MVP walkthrough and collect acceptance/signoff.

Do say:

- "This is the first operational MVP."
- "Quote intake, portal access, admin visibility, and email branding are live."
- "Advanced scheduling, route planning, reporting, and deeper automation are next."

Do not say:

- "This is the full final operations system."
- "No more technical setup needed."
- "Security handoff is complete."

Current client email direction:

- send portal link
- explain current live features
- walk through website, quote flow, portal login, admin view, live features, next-phase improvements
- capture final notes and signoff

## Garden Full Operations Portal V1 Plan

Do not start this until MVP walkthrough/signoff is complete or intentionally paused.

Vision:

- email/password auth primary
- email verification
- forgot/reset password
- magic link optional fallback
- customer onboarding profile
- customer dashboard
- admin operations dashboard
- staff dashboard
- jobs/schedules/assignments
- notes/comments
- route planning filters
- notifications
- RLS/security QA

Realistic estimate:

- 4-7 focused calendar days with three clean lanes
- 7-12 days if interrupted/client-review-heavy

## Standard Garden Dev Workflow

Use this report format:

```text
Task:
Files inspected:
Files changed:
Commands run:
Results:
- build:
- typecheck:
- tests:
- visual QA:
Project status:
- GO/HOLD/NO-GO:
- blockers:
Unrelated changes left untouched:
Commit status:
```

## Garden Do Not Do

- Do not touch SayWetin or Dispatch files during Garden tasks.
- Do not stage `.idea`, `supabase/.temp`, or unrelated docs.
- Do not modify SMTP settings unless explicitly asked.
- Do not rebrand sender back to Garden-specific without approval.
- Do not mark full operations portal complete; only current MVP is handoff-ready.

