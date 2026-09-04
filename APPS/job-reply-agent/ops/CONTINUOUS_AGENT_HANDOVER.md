# JobAgent Continuous Handover

## Last Verified State

UnaScout exact image `c96c1115dc51b890a1bc1f8d90ad022121360d5b` is merged to
`main` and deployed. Local release checks, the live customer smoke, and
the signed Android bundle are green. The dedicated Railway Hobby origin is
running; checkout remains disabled pending a permanent Stripe key and catalog
proof, and no payment has been accepted. See `ops/RELEASE_STATUS.md` and
`docs/PRODUCT_RELEASE_EVIDENCE_2026-08-18.md` for the exact evidence boundary.

- Updated: 2026-08-18 America/New_York
- Exact deployed image: `c96c1115dc51b890a1bc1f8d90ad022121360d5b`
- Latest merged test/evidence head: `2d6b42818d835e198b28e139e7ff81d19bcd03b9`
- Store-release worktree: `D:\FTC-HOLDING-worktrees\unascout-main-release`
- Operational engineering worktree: `D:\FTC-HOLDING-worktrees\job-agent-continuous`
- Operational branch: `agent/job-agent-continuous`
- Windows task: `JobReplyAgent-Product-Continuous`
- Task policy: every 6 hours, no overlap, 45-minute limit, maximum two model
  runs per day, product engineering only
- Last task result: `0` after the daily-cap safety check

This file is a resumable evidence record, not a claim that every external
connector or production release gate is complete. Verify drift-prone runtime
facts before changing them.

## Current Candidate Handover - 2026-09-04

Work is continuing in the isolated `D:\FTC-HOLDING-worktrees\unascout-revenue-release`
worktree on `release/unascout-store-completion`, starting from exact source SHA
`e6c76cf674b32f6d6e3e46a0a97b8ba2ac4f978c`. The source branch matches that SHA
and is based on the current `origin/main` ancestry. The parent customer-
intelligence worktree remains dirty with unrelated deletions and must not be
used for release staging.

- **Implemented:** package usage reservation rollback, product schema 013
  release metadata, exact edge-served Android/Apple association documents, and
  native version/build 3 release automation.
- **Locally tested:** `240` passing tests, `12` skipped; build, lint, metadata,
  edge, static release checks, and both responsive customer smoke viewports pass.
- **Externally verified:** Play App Signing supplied the exact certificate
  fingerprint for `cloud.unalabs.jobagent`. App Store Connect reports the prior
  iOS submission rejected under Guideline 2.1(a) because no review demo account
  was available.
- **Deployed:** no. Do not report schema 013, candidate SHA, or the repaired
  assetlinks response as live until Railway and Cloudflare deployment receipts
  plus public probes exist.
- **Paused:** Stripe checkout and native purchase flows remain fail-closed.
- **Blocked:** Apple upload/resubmission needs account-holder API credentials
  and protected review demo credentials; physical-device proof is outstanding.

The complete dated evidence is in `docs/PRODUCT_RELEASE_EVIDENCE_2026-09-04.md`.

## Live Production Proof - 2026-08-18

- Railway CLI and browser access now resolve to `Michael Fejiro's Projects` on
  Hobby plan. Dedicated project `una-jobagent` is recovered with all application
  services online, PostgreSQL, private storage, and backup resources present.
- `https://jobagent.unalabs.cloud` now serves the product. `/healthz`, `/readyz`,
  `/api/v1/release`, `/api/v1/plans`, and `/edgez` return `200`; the release
  endpoint reports deployed SHA `c96c1115dc51b890a1bc1f8d90ad022121360d5b`
  and schema `011_revenue_launch`.
- A disposable public tenant completed Mailjet email verification and the live
  customer journey. Responsive Playwright passed at `390x844` and `1440x1000`.
  Redacted artifacts are under
  `D:\FTC-HOLDING-releases\unascout\live-proof-c96c1115`.
- The latest source hardens production smoke diagnostics, keeps native Gmail
  connection on the hosted web surface, and declares the app's linked Apple
  privacy data categories. Full Vitest passed: `31` files plus one skipped,
  `230` tests plus `11` skipped.
- The shared Stripe/Mailjet Worker is deployed and Mailjet delivery is proven.
  Billing remains fail-closed because the Worker still needs a permanent Stripe
  live restricted key. A Stripe CLI session token is not accepted as that
  credential and must not be used as a production replacement.
- No App Store Connect UnaScout record, signed IPA, TestFlight build, Play app
  record, Play AAB upload, track rollout, review submission, or public listing
  is claimed.

## Revenue Launch Increment - 2026-08-17

Historical snapshot, superseded by the 2026-08-18 live production proof above.

- Added the public product/pricing route, `/app` workspace boundary, capped
  public registration, acquisition tracking, plan entitlements, usage ledger,
  billing state, and a checkout kill switch.
- Added an isolated JobAgent module to the shared Stripe/Mailjet Worker. It
  validates exact plan prices and founding promotion terms and will not route
  unrelated Una Labs Stripe events into JobAgent.
- Added repository and PostgreSQL coverage for activation, replay, failed
  payment, recovery, cancellation, refund, usage, and tenant isolation.
- Clean install, build, lint, `229` application tests, `7` Worker tests, both
  required browser viewports, strict production checks, and scoped production
  audits pass.
- GitHub Actions run `32089839983` passed all three JobAgent jobs on workflow
  head `1fb76183539f578764770092daf193e1c73b9664`, including the immutable image,
  billing gateway, Linux browser smoke, strict configuration, and secret scan.
- At that snapshot the origin returned `404` and the active Railway identity did
  not expose the dedicated project. Both were restored on 2026-08-18. Checkout
  still remains fail-closed pending Stripe catalog and lifecycle proof.
- `npm run revenue:deploy:preflight` now checks system-drive headroom, clean Git
  scope, exact `una-jobagent` Railway visibility, and public edge/origin health.
  It fails closed and is the first command for every deployment attempt.
- C: pressure was recovered from 162 MB to about 16.9 GB free without deleting
  source or active sessions. Reproducible npm and Playwright data plus the
  verified closed `2026-08-06` Codex session archive now live on D: behind
  junctions. Future npm, Gradle, and user temp paths also target D:.

## Cloud-First Operating Model

- Keep code, migrations, documentation, and release tags in GitHub.
- Keep durable CI outputs in GitHub Actions artifacts with explicit retention.
- Keep customer data in dedicated PostgreSQL/private object storage with an
  encrypted off-provider backup and a tested restore.
- Keep cookies, job-board sessions, signing private keys, and OAuth refresh
  tokens out of source control and ordinary CI artifacts.
- Use `D:` for disposable worktrees, npm/Gradle caches, and temporary evidence.
  Prune them only after the branch, CI artifacts, and any required evidence are
  safely remote.

## Operational Proof Since The Previous Handover

- On 2026-08-13, Fejiro's visible authenticated LinkedIn profile submitted
  **Business Analyst - Order Management & Replenishment Systems** to
  **Apptoza Inc.** in Oakville, Ontario (hybrid).
- The submission confirmation and LinkedIn **My Jobs > Applied** record were
  both captured. This is a `submitted_verified` local-pilot record, not a SaaS
  cloud connector certification.
- The role-specific DOCX was generated at
  `C:\FTC HOLDING\APPS\job-reply-agent\resumes\generated\Business Analyst
  Order Management Replenishment - Fejiro Efiuvwere - Apptoza Inc Resume.docx`.
  Proof screenshots are local run artifacts under this worktree's `.local`
  directory and must not be committed or copied into a tenant data store.
- A role-specific **Director, Implementation - Upshop** package was generated
  and structurally audited on 2026-08-15. It has **not** been uploaded or
  submitted: the authenticated LinkedIn window could not be made the active
  desktop window from the current VS Code session. Treat it as `package_ready`,
  not `submission_attempted`.

## Completed In The Latest Increment

- Added four project-scoped Codex agents under `C:\FTC HOLDING\.codex\agents`:
  product builder, mobile publisher, connector operator, and read-only trust
  release auditor. Codex must reload the FTC workspace before discovery updates.
- Added Capacitor 8 Android and iOS projects for the existing responsive hosted
  product, using application ID `cloud.unalabs.jobagent`.
- Added exact-origin native navigation, system-browser OAuth handoff, app resume
  refresh, Android App Links, and iOS Associated Domains.
- Kept OAuth secrets, browser cookies, and job-board automation outside the
  mobile binary.
- Fixed `src/main.ts` so parser imports no longer execute the operational CLI.
- Added focused mobile security/configuration tests and a mobile release runbook.
- Added `docs/NEXT_DEVELOPER_HANDOVER.md` with setup, ownership, verification,
  safety boundaries, and ordered release gates.
- Quoted Vitest exclude globs so Linux CI does not expand `node_modules/**` into
  test-file filters.

## Verification Evidence

- Final focused CLI/mobile/PWA Vitest suite: `3` files and `13` tests passed.
- Full Vitest suite after the CLI import fix: `28` files passed, `1` skipped;
  `210` tests passed, `8` skipped, with a successful process exit.
- The quoted-glob `npm test --workspaces=false` command passed locally; Linux CI
  then passed clean install, audit, static checks, compile/lint, and all tests.
- The next strict CI step exposed missing synthetic `BACKUP_DATABASE_URL` and
  `BACKUP_ENCRYPTION_KEY` fixture values. The workflow now supplies a distinct
  backup role and a 32-byte test key; require its rerun before calling CI green.
- Gitleaks 8.28 identified one false positive in historical release evidence:
  a Cloudflare deployment UUID immediately followed `API routes. Version:`.
  The wording now identifies the value as a deployment UUID, preserving the
  evidence while allowing the application-tree scan to pass locally.
- GitHub Actions run `31434235006` passed both JobAgent jobs: clean install,
  dependency audit, static and strict release checks, compile/lint, all tests,
  application-tree Gitleaks scan, immutable image build, and image contents.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run production:check`: passed in static mode with only the expected
  deployment-environment warning.
- Application-local `npm audit --workspaces=false --omit=dev --audit-level=high`:
  passed with `0` vulnerabilities. The unscoped monorepo audit is a different
  root lockfile and must not be used as this application's release result.
- Credential-pattern scan of the new native/configuration surface: no matches.
- `npm run mobile:sync`: passed for Android and iOS with Capacitor 8.5.
- `npm run mobile:doctor`: Android passed; the combined command returned
  nonzero only because Xcode is not installed on this Windows host.
- Android API 36 debug build: passed, producing a 4,367,917-byte APK with SHA-256
  `549163DE15F12E47CE48E4F94E122C32BB6552BFBD5C76F0970988FB805A31D3`.
- Android `apksigner` verification: passed with one v2 debug signer.
- iOS source generation/sync: passed; no Xcode, simulator, device, archive, or
  TestFlight test was available on Windows.
- Strict deployment-environment release checks were not run in this increment.
- In the 2026-08-10 engineering increment, no recruiter email, job application,
  browser action, deployment, DNS change, secret change, billing action, or
  production mutation occurred. The later 2026-08-13 LinkedIn proof run is
  recorded separately above.

### 2026-08-15 Documentation Preflight

- `npm run build`: passed.
- A test retry with `--runInBand` was invalid because Vitest does not support
  that Jest flag. A subsequent normal `npm test` run exceeded the local command
  window while running in parallel with network checks; it is not test evidence
  and must be rerun alone before a release claim.
- No SaaS deployment, DNS, billing, credential, queue, or database mutation was
  made while preparing this handover.

## Current Boundaries And Manual Gates

- The current production release is `main` at
  `c96c1115dc51b890a1bc1f8d90ad022121360d5b`. It contains the locked UnaScout
  public brand, final native art,
  store metadata, screenshot automation, iOS privacy declarations, hardened
  association routes, and release workflows.
- The signed Android `1.0.1 (2)` AAB was verified locally with SHA-256
  `D2BFD88D7DF5A8D88130FE7349A6E8D30DC42FCE4487E045C7F625DACA22BAED`.
  Its upload key remains outside Git under `D:\jobagent-release-secrets`.
- GitHub runs `32142960353` and `32142993982` passed. Remote Android artifact
  `9326695864` has SHA-256
  `714A82DDFDC3B993D2704BE5090111ECFCDCB4CE13BA1B56AB0079C786049107`
  and the same upload signer.
- App Store Connect is visibly logged in to the Fejiro Technology Consultancy
  organization. App creation, Apple signing, build upload, and review are not
  yet evidenced.

- The scheduled product agent runs only while the Windows computer is on and
  the configured user has an interactive session.
- Revenue work is pushed to `origin/release/jobagent-revenue-launch-rc3` in
  draft PR #253. The scheduled task remains on the separate operational branch
  and must not merge or deploy revenue changes unattended.
- Gmail OAuth, authenticated job-board proof runs, deployment operations, and
  candidate actions remain separate explicitly authorized workflows.
- Public beta expansion still depends on external and pilot gates documented in
  `PRODUCT_ARCHITECTURE.md`.
- Paid checkout is a separate kill-switched capability. A pricing page or green
  local test does not authorize catalog creation, Worker deployment, or charges.
- App/Universal Link association files are not yet deployed and device-verified.
- Native signing, final icons, screenshots, privacy declarations, Play internal
  testing, TestFlight, and store reviews remain open.
- The C drive filled during the first Android dependency download. Repeat Gradle
  builds should set `GRADLE_USER_HOME`, `TEMP`, and `TMP` to a D-drive directory.

## Next Highest-Impact Work

1. Install the permanent restricted Stripe live key in the deployed Worker,
   bootstrap the exact catalog, prove no-charge live Checkout and Customer
   Portal creation, and complete the test-mode entitlement/cancellation cycle.
2. Keep the exact deployed customer image in place; merged head `2d6b42818`
   changes only guarded release-proof tooling and evidence documentation.
3. Prove hosted tailored-package fulfillment before enabling checkout.
4. Create the Play app record, enable Play App Signing, upload the canonical CI
   AAB, and capture the Play signing SHA-256 for the live association document.
5. Create the Apple app record and App ID, provision dedicated UnaScout signing,
   run the macOS GitHub workflow, and upload/process the first IPA.
6. Publish exact-domain Android/Apple association files, then prove OAuth return
   on physical Android and iOS devices without exposing tokens in URLs/logs.
7. Restore the configured approved BA golden-template source before generating
   another BA/BSA package. The runtime correctly refuses unapproved fallback
   templates; do not weaken that guard to continue an application.

## Resume Command

In the FTC workspace, select **JobAgent Continuous Operator**, invoke
`/jobagent-continue`, and optionally replace the Optional Override line.

For a direct scheduled-run preflight without model invocation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File `
  "D:\FTC-HOLDING-worktrees\job-agent-continuous\APPS\job-reply-agent\scripts\continuous-agent-run.ps1" `
  -ProjectRoot "D:\FTC-HOLDING-worktrees\job-agent-continuous\APPS\job-reply-agent" `
  -WorktreeRoot "D:\FTC-HOLDING-worktrees\job-agent-continuous" `
  -StateRoot "C:\FTC HOLDING\APPS\job-reply-agent" `
  -MaxRunsPerDay 2 -MaxMinutes 45 -DryRun
```

## Update Contract

Every interactive or scheduled product-engineering run must update this file
before its final commit. Replace stale evidence rather than stacking optimistic
claims. Keep completed, deployed, externally verified, paused, and blocked
states distinct.

## Customer Intelligence Increment - 2026-09-03

Branch: `agent/unascout-customer-intelligence`, based on `origin/main`
`00839080c09d26677ca7d7db232c1b22331800fb`.

Pushed source commit: `c56c6f193`.

- **Completed in the repository:** guided seven-step onboarding for goals,
  preferences, eligibility, resume, Career Truth review, control, and final
  review; resumable progress; tenant-scoped resume fact proposals with
  `review_required` provenance; explainable recommendation feedback and
  rejection; funnel events; export coverage for fact proposals; and forced-RLS
  feedback/proposal tables in migration `012_customer_intelligence.sql`.
- **Verified locally:** changed-file syntax checks, focused customer-intelligence
  tests, full Vitest (`32` passed files, `1` skipped; `234` passed tests,
  `11` skipped), TypeScript, and deterministic customer smoke at `390x844` and
  `1440x1000`.
  Redacted local artifacts are under this worktree's `.local/qa-revenue-launch`.
- **Deployed:** no deployment was performed by this increment. The existing
  hosted image remains the separate production evidence recorded above.
- **Externally verified:** none for these new routes, migration, or UI states.
- **Paused by design:** binary PDF/DOCX extraction and provider-specific resume
  parsing are not introduced here; the review-required proposal contract is
  ready for a trusted parser/provider in the next increment.
- **Blocked:** no implementation blocker. Full-repository verification in this
  partial worktree needs root-level fixtures and the shared `date-fns`
  dependency; the changed product files and focused suite are independently
  covered.

Next developer: run the full materialized-worktree suite, apply migration 012
in a disposable tenant, connect the approved parser to the proposal endpoint,
then deploy and repeat live tenant-isolation and customer smoke evidence before
calling this increment externally verified.

## Customer Intelligence Repair - 2026-09-03

This repair supersedes the seven-step description above. It is source-only on
`agent/unascout-customer-intelligence`.

- **Implemented:** nine onboarding stages with active-step-only saves,
  resumable progress, resume upload/default selection, authorization,
  compensation privacy, quiet hours, daily limits, and Review/Assisted
  controls. Ordinary edits preserve consent; explicit final confirmation is
  required for consent changes; revocation fails closed.
- **Implemented:** normalized migration-012 Career Truth proposals with
  server-owned resume/document/version provenance, proposed/approved/rejected/
  superseded transitions, preserved originals, and approved-only generation
  inputs. Recommendation feedback is deterministic and tenant-owned.
- **Verified locally:** focused repair/mobile/release tests (`18` passed), store
  metadata checks, and customer smoke at `390x844` and `1440x1000`. Redacted
  screenshots are under `.local/qa-revenue-launch`.
- **Deployed:** not deployed; no migration receipt, hosted SHA, or deployment
  identifier is claimed.
- **Externally verified:** none for this repair.
- **Paused:** PostgreSQL two-tenant proof and hosted acceptance await a
  controlled migration/deployment run.
- **Blocked:** full-repository Vitest/typecheck verification is blocked by
  incomplete local dependency hydration (`googleapis`, `date-fns`, and AWS SDK
  transitive manifests). No dependency metadata was changed.

## Guided Value-to-Payment Journey - 2026-09-03

Branch: `agent/unascout-customer-intelligence`.

- **Implemented:** a job-specific customer brief now follows fit analysis and
  produces a truthful application package containing resume focus, cover letter,
  recruiter follow-up, and application answers. The package is grounded only in
  approved Career Truth facts and the server-selected resume/version.
- **Implemented:** product-scoped package persistence in migration
  `013_product_application_packages.sql`, forced tenant RLS, idempotent
  package creation, application linkage, audit evidence, and export inclusion.
- **Implemented:** customer UI for Application packages, package review, Review
  and Assisted behavior, and a contextual plan prompt when the tailored-package
  allowance is exhausted. Review mode creates an explicit approval request;
  Assisted mode prepares the package without enabling sensitive submission.
- **Implemented:** each package includes grounded interview preparation prompts;
  customers can edit package copy without changing Career Truth, and edits move
  the package back to approval-required with an audit record.
- **Implemented:** `GET /api/v1/application-packages`,
  `GET /api/v1/application-packages/:id`, and
  `POST /api/v1/jobs/:id/package`. The POST route returns real public plan data
  with `402 PLAN_LIMIT` and records the paywall funnel event.
- **Verified locally:** JavaScript syntax checks, focused product domain/PWA/
  security/billing tests (`4` files, `59` passed), and `npm run build`.
- **Deployed:** no. Migration 013, package routes, and UI changes are not in
  the hosted release and have no deployment identifier or live SHA evidence.
- **Externally verified:** none for the package journey, payment prompt, or
  migration. Local screenshots are not live-release evidence.
- **Paused:** Stripe checkout activation, live customer payment lifecycle,
  hosted Playwright, and two-tenant PostgreSQL proof remain separate release
  gates. No customer is charged by this source-only increment.
- **Blocked:** no implementation blocker. Full-repository verification and live
  acceptance still require a complete deployed environment; the prior isolated
  dependency-hydration note remains applicable.

Next operator step: apply migration 013 in a controlled environment, run the
authenticated journey from analysis through package review, verify the usage
ledger and approval state, then run the Stripe test lifecycle before enabling
any live checkout flag.

## Current Live Release Receipt - 2026-09-04

The release candidate is now deployed from code commit
`13e120d18e447eee306d4bb1bfe0b8395d07c135` on
`release/unascout-store-completion`. PR `#352` and complete CI run
`33906159955` passed before deployment.

- **Deployed:** Railway `una-jobagent` production environment
  `d2157870-91e1-4452-a5c6-2f2eb8792b9c`. Successful deployment IDs are
  migration `2e073df2-e972-48db-ad41-8531c4e3b50a`, worker
  `e84cd969-13e9-424c-8bc4-4a637f905ab1`, web
  `1c75c52c-5cb5-4748-80b7-eaecf4e3cbf8`, and backup
  `0d59a320-6f52-481a-9178-9ded4cc91f8e`.
- **Externally verified:** hosted health, readiness, edge, plans, and release
  endpoints return 200. `/api/v1/release` reports the exact code SHA and
  schema `013_product_application_packages`.
- **Externally verified:** Cloudflare version
  `18d54293-3f94-41f9-a76e-d20d41212a4e` serves both mobile association files;
  the Digital Asset Links API confirms the Android package and signing
  fingerprint.
- **Published:** Android versionCode `3` was uploaded and committed to the
  Google Play production track by CI run `33908327749`. The AAB SHA-256 is
  `4b796588f4814e6d9129fb6665a24e05efe131b9f4982ad6c749c819972ca420`, and
  the public listing resolves.
- **Built but not submitted:** iOS build `3` archive/export passed in CI
  run `33907913859`; IPA SHA-256 is
  `0CD5D245E2BD6B200E036880301FD98824A15E3887695D1681494214E623B5D2`.
  Upload is paused for missing protected ASC API credentials and the known
  App Store Connect review/account-holder gates.
- **Upload attempt receipt:** workflow run `33914372796` rebuilt and signed,
  then stopped before transfer with `Missing JOBAGENT_ASC_KEY_ID`; the issuer
  ID and private key inputs were also empty.
- **Externally verified:** public live Playwright smoke at `390x844` and
  `1440x1000` passed. Evidence is stored under
  `D:\FTC-HOLDING-releases\unascout\store-completion-smoke-2026-09-04`.
- **Paused:** authenticated live smoke, physical-device deep links, full
  two-tenant PostgreSQL proof, and Stripe lifecycle proof. Billing remains
  fail-closed.

Do not report iOS publication, authenticated live customer coverage, or live
revenue readiness until those separate receipts exist.
