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
- **Pushed source:** `c56c6f193`.
- **Data boundary:** migration `012_customer_intelligence.sql` uses forced RLS
  for resume fact proposals and recommendation feedback. Repository methods
  verify tenant ownership before reading or mutating either resource, and
  account export includes fact proposals.
- **Local proof:** full Vitest passes with `32` files passed and `1` skipped;
  `234` tests passed and `11` skipped. TypeScript, syntax checks, and customer
  smoke also pass at both required viewports. Local screenshots are in
  `.local/qa-revenue-launch` and are not live-release evidence.
- **Not deployed or externally verified:** this increment has not been
  migrated, deployed, or run against the hosted domain. Existing production
  evidence above is unchanged.
- **Paused:** resume binary extraction/provider wiring remains intentionally
  deferred. Users or a trusted provider can submit candidate facts, which stay
  `review_required` until the customer approves them.
- **Next step:** materialize the complete repository, run full tests/typecheck,
  migrate a disposable tenant, deploy the exact branch commit, and capture live
  auth, isolation, export, feedback, and deletion evidence.

## Customer Intelligence Repair - 2026-09-03

- This section supersedes the earlier seven-step summary. **Implemented:**
  nine-stage resumable onboarding with active-step-only saves,
  resume upload/default selection, explicit consent confirmation, fail-closed
  revocation, Review/Assisted controls, normalized fact proposal lifecycle,
  server-owned provenance, and tenant-owned deterministic feedback learning.
- **Local evidence:** focused repair/mobile/release tests (`18` passed), store
  metadata checks, and customer smoke passed at `390x844` and `1440x1000`.
  Screenshots are local-only under `.local/qa-revenue-launch`.
- **Not deployed or externally verified:** do not claim hosted migration, live
  isolation, connector proof, store readiness, or production readiness from
  this branch.
- **Paused:** disposable PostgreSQL two-tenant proof and hosted acceptance
  await deployment of migration 012.
- **Blocked:** full-suite/typecheck completion needs a complete dependency tree;
  this isolated tree has unresolved `googleapis`, `date-fns`, and AWS SDK
  transitive package manifests. Do not change package metadata to work around
  it.

## Guided Value-to-Payment Journey - 2026-09-03

Continue from branch `agent/unascout-customer-intelligence` in the isolated D:
worktree. This increment is source-only and does not claim deployment.

- The customer path is now: choose a ranked role -> run fit/ATS analysis ->
  answer interest, emphasis, and avoid questions -> receive a tailored package
  -> review the resume focus, cover letter, recruiter follow-up, answers, and
  interview prompts and evidence gaps -> edit if needed -> approve or reject in
  Review mode.
- `Assisted` prepares the same package but does not authorize sensitive or
  submission actions. `Review` creates `application.package_review` and keeps
  the linked application in `needs_approval` until approved.
- Package output is grounded only in approved facts and the server-owned default
  resume ID/version. Proposed or rejected facts cannot enter the generated
  materials. Unsupported requirements are shown as evidence gaps.
- New data boundary: migration
  `APPS/job-reply-agent/migrations/013_product_application_packages.sql`.
  It adds forced-RLS `product_application_packages` with one package per tenant
  and job match, plus the funnel event names used by the route.
- New API surface: `GET /api/v1/application-packages`,
  `GET /api/v1/application-packages/:id`, and
  `POST /api/v1/jobs/:id/package`; `PUT /api/v1/application-packages/:id`
  edits package copy only and returns it to approval-required. Package creation uses the existing
  `tailored_package` entitlement and returns `402 PLAN_LIMIT` with public plans
  when the allowance is exhausted.
- Local proof: `4` focused test files and `59` tests passed; JavaScript syntax
  checks and `npm run build` passed. No new hosted, Stripe, or PostgreSQL
  evidence exists for this increment.

Before release, apply migration 013, verify the full journey against the hosted
domain, prove tenant isolation and idempotency, run the Stripe test-mode
lifecycle, and capture redacted live evidence. Do not enable billing or claim a
paid customer from the local package proof alone.

## Release Reconciliation - 2026-09-04

Use the clean D: worktree `D:\FTC-HOLDING-worktrees\unascout-revenue-release`
and branch `release/unascout-store-completion`. It starts at the exact remote
customer-intelligence head `e6c76cf674b32f6d6e3e46a0a97b8ba2ac4f978c`; the
customer-intelligence worktree has unrelated deletions and is not a release
staging area.

- **Implemented:** atomic package usage reservation rollback, source schema 013
  release reporting, exact Cloudflare association responses, and Android/iOS
  build number 3 automation.
- **Locally verified:** full Vitest `240` passed and `12` skipped, build, lint,
  store metadata, edge tests, static release checks, and smoke at `390x844` and
  `1440x1000`.
- **Externally verified:** Play supplied the exact App Signing fingerprint;
  App Store Connect reports the prior iOS submission `Rejected` under 2.1(a)
  and requests a demo account.
- **Not deployed:** hosted production remains SHA `22db89fb...` and schema
  `011_revenue_launch`; no candidate live proof exists yet.
- **Paused:** Stripe checkout, hosted migration/isolation proof, and physical
  device checks remain separate gates.
- **Blocked:** Apple upload needs protected ASC API credentials and review demo
  credentials. Do not invent or reuse credentials from PeacePad or JCI.

See `docs/PRODUCT_RELEASE_EVIDENCE_2026-09-04.md` for the complete evidence
and exact state separation.

## Current Live Handover - 2026-09-04

The approved release code is `13e120d18e447eee306d4bb1bfe0b8395d07c135` on
`release/unascout-store-completion`. PR `#352` and CI run `33906159955` passed.

- **Live:** Railway web, worker, migration, and backup deployments succeeded in
  project `una-jobagent`; PostgreSQL and private storage are online. The hosted
  release endpoint reports SHA `13e120d18e447eee306d4bb1bfe0b8395d07c135` and
  schema `013_product_application_packages`.
- **Live edge:** Cloudflare worker version
  `18d54293-3f94-41f9-a76e-d20d41212a4e` serves both association documents for
  `jobagent.unalabs.cloud`. Android Digital Asset Links is externally matched.
- **Google Play:** production upload completed from CI run `33908327749` for
  versionCode `3`; AAB SHA-256 is
  `4b796588f4814e6d9129fb6665a24e05efe131b9f4982ad6c749c819972ca420`.
  Public listing: `https://play.google.com/store/apps/details?id=cloud.unalabs.jobagent`.
- **Apple:** signed iOS build `3` exists from CI run `33907913859` with IPA
  SHA-256 `0CD5D245E2BD6B200E036880301FD98824A15E3887695D1681494214E623B5D2`,
  but it is not uploaded. Protected ASC API credentials, account-holder
  agreement action, and a review demo account are still required. The app is
  not publicly available on the App Store.
- **Apple upload attempt:** run `33914372796` completed signing but failed at
  the upload step before transfer because `JOBAGENT_ASC_KEY_ID` was missing;
  `JOBAGENT_ASC_ISSUER_ID` and `JOBAGENT_ASC_PRIVATE_KEY_BASE64` were empty.
- **Evidence:** public smoke screenshots and trace are in
  `D:\FTC-HOLDING-releases\unascout\store-completion-smoke-2026-09-04`.
- **Still paused:** authenticated live customer smoke, physical devices,
  two-tenant isolation proof, and Stripe test/live lifecycle proof. Keep
  `BILLING_CHECKOUT_ENABLED` disabled.

The next operator should obtain the protected Apple values through the normal
account-holder path, upload and attach build 3, complete metadata and review
demo access, then separately run authenticated live and payment evidence. Do
not reuse PeacePad or JCI credentials.

## Current Store Follow-up - 2026-09-04

The Apple credential and review-access gates are complete. App Store Connect processed `1.0.1 (3)` and accepted the resubmission; the current status is **Waiting for Review** under submission `0083ab51-caa4-43c4-97ba-06ed1bdfeac0` at Sep 4, 2026 4:50 PM EDT. Do not resubmit or cancel it unless Apple requests a correction. Poll App Store Connect and independently check the public storefront after approval.

Google Play versionCode `3` remains published at `https://play.google.com/store/apps/details?id=cloud.unalabs.jobagent`. Authenticated live customer proof, physical device checks, hosted two-tenant isolation proof, and Stripe lifecycle proof remain separate gates; billing stays disabled.
