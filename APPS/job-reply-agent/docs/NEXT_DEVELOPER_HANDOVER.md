# JobAgent Next Developer Handover

## Start Here

- Repository: `fefejiro/FTC-HOLDING`
- Exact deployed image: `c96c1115dc51b890a1bc1f8d90ad022121360d5b`
- Latest merged test/evidence head: `2d6b42818d835e198b28e139e7ff81d19bcd03b9`
- Clean worktree: `D:\FTC-HOLDING-worktrees\unascout-main-release`
- Product root: `D:\FTC-HOLDING-worktrees\unascout-main-release\APPS\job-reply-agent`
- Operational state root: `C:\FTC HOLDING\APPS\job-reply-agent`
- Hosted product: `https://jobagent.unalabs.cloud`
- Native application ID: `cloud.unalabs.jobagent`

### Revenue Launch Snapshot - 2026-08-17

Historical snapshot, superseded by the 2026-08-18 live release snapshot below.

- Revenue launch code and tests are complete locally; hosted deployment is not.
- The public product route, `/app` workspace, capped signup, pricing,
  entitlements, usage, acquisition events, and Stripe/Mailjet gateway contracts
  are implemented.
- Checkout is fail-closed. Do not enable `BILLING_CHECKOUT_ENABLED` until the
  hosted tailored-package workflow and the complete Stripe test lifecycle pass.
- At that snapshot Cloudflare `/edgez` returned `200` while the origin was
  unavailable. The dedicated Hobby origin and shared Worker were restored on
  2026-08-18; use the live snapshot below as current truth.
- No Stripe catalog, live Checkout, subscription, charge, customer activation,
  public beta, connector certification, or store submission is claimed.

### Live Release Snapshot - 2026-08-18

- The Railway access blocker is resolved. `una-jobagent` is in Michael Fejiro's
  Hobby workspace with web, worker, migration, PostgreSQL, private storage, and
  backup resources online.
- The public product and application origin are live. `/healthz`, `/readyz`,
  `/api/v1/release`, `/api/v1/plans`, and `/edgez` return `200` and identify
  schema `011_revenue_launch` plus deployed SHA
  `c96c1115dc51b890a1bc1f8d90ad022121360d5b`.
- A disposable public tenant completed Mailjet verification and the live
  customer smoke at `390x844` and `1440x1000`. Evidence is under
  `D:\FTC-HOLDING-releases\unascout\live-proof-c96c1115`.
- Main commit `c96c1115` corrects production-smoke drift, declares the Apple privacy data
  categories actually used, and prevents a broken native Gmail OAuth launch by
  directing connection setup to the hosted web app.
- Full Vitest is green: `31` passed files plus one skipped; `230` passed tests
  plus `11` skipped. Store metadata and native-contract checks also pass.
- Billing is still fail-closed. A permanent Stripe live restricted key must be
  installed in `una-stripe-api`, then catalog, no-charge Checkout creation,
  portal, webhook, entitlement, cancellation, and refund paths must be proven.

### Current Operational Snapshot - 2026-08-15

- The cloud/PWA/mobile code is a private beta foundation, not a public release.
- The Fejiro local pilot has a fresh verified LinkedIn proof record for
  **Business Analyst - Order Management & Replenishment Systems at Apptoza**:
  confirmation plus LinkedIn Applied-history evidence. Its resume and raw
  evidence remain in the operational state root; do not import them into the
  engineering worktree or another tenant.
- The Upshop **Director, Implementation** tailored package is ready but not
  uploaded or submitted. The visible browser window was not safely foregrounded,
  so the correct outcome is `package_ready`.
- The configured BA golden-template path is currently absent. Resume generation
  must fail closed until the approved source is restored. The IT manager orange
  template remains available for IT-management roles.

### Customer App Launch Increment - 2026-08-16

- Added `npm run customer:smoke`, a deterministic Playwright smoke for the
  customer PWA at 390x844 and 1440x1000.
- The smoke covers ranked opportunities, fit and ATS analysis, interview prep,
  approval actions, verified-application activity, and application timeline
  rendering using local mocked API responses only.
- This is a browser/UI regression gate, not proof of a live connector,
  authenticated job-board submission, mobile device build, or store review.

### RC0 Evidence Increment - 2026-08-16

- PR #192 and `origin/agent/job-agent-continuous` now point to the RC0 candidate
  SHA recorded in `ops/RELEASE_STATUS.md`.
- Added `/api/v1/release` and release metadata propagation through Docker/CI.
- The live release, tenant isolation, queue recovery, app-link publication, and
  device/store gates remain pending external proof. Do not infer them from a
  successful local build.

Do not develop from the shared `C:\FTC HOLDING` checkout. It contains other
active product work. Do not copy OAuth tokens, browser profiles, generated
resumes, databases, or candidate evidence into this engineering worktree.

## First Ten Minutes

```powershell
Set-Location "D:\FTC-HOLDING-worktrees\unascout-main-release"
git status -sb
git pull --ff-only
Set-Location "APPS\job-reply-agent"
npm ci --workspaces=false
npm test --workspaces=false -- --run
npm run build
npm run lint
npm run production:check
```

Expected application test baseline: `31` passed files, `1` skipped file, `230`
passed tests, and `11` skipped tests. Worker baseline: `1` file and `7` tests
passed. Customer smoke passes at `390x844` and `1440x1000`. Use
`npm audit --omit=dev --workspaces=false`; an unscoped audit from this monorepo
includes unrelated/extraneous root packages.

Because the C drive is nearly full, use D for Android caches and temporary files:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:GRADLE_USER_HOME = "D:\.gradle-jobagent"
$env:TEMP = "D:\.tmp-jobagent"
$env:TMP = "D:\.tmp-jobagent"
Set-Location "android"
.\gradlew.bat --no-daemon assembleDebug
```

## What Is Implemented

- Multi-tenant web SaaS and installable responsive PWA.
- Auth, invitations, consent, Career Truth Bank, resume vault, preferences,
  recommendations, approvals, application history, proof, account controls,
  queues, private storage, and trusted-runner contracts.
- AIApply-inspired explainable matching, ATS-gap, timeline, interview-prep, and
  outcome surfaces, with truthful provenance and manual gates preserved.
- Capacitor 8 Android and iOS source projects using the same hosted product.
- System-browser OAuth handoff and exact-origin Android/iOS return links.
- Four project Codex agents under `.codex/agents`.

The Android debug APK builds and verifies. iOS source generation and sync pass
on Windows, but no iOS build, simulator, device, TestFlight, or App Store proof
exists yet.

## Codex Agents

Reload the FTC workspace or start a new Codex session after checking out the
branch. The project-scoped agents are:

- `jobagent_product_builder`
- `jobagent_mobile_publisher`
- `jobagent_connector_operator`
- `jobagent_trust_release_auditor`

Select one owner per increment. Do not run product-builder and mobile-publisher
edits against the same files concurrently. The release auditor is read-only.

## Current CI And PR State

Historical PRs #253 and #257 contain the revenue and store-release increments.
PR #261 merged as `c96c1115dc51b890a1bc1f8d90ad022121360d5b` after all four
JobAgent release jobs passed. That exact image is deployed and passed the live
two-viewport smoke. Merged head `2d6b42818` makes the guarded disposable fixture
repeatable; its complete JobAgent CI run passed before merge.

The previous PR #192 and run `31434235006` remain historical RC0 evidence; they
do not prove the RC3 code image, schema `011_revenue_launch`, or hosted revenue
workflow.

## Open Release Gates

1. Install a permanent restricted Stripe live key in `una-stripe-api` through
   the secure secret prompt. Never paste it into chat, source, or shell history.
2. Bootstrap and verify the exact Stripe catalog, create a no-charge live
   Checkout session, then prove webhook, entitlement, portal, cancellation,
   refund, Mailjet, export, and deletion behavior before activating checkout.
3. Do not redeploy solely for merged head `2d6b42818`; it changes only guarded
   release-proof tooling and evidence documentation.
4. Publish Android Digital Asset Links and Apple App Site Association files,
   then prove OAuth return on physical Android and iOS devices.
5. Preserve successful CI runs `32142960353` and `32142993982` plus Android
   artifact `9326695864` as the store-candidate receipts.
6. Create the Apple and Google app records. Configure dedicated Apple signing,
   upload the canonical CI Play AAB, and complete the eligible Play track plus
   TestFlight processing with external receipts.
7. Upload the completed listing metadata and screenshots, finish store privacy,
   age-rating, data-safety, trader, and review declarations, and submit reviews.
8. Complete fresh Fejiro connector proof runs and the 14-day isolated Chukwuma
   pilot before broader invitations.
9. Audit queue lease recovery and dead-letter operator visibility against the
   restored hosted environment.
10. Restore and assert the approved BA golden-template path in a regression test;
   retain the current fail-closed template guard.

## Safety Boundaries

- Never answer unknown application questions affirmatively to continue.
- CAPTCHA, authentication, MFA, identity, legal, demographic, sensitive, and
  contradictory questions are manual gates.
- Count recruiter email as sent only with Gmail Sent evidence.
- Count an application as verified only with confirmation or applied-history
  evidence.
- Mobile clients never contain Gmail secrets, job-board cookies, signing keys,
  or autonomous browser workers.
- Do not claim production, device, TestFlight, Play, or store readiness from a
  successful local build alone.

## Required End Of Run

Update `ops/CONTINUOUS_AGENT_HANDOVER.md`, run checks proportional to the change,
commit only scoped files, push the branch, and update the active draft PR. Record
completed, deployed, verified, paused, and blocked states separately.

## Customer Intelligence Increment - 2026-09-03

- **Completed:** branch `agent/unascout-customer-intelligence` adds a resumable
  seven-step customer onboarding flow, richer job-search preferences, explicit
  eligibility and approval controls, review-required resume fact proposals,
  explainable recommendation feedback, and new funnel events.
- **Data boundary:** migration `012_customer_intelligence.sql` uses forced RLS
  for resume fact proposals and recommendation feedback. Repository methods
  verify tenant ownership before reading or mutating either resource, and
  account export includes fact proposals.
- **Local proof:** focused tests pass; customer smoke passes at both required
  viewports. Local screenshots are in `.local/qa-revenue-launch` and are not
  live-release evidence.
- **Not deployed or externally verified:** this increment has not been
  migrated, deployed, or run against the hosted domain. Existing production
  evidence above is unchanged.
- **Paused:** resume binary extraction/provider wiring remains intentionally
  deferred. Users or a trusted provider can submit candidate facts, which stay
  `review_required` until the customer approves them.
- **Next step:** materialize the complete repository, run full tests/typecheck,
  migrate a disposable tenant, deploy the exact branch commit, and capture live
  auth, isolation, export, feedback, and deletion evidence.
