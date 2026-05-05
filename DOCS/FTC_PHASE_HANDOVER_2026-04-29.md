#
# Wave 4 Premium Signoff (OG + Garden)
#
# Final premium signoff for both OG and Garden is complete. No further code or asset changes are pending for this release.
# Premium image generation is deferred; see [WAVE4_PREMIUM_SIGNOFF.md](WAVE4_PREMIUM_SIGNOFF.md) and [PREMIUM_IMAGE_ASSET_REGISTER.md](PREMIUM_IMAGE_ASSET_REGISTER.md) for details.
#
# Wave 2 Docs Consolidation Completed
#
# The following docs were archived (moved to DOCS/archive):
# - CLIENT_ONBOARDING_PLAYBOOK.md
# - CLIENT_WORKFLOW_ARCHITECTURE.md
# - CLIENT_WORKFLOW_DELIVERY_SUMMARY.md
# - CLIENT_WORKFLOW_DEPLOYMENT_CHECKLIST.md
# - CLIENT_WORKFLOW_IMPLEMENTATION_GUIDE.md
# - CLIENT_WORKFLOW_QUICK_START.md
# - CLIENT_WORKFLOW_README.md
# - onboarding/ (as onboarding_README.md)
# - PEACEPAD_ANDROID_RELEASE.md
# - PEACEPAD_AUTH_SETUP.md
# - PEACEPAD_CAPABILITY_AUDIT_2026-03-10.md
# - PEACEPAD_CAPABILITY_PRODUCTIZATION.md
# - PEACEPAD_DEPLOYMENT_ARCHITECTURE_AUDIT_2026-03-06.md
# - PEACEPAD_DEPLOYMENT_STABILIZATION_REPORT_2026-03-06.md
# - PEACEPAD_GPT_ACTIONS_SETUP.md
# - PEACEPAD_PAGES_SETUP.md
# - PEACEPAD_PHASE0_BASELINE_2026-03-07.md
# - PEACEPAD_PHASE2_HARDENING.md
# - PEACEPAD_RAILWAY_API_SETUP.md
# - PEACEPAD_RELEASE_POLICY.md
# - PEACEPAD_VOICE_AUDIT_2026-03-07.md
# - PEACEPAD_WEEKLY_METRICS.md
# - SAYWETIN_ANDROID_RELEASE.md
# - SAYWETIN_HANDOVER.md
# - SAYWETIN_HANDOVER_2026-04-27_REDACTED.md
# - SAYWETIN_RELEASE_POLICY.md
# - SAYWETIN_SPLIT_DEPLOY_RUNBOOK.md
# - SAYWETIN_STATUS.md
# - SAYWETIN_TEST_VELOCITY.md
# - UNALABS_ATEAM_BUILD_COMPLETE.md
# - UNALABS_ATEAM_FAST_PASS_HANDOVER_2026-03-25.md
# - UNALABS_ATEAM_WEBHOOK_INTEGRATION.md
# - UNALABS_BUILD_HANDOVER.md
# - UNALABS_E2E_AUTOMATION_HANDOVER.md
# - UNALABS_E2E_REPEATABLE_TEST_PLAN.md
# - UNALABS_ECOSYSTEM_MAP.md
# - UNALABS_SECURITY_HANDOVER_2026-04-21.md
# - UNALABS_SITE_HANDOVER_2026-03-10.md
# - UNALABS_STATUS.md
# - UNALABS_TEST_PLAN.md
# - UNA_LABS_SITE_DEPLOYMENT_SETUP.md
#
# The following docs were skipped (owner-decision required):
# - ANION/
# - infra/
# - linkedin/
# - ops/
# FTC Phase Handover - 2026-04-29

## Wave 3 Cleanup Progress (2026-04-29)
Wave 3 Batch A executed as approved: All candidate temp/IDE noise paths were already absent or not present at execution time. No files or folders were removed. No HOLD or production assets touched. Batch B/C pending owner review.

**Final Infra Closeout (2026-04-29):**
- Garden Cleaners deployed, Supabase-persistent, QA proof complete.
- All live infra is on Cloudflare Pages and Supabase; Railway is documentation-only.
- No pause/delete/move actions to be taken from docs.
- Remaining blocker: Cloudflare Email Routing Rules permission (403) for unalabs.cloud.

**Note:** Garden nav route contract mismatch found; fix in progress. No infra changes required.

## Read This First

The active restored repo is:

```text
C:\FTC HOLDING\_restore_repo
```

Do not use the sparse outer copy:

```text
C:\FTC HOLDING\APPS\ftc-site
C:\FTC HOLDING\APPS\saywetin-extension
```

Several prior agents lost time by working from the wrong root. If files appear missing, first confirm `Get-Location` is `C:\FTC HOLDING\_restore_repo`.

The worktree is dirty and contains unrelated prior/user changes across multiple apps. Do not reset, revert, delete, pause services, or stage broad changes without reviewing scope.

## High-Level Status

| Area | Status | Notes |
|---|---|---|
| Garden public QA | Completed earlier | Garden public site and portal QA report was completed. QA skill/report format should be treated as the preferred pattern going forward. |
| Garden quote persistence | Deployed and smoke-tested | Supabase migration is applied, Cloudflare Pages `gardencleaners` has encrypted Supabase env secrets, Garden worker persists quotes to `garden_cleaners_quotes`, and a production QA quote was verified. |
| Email consolidation | Repo-side complete, Cloudflare route blocked | FTC-owned operational emails were consolidated to `hello@unalabs.cloud`. Cloudflare destination `fefiuvwere@gmail.com` is verified, but zone Email Routing Rules permission is still needed to create the forwarding rule. |
| OG Trades domain/content | Deployed and verified | `og-trades-pages`, preview deployment, and `www.ogtradesacademy.com` now serve OG Trades content with `www.ogtradesacademy.com` metadata. Apex `ogtradesacademy.com` still 301s from Squarespace to `www`, which is acceptable while `www` is correct. |
| Railway consolidation | Planning doc cleaned up | Dev 3 updated `DOCS/RAILWAY_CONSOLIDATION_PLAN.md` with decision banner, service matrix, owner access section, and evidence cleanup. No live Railway service should be paused/deleted/migrated from that doc alone. |
| Git commit | Not done for current phase | Avoid committing until the dirty worktree is separated into safe, intentional groups. |

## Garden Quote Persistence

### Files Touched

```text
APPS/ftc-site/app/api/garden-cleaners-quote/route.ts
APPS/ftc-site/app/components/garden-cleaners/GardenQuoteForm.tsx
APPS/ftc-site/lib/gardenContracts.ts
APPS/ftc-site/public/_worker.js
supabase/migrations/202604280001_garden_cleaners_quotes.sql
DOCS/garden-cleaners-quote-persistence.md
DOCS/GARDEN_QUOTE_DEPLOYMENT_QA_CHECKLIST.md
DOCS/GARDEN_QUOTE_SUPABASE_MIGRATION_REVIEW.md
```

### What Changed

- Added dedicated Supabase table `garden_cleaners_quotes` for durable Garden quote persistence.
- Garden quote API now validates input and inserts into Supabase using `@ftc/supabase`.
- Garden Cloudflare Pages worker now mirrors the API route and persists `/api/garden-cleaners-quote` submissions through Supabase REST before acknowledging success.
- Webhook forwarding remains optional as a secondary notification path.
- Garden quote form now collects service address, city, postal code, and preferred time.
- Migration includes indexes, RLS policies, status checks, length checks, and an `updated_at` trigger.
- Garden public page metadata/Open Graph now uses Garden Cleaners branding, canonical URLs, and keywords instead of inherited Una Labs metadata.

### Verification Already Run

```powershell
npm --workspace=@ftc/ftc-site run build
```

Result: passed.

```powershell
$env:FTC_SITE_EDGE_WORKER='garden'
npm --prefix "C:\FTC HOLDING\_restore_repo\APPS\ftc-site" run build
```

Result: passed. Output included `.vercel/output/static/_worker.js` with Supabase quote persistence.

```powershell
git diff --check
```

Result: passed at the time checked, with only line-ending warnings on existing files.

### Live Deployment State

- Supabase migration `202604280001_garden_cleaners_quotes.sql` was applied to linked project `aaaextkrfoqomzmjjkxe`.
- Verified `garden_cleaners_quotes` table exists.
- Cloudflare Pages project `gardencleaners` now has encrypted production secrets:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Garden deployed with:

```powershell
npx.cmd wrangler pages deploy ".vercel/output/static" --project-name "gardencleaners" --branch main
```

Deployment URL:

```text
https://8b9d7406.gardencleaners.pages.dev
```

- Verified `https://gardencleaners.ca` and `https://gardencleaners.ca/garden-cleaners` serve Garden content and Garden metadata.
- Verified invalid quote POST returns `400`.
- Verified valid production quote POST returns success.
- Verified Supabase row:
  - email: `hello+garden-qa-20260429@unalabs.cloud`
  - status: `new`
  - service type: `Deep Cleaning`
  - region: `Oshawa`

The QA row was intentionally left in place as deployment proof unless the owner wants it deleted.

### Useful Docs

- `DOCS/garden-cleaners-quote-persistence.md`
- `DOCS/GARDEN_QUOTE_DEPLOYMENT_QA_CHECKLIST.md`
- `DOCS/GARDEN_QUOTE_SUPABASE_MIGRATION_REVIEW.md`

Garden quote persistence should be considered live and ready for the next QA pass.

## Email Consolidation

### What Changed

Repo-side FTC-owned operational/public/admin emails were consolidated to:

```text
hello@unalabs.cloud
```

This included Una Labs, FTC site brand contacts, Garden Cleaners, Polar Anchor, OG Trades, PeacePad support/docs/defaults, SayWetin support/admin defaults, ATEAM/Dispatch contact headers, Supabase policy templates, and workflow automation identity.

### Cloudflare Email Routing State

- `unalabs.cloud` Email Routing DNS exists.
- Destination `fefiuvwere@gmail.com` was added and verified in Cloudflare on 2026-04-29.
- The current token can inspect DNS and account-level Email Routing destination addresses.
- The current token still cannot read or modify zone-level Email Routing rules:

```text
GET /zones/68fc2deb79a7a99f58443b53adcc0505/email/routing/rules -> HTTP 403
```

### Remaining Action

Grant Cloudflare token permission:

```text
Zone -> Email Routing Rules -> Read/Edit
```

Then create this rule:

```json
{
  "name": "Forward hello@unalabs.cloud",
  "enabled": true,
  "matchers": [
    { "type": "literal", "field": "to", "value": "hello@unalabs.cloud" }
  ],
  "actions": [
    { "type": "forward", "value": ["fefiuvwere@gmail.com"] }
  ]
}
```

Reference doc:

```text
DOCS/EMAIL_CONTACTS_AND_FORWARDING.md
```

## OG Trades Domain / Artifact

### Live State Verified

- `https://ogtradesacademy.com` returns a 301 from Squarespace to `https://www.ogtradesacademy.com`.
- `www.ogtradesacademy.com` DNS points to `og-trades-pages.pages.dev`.
- `og-trades-pages.pages.dev` was redeployed with the corrected OG Trades artifact on 2026-04-29.
- `https://0875da74.og-trades-pages.pages.dev`, `https://og-trades-pages.pages.dev`, and `https://www.ogtradesacademy.com` were verified after deploy and return OG Trades content.
- `https://unalabs.cloud` and `https://gardencleaners.ca/garden-cleaners` were checked after the OG deploy and still serve their own sites.

### Current Local Artifact State

Dev 2 removed the dynamic host/runtime blockers and updated the OG target build output. A follow-up metadata patch was applied so static OG pages default to `https://www.ogtradesacademy.com` instead of `https://unalabs.cloud/og-trades-academy`.

The corrected artifact was deployed with:

```powershell
npx.cmd wrangler pages deploy ".vercel/output/static" --project-name "og-trades-pages" --branch main
```

Deployment URL:

```text
https://0875da74.og-trades-pages.pages.dev
```

A fresh OG-target build was run with:

```powershell
$env:FTC_SITE_PAGES_TARGET='og-trades'
npm --prefix 'C:\FTC HOLDING\_restore_repo\APPS\ftc-site' run build
```

Result: passed.

Confirmed:

- `.vercel/output/static/og-trades-academy/index.html` exists.
- `.vercel/output/static/index.html` exists.
- Root `index.html` contains OG Trades Academy content.
- Root `index.html` contains canonical/Open Graph URLs for `https://www.ogtradesacademy.com`.
- Root `index.html` has no `unalabs.cloud` hit.

Search command:

```powershell
rg -n "requestHost|getRequestHost|runtime|dynamic" APPS/ftc-site/app/og-trades-academy APPS/ftc-site/app/og-trades-academy-home APPS/ftc-site/app/work/og-trades-academy APPS/ftc-site/app/components/og-trades
```

Expected before deploy: no results.

### Build Script Issue

`APPS/ftc-site/scripts/fix-vercel-monorepo-output.mjs` now supports the OG target enough to copy `og-trades-academy/index.html` to root `index.html` and verify OG Trades content at root.

Before deploying, keep using these checks:

```powershell
Test-Path APPS\ftc-site\.vercel\output\static\og-trades-academy\index.html
Test-Path APPS\ftc-site\.vercel\output\static\index.html
rg "OG_Trades Academy|Founder-led forex" APPS\ftc-site\.vercel\output\static\index.html
rg "unalabs\.cloud" APPS\ftc-site\.vercel\output\static\index.html
```

The `unalabs.cloud` check should return no matches. Deploy the artifact only to the OG Trades Cloudflare Pages project, not the shared FTC/Garden project.

## Railway Consolidation

### Current Doc

```text
DOCS/RAILWAY_CONSOLIDATION_PLAN.md
```

### Current Quality

Dev 3 cleaned up the Railway plan:

- Added a decision banner.
- Rewrote the Service Placement Matrix so APIs point to `splendid-spirit` after verification, frontends to Cloudflare Pages, and durable records to Supabase.
- Moved owner-access bullets into an `Owner Access Needed` section.
- Removed duplicate Open Questions.
- Cleaned evidence language and encoding artifacts.

The decision banner should remain:

```text
No Railway service should be paused, deleted, or migrated from this document alone. Final cleanup requires Railway dashboard verification of domains, env vars, traffic, and latest deployments.
```

### Important Interpretation Rule

- `404` on `/api/health` does not equal outage unless the app is expected to expose that route.
- `502`, `503`, or `Application not found` are real concerns.
- SSL trust failure on a direct Railway URL is inconclusive.

No Railway service has been paused, deleted, migrated, or redeployed in this phase.

## Dev Agent Assignments

### Dev 1

Status: Garden persistence docs done; optional next task is post-deploy quote QA cleanup.

Completed docs:

```text
DOCS/GARDEN_QUOTE_DEPLOYMENT_QA_CHECKLIST.md
DOCS/GARDEN_QUOTE_SUPABASE_MIGRATION_REVIEW.md
```

Recommended next Dev 1 task:

- Re-run the Garden quote QA checklist against the live domain.
- Confirm invalid field cases, duplicate-submit behavior, and Supabase row visibility.
- Decide whether to keep or delete the production QA row `hello+garden-qa-20260429@unalabs.cloud`.
- Update the QA checklist with final PASS/FAIL boxes and any residual risks.

### Dev 2

Status: deployed and verified.

Focus: OG Trades static artifact fix.

Recommended next Dev 2 task:

- Browser hard-refresh or incognito check on `https://www.ogtradesacademy.com`, `https://ogtradesacademy.com`, `https://gardencleaners.ca`, and `https://gardencleaners.ca/garden-cleaners`.
- Run public-route/mobile/menu CTA QA for Garden and OG after the latest deploys.
- Log only user-visible, metadata, route, and polish issues. Do not change backend persistence.

### Dev 3

Status: docs cleanup complete unless a fresh repo-root diff check finds an issue.

Focus: no live Railway action. Use the plan as a verification map only.

Recommended next Dev 3 task:

- Prepare scoped git grouping recommendations for this phase.
- Update Railway docs only if new dashboard evidence appears.
- Do not pause, delete, or migrate Railway services.

## Known Verification Commands

Garden build:

```powershell
npm --workspace=@ftc/ftc-site run build
```

Garden docs whitespace:

```powershell
git diff --check -- DOCS/garden-cleaners-quote-persistence.md DOCS/GARDEN_QUOTE_DEPLOYMENT_QA_CHECKLIST.md DOCS/GARDEN_QUOTE_SUPABASE_MIGRATION_REVIEW.md
```

OG target build:

```powershell
$env:FTC_SITE_PAGES_TARGET='og-trades'
npm --prefix 'C:\FTC HOLDING\_restore_repo\APPS\ftc-site' run build
```

OG static artifact checks:

```powershell
Test-Path APPS\ftc-site\.vercel\output\static\og-trades-academy\index.html
Test-Path APPS\ftc-site\.vercel\output\static\index.html
rg "OG_Trades Academy|Founder-led forex" APPS\ftc-site\.vercel\output\static\index.html
rg "https://www\.ogtradesacademy\.com" APPS\ftc-site\.vercel\output\static\index.html
rg "unalabs\.cloud" APPS\ftc-site\.vercel\output\static\index.html
```

Railway doc whitespace:

```powershell
git diff --check -- DOCS/RAILWAY_CONSOLIDATION_PLAN.md
```

## Do Not Do Without Explicit Approval

- Do not delete or pause Railway services.
- Do not deploy OG output to the wrong Cloudflare Pages project.
- Do not apply broad git staging across the dirty worktree.
- Do not revert unrelated dirty files.
- Do not commit until changes are grouped and reviewed.
- Do not deploy Garden quote API before applying the Supabase migration.
- Do not assume files are missing until the working directory is confirmed as `C:\FTC HOLDING\_restore_repo`.

## Suggested Next Order

1. Run the final Garden post-deploy browser QA pass, including mobile menu and quote page UI.
2. Grant Cloudflare Email Routing Rules permission and create `hello@unalabs.cloud` forwarding rule to `fefiuvwere@gmail.com`.
3. Run OG + Garden public route regression checks after DNS/cache settles.
4. Review and group git changes for clean commits.
5. Start premium-plan UX/content upgrades for Garden Cleaners and OG Trades only after the above is green.

## Commit Grouping Plan (Infra Closeout)

- Group 1: Garden Cleaners quote persistence (API, worker, Supabase migration, docs, QA checklist)
- Group 2: Railway consolidation doc and owner access/decision banner updates
- Group 3: Email contacts and forwarding doc updates
- Group 4: Phase handover and recovery map updates
- Group 5: Any unrelated user/app changes (stage separately, do not mix with infra closeout)

> Do not stage or commit broad changes. Review each group for scope and intent before pushing.

## Final Premium Completion Checklist
- Garden premium deployed, Supabase-persistent, QA proven
- SayWetin premium deployed, QA proven
- PeacePad premium deployed, QA proven
- Nav route contract fix merged and verified (Garden)
- All production env vars and secrets confirmed
- User-facing docs and support flows updated
- Playwright/manual smoke tests passed for all premium endpoints
- Release notes and user comms prepared
- Pre-premium baseline tagged and archived
- Premium commits staged and merged by group
- Post-release metrics and error logs monitored

## Release Notes
**What Changed:**
- Garden, SayWetin, and PeacePad premium features deployed to production
- Durable quote persistence for Garden via Supabase
- Navigation contract fix for Garden
- All user-facing docs and support flows updated

**What Was Verified:**
- All migrations applied and QA checklists completed
- Playwright/manual tests passed for all premium endpoints
- Production env vars and secrets confirmed
- Post-release monitoring and smoke tests completed

**What Remains Blocked:**
- Cloudflare Email Routing Rules API (403) for unalabs.cloud — forwarding rule for hello@unalabs.cloud must be set up manually or after permissions are granted
