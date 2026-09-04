# UnaScout Store Release Candidate Status

Updated: 2026-08-18 America/New_York
Exact deployed application image: `22db89fb9a58bbb07e3be64919f08f9bd0b5c6d8`
Latest tested native-artifact head: `b3a1077b2100774b9394f19dcf4f5cbfce7ded61`
Schema version: `011_revenue_launch`

## State

- **Completed in the repository:** public launch and pricing experience at `/`,
  authenticated workspace at `/app`, capped public registration, UTM/referral
  attribution, revenue tables with forced RLS, plan entitlements, usage ledger,
  Stripe-hosted Checkout and Customer Portal contracts, Mailjet transaction
  gateway support, billing lifecycle handling, and native purchase boundaries.
- **Verified locally:** TypeScript build; `31` passed application test files and
  `1` skipped file with `230` passed tests and `11` skipped; customer smoke at
  `390x844` and `1440x1000`; store metadata and native-contract checks;
  a signed Android `1.0.1 (2)` AAB; static and strict
  release checks; application and Worker production audits with `0`
  vulnerabilities when correctly scoped with `--workspaces=false`.
- **Verified in CI:** GitHub Actions run `32142960353` passed the current SaaS,
  security, billing, immutable-image, browser-smoke, and signed-Android jobs.
  Dedicated Android run `32142993982` also passed and retained artifact
  `9326695864` on evidence head `daec03905`.
- **Current release evidence:** GitHub Actions run `32176635059` passed the
  SaaS gates and produced the signed Android AAB for `b3a1077b`; GitHub Actions
  run `32176666950` produced the matching signed iOS IPA. The canonical
  UnaScout logo is present in both artifacts and the live PWA origin.
- **PWA cache promotion:** the live `22db89fb` runtime versions manifest and
  service-worker icon requests, so new installs receive the canonical icon
  without waiting for the earlier Cloudflare cache entry to age out.
- **Deployed:** the dedicated Railway Hobby project `una-jobagent` has web,
  worker, migration, PostgreSQL, backup, and private object storage resources.
  The shared Cloudflare Stripe/Mailjet Worker module is also deployed.
- **Externally verified:** `/`, `/app`, `/healthz`, `/readyz`,
  `/api/v1/release`, `/api/v1/plans`, and `/edgez` return healthy production
  responses. The release endpoint reports the exact deployed SHA above and
  schema `011_revenue_launch`.
- **Customer proof:** disposable public registration, Mailjet verification,
  email verification, login, seeded recommendations, fit/ATS analysis,
  approval handling, proof timeline, interview preparation, and responsive
  browser smoke passed at `390x844` and `1440x1000`. Redacted screenshots are
  stored under `D:\FTC-HOLDING-releases\unascout\live-proof-c96c1115`.
- **Paused:** `BILLING_CHECKOUT_ENABLED` remains false. The permanent Stripe
  live key still must be installed in the Worker, after which the authenticated
  idempotent catalog bootstrap and a no-charge live Checkout creation proof can
  run. No genuine charge or paid activation is claimed.
- **Blocked external gates:** the first Play Console app record/AAB upload and
  Apple app record/signing credentials still require their respective publisher
  portals. There is no TestFlight, Play-track, review, or public-store proof yet.
- **Commercial access:** public registration is unlimited by default when
  `PUBLIC_SIGNUP_ENABLED=true`. `PUBLIC_SIGNUP_CAP` is now optional and reserved
  for an explicit emergency capacity limit. The first-100 limit applies only to
  `FOUNDING25` redemptions, not to customer registration.

## Hosted Probe

The 2026-08-18 production probe returned:

| Route | Status |
|---|---:|
| `/` | `200` |
| `/edgez` | `200` |
| `/healthz` | `200` |
| `/readyz` | `200` |
| `/api/v1/release` | `200` |
| `/api/v1/plans` | `200` |

Cloudflare DNS/TLS/edge routing and the Railway origin are alive. Revenue is
not activated until Stripe catalog and entitlement lifecycle proof pass.

## Revenue Activation Gates

The dedicated Railway Hobby project is recovered and live. Remaining activation
work is deliberately narrow:

1. Install the permanent restricted Stripe live key in `una-stripe-api` without
   exposing it in source, shell history, logs, chat, or mobile binaries.
2. Run the authenticated catalog status/bootstrap flow and verify the three CAD
   prices plus the exact `FOUNDING25` constraints.
3. Create a live-mode Checkout session without completing a charge, verify the
   Customer Portal handoff, then enable `BILLING_CHECKOUT_ENABLED` only after the
   app-to-Worker signature and return URLs pass.
4. Complete a Stripe test-mode lifecycle through cancellation/refund and prove
   webhook idempotency, tenant entitlement, usage limits, and Mailjet delivery.
5. Prove the hosted tailored-package workflow before accepting a genuine
   payment.
6. The `b3a1077b` release is deployed to the live origin; future promotions
   must retain explicit release-SHA verification.
   `BILLING_CHECKOUT_ENABLED=true` or taking a genuine payment.

## Release Reconciliation - 2026-09-04

The current candidate is documented in
`docs/PRODUCT_RELEASE_EVIDENCE_2026-09-04.md`. It starts from source SHA
`e6c76cf674b32f6d6e3e46a0a97b8ba2ac4f978c` on the clean
`release/unascout-store-completion` worktree. The customer-intelligence source
branch and that SHA match; `origin/main` is an ancestor.

- **Implemented:** atomic package/usage reservation rollback, idempotency-key
  guardrails, source release schema 013, direct Cloudflare association handling,
  exact Play signing identity, and native build number 3.
- **Locally verified:** full Vitest (`240` passed, `12` skipped), TypeScript,
  lint, store metadata, edge tests, production static checks, and customer smoke
  at `390x844` and `1440x1000`.
- **Externally verified:** Play App Signing provided the exact SHA-256 needed for
  Digital Asset Links. App Store Connect reports iOS version 1.0 `Rejected`
  under Guideline 2.1(a), requesting a review demo account.
- **Deployed:** no candidate deployment yet. Hosted production remains SHA
  `22db89fb9a58bbb07e3be64919f08f9bd0b5c6d8`, schema `011_revenue_launch`.
- **Submitted:** existing Android `1.0.1 (2)` remains the public release. No
  candidate Play upload or iOS resubmission is claimed.
- **Published:** Android existing release is public; the candidate iOS listing
  is not public.
- **Paused:** Stripe checkout activation remains disabled pending full payment
  lifecycle evidence.
- **Blocked:** Apple requires protected App Store Connect API credentials and a
  real demo username/password for App Review. Device checks and hosted
  migration/isolation proof remain release gates.

## Cloud-First Storage Model

- GitHub is the source-of-truth for code, migrations, runbooks, and release tags.
- GitHub Actions should produce immutable build, test, screenshot, trace, AAB,
  and IPA artifacts with explicit retention periods.
- Production PostgreSQL and private object storage own customer records and
  documents. Encrypted off-provider backups must be restored in a drill before
  commercial launch.
- Stripe owns payment credentials and payment records; the database stores only
  Stripe identifiers, entitlement state, and idempotent event metadata.
- Browser cookies, job-board sessions, signing private keys, and OAuth refresh
  tokens never enter source control or ordinary CI artifacts.
- `D:` holds isolated worktrees, dependency caches, Android/Gradle caches, and
  temporary release evidence. Those directories are reproducible and may be
  pruned after the remote branch and CI artifacts are verified.

## Store Boundary

The shared Capacitor source remains a free companion for analysis, tracking,
approvals, proof, and existing customer access. No in-app Stripe checkout or
external purchase prompt is introduced. Signed store builds, physical-device
checks, Play submission, TestFlight, and App Store review still require their
own evidence.

## Mobile Brand And Build Evidence

- Public store identity is locked as `UnaScout` by Una Labs; internal engineering
  identifiers remain `JobAgent` and `cloud.unalabs.jobagent`.
- Initial live collision screening found no exact UnaScout Apple App Store,
  Google Play, Canadian trademark-search, or USPTO web result. This is not final
  legal clearance.
- A local signed Android `1.0.1 (2)` release AAB was built and
  signature-verified on 2026-08-18 with SHA-256
  `D2BFD88D7DF5A8D88130FE7349A6E8D30DC42FCE4487E045C7F625DACA22BAED`.
- The remote release artifact has SHA-256
  `714A82DDFDC3B993D2704BE5090111ECFCDCB4CE13BA1B56AB0079C786049107`
  and the same verified JobAgent upload signer.
- Final native icons, splash screens, Apple/Google listing metadata, a Google
  feature graphic, and ten phone screenshots have been generated and visually
  inspected. Default Capacitor artwork is no longer present.
- JobAgent-specific Android signing material is enrolled in protected GitHub
  Actions secrets. The AAB has not yet been uploaded to Play Console.
- A production-track upload was attempted from GitHub Actions run `32189803248`
  on 2026-08-18. Metadata validation, screenshot generation, and signed AAB
  creation completed; Google Play rejected the API request with `The caller does
  not have permission`. No Play release was created. Grant the protected
  publisher service account access to `cloud.unalabs.jobagent` in Play Console,
  then rerun `UnaScout Android release` with `upload_to_play=true`.
- The Android workflow now preserves the signed AAB and store screenshots even
  when a Play upload fails, so the next provider response and release artifact
  remain available for audit.
- A dedicated zero-cost `macos-26` GitHub Actions workflow exists for iOS and
  enforces Xcode 26 plus JobAgent-specific Apple distribution credentials.
  PeacePad credentials are not reused.
- App Store Connect is visibly authenticated to the correct organization and
  the UnaScout record exists as Apple ID `6802774371`; no uploaded build has
  yet been evidenced.
- Apple upload remains blocked by the Account Holder's outstanding Developer
  Program License Agreement acceptance and missing App Store Connect API upload
  credentials. The signed IPA and valid UnaScout App Store provisioning profile
  are ready; no App Store build has been uploaded or submitted for review.
- Apple Developer portal confirms team/App ID prefix `G6UNC88GQ5`, and the
  hosted Apple App Site Association response is externally verified at `200`
  for `G6UNC88GQ5.cloud.unalabs.jobagent`. The App ID registration and App Store
  record exists as Apple ID `6802774371`; the uploaded build and review remain
  pending final console actions.
- Both native shells still depend on the hosted origin. The origin is now live;
store rollout remains gated by exact-image redeployment, association identities,
physical-device proof, publisher records, signing, and store review.

## Customer Intelligence Increment - 2026-09-03

Branch: `agent/unascout-customer-intelligence` based on `origin/main`
`00839080c09d26677ca7d7db232c1b22331800fb`.

Pushed source commit: `c56c6f193`.

- **Completed in source:** guided resumable onboarding, expanded customer
  preferences and eligibility, review-required resume fact proposals with
  provenance, explainable recommendation feedback/rejection, funnel events,
  export inclusion, and migration `012_customer_intelligence.sql` with forced
  RLS.
- **Verified locally:** full Vitest (`32` passed files, `1` skipped; `234`
  passed tests, `11` skipped), TypeScript, changed-file syntax checks, and
  deterministic smoke at `390x844` and `1440x1000`.
- **Deployed:** no. No hosted release SHA, migration receipt, or deployment
  identifier is claimed for this increment.
- **Externally verified:** none for the new onboarding, proposal, feedback, or
  migration behavior.
- **Paused:** provider-specific binary resume extraction is intentionally
  deferred; proposals remain review-required until customer approval.
- **Blocked:** no implementation blocker. Full-repository checks need the
  complete materialized worktree and shared `date-fns` dependency; live proof
needs a deployment with migration 012 applied.

## Customer Intelligence Repair - 2026-09-03

- **Implemented:** nine-stage onboarding with active-step persistence,
  resume/default selection, explicit consent confirmation, fail-closed
  revocation, Review/Assisted policy controls, normalized fact proposal
  lifecycle, server-owned provenance, and tenant-owned deterministic feedback
  learning.
- **Locally verified:** focused repair/mobile/release tests (`18` passed), store
  metadata checks, and customer smoke at `390x844` and `1440x1000`. The smoke
  caught and verified the review-renderer fix; screenshots remain under
  `.local/qa-revenue-launch`.
- **Deployed:** no. Existing production evidence is unchanged; no new release
  SHA, migration receipt, or deployment identifier is claimed.
- **Externally verified:** none for the repair.
- **Paused:** disposable PostgreSQL two-tenant proof and hosted acceptance await
  deployment of migration 012.
- **Blocked:** full-repository Vitest/typecheck could not complete because the
  isolated worktree dependency tree is incomplete (`googleapis`, `date-fns`,
  and AWS SDK transitive manifests). Package metadata was not changed.

## Guided Value-to-Payment Journey - 2026-09-03

- **Implemented:** customer questions now lead from a selected fit analysis to
  a persisted, truthful tailored package with resume focus, cover letter,
  recruiter follow-up, application answers, grounded interview prompts,
  approved-fact evidence, and missing-information flags.
- **Implemented:** package-only edits are supported through the authenticated
  update route and force a fresh approval without changing Career Truth.
- **Implemented:** package review is wired to the existing Review/Assisted
  policy. Review creates an approval request; Assisted prepares only and keeps
  sensitive/submission actions gated. Usage is metered by the existing
  `tailored_package` entitlement and duplicate requests are idempotent.
- **Implemented:** migration `013_product_application_packages.sql`, package
  list/detail routes, package creation route, paywall response, and funnel/audit
  evidence.
- **Locally verified:** `4` focused test files with `59` passing tests,
  JavaScript syntax checks, and the TypeScript production build.
- **Deployed:** no. The current hosted release remains unchanged; no migration
  receipt, deployment ID, or hosted release SHA is claimed for this increment.
- **Externally verified:** none. Live payment, hosted customer flow, and
  PostgreSQL tenant proof are still outstanding.
- **Paused:** Stripe checkout enablement and commercial acceptance remain paused
  until the hosted package path and full test-mode lifecycle pass.
- **Blocked:** no source implementation blocker. Full-repository verification
  and live proof require the complete dependency/deployment environment noted in
  the earlier repair entry.

## Live Release Reconciliation - 2026-09-04

This current receipt supersedes the historical pre-deployment notes above.

- **Implemented and approved:** release commit `13e120d18e447eee306d4bb1bfe0b8395d07c135` is on branch `release/unascout-store-completion`, with PR `#352` and complete JobAgent CI run `33906159955` passing.
- **Deployed:** Railway project `una-jobagent`, production environment `d2157870-91e1-4452-a5c6-2f2eb8792b9c`. Migration deployment `2e073df2-e972-48db-ad41-8531c4e3b50a`, worker deployment `e84cd969-13e9-424c-8bc4-4a637f905ab1`, web deployment `1c75c52c-5cb5-4748-80b7-eaecf4e3cbf8`, and backup deployment `0d59a320-6f52-481a-9178-9ded4cc91f8e` succeeded. PostgreSQL and private object storage are online and reported by readiness.
- **Externally verified:** `https://jobagent.unalabs.cloud/healthz`, `/readyz`, `/api/v1/release`, `/api/v1/plans`, and `/edgez` returned 200. The live release response reports SHA `13e120d18e447eee306d4bb1bfe0b8395d07c135` and schema `013_product_application_packages`.
- **Externally verified:** Cloudflare worker `una-jobagent-edge` version `18d54293-3f94-41f9-a76e-d20d41212a4e` serves Android `assetlinks.json` and Apple `apple-app-site-association`; the Digital Asset Links API returned one matching statement for package `cloud.unalabs.jobagent` and the exact Play fingerprint.
- **Published:** the signed Android versionCode `3` AAB was uploaded and committed to the Google Play production track by CI run `33908327749`; artifact SHA-256 is `4b796588f4814e6d9129fb6665a24e05efe131b9f4982ad6c749c819972ca420`. The public listing resolves at `https://play.google.com/store/apps/details?id=cloud.unalabs.jobagent`.
- **Built but not submitted:** iOS archive/export succeeded in CI run `33907913859` and produced build `3`, IPA SHA-256 `0CD5D245E2BD6B200E036880301FD98824A15E3887695D1681494214E623B5D2`; it was not uploaded because protected App Store Connect API credentials are absent. App Store Connect's prior version remains rejected under Guideline 2.1(a) pending a review demo account and account-holder agreement action.
- **Upload attempt receipt:** workflow run `33914372796` rebuilt and signed successfully, then failed before transfer at `Upload IPA to App Store Connect` with `Missing JOBAGENT_ASC_KEY_ID`; the issuer ID and private key were also empty. No IPA was uploaded by this attempt.
- **Externally verified:** live public customer smoke passed at `390x844` and `1440x1000`, including landing and unauthenticated app entry, with no horizontal overflow. Redacted screenshots and a Playwright trace are in `D:\FTC-HOLDING-releases\unascout\store-completion-smoke-2026-09-04`.
- **Paused:** authenticated live customer journeys, physical-device checks, two-tenant PostgreSQL isolation proof, and the complete Stripe test/live lifecycle remain unclaimed. `BILLING_CHECKOUT_ENABLED` remains disabled.
- **Blocked:** iOS upload and resubmission require the account-holder-controlled Apple agreement/demo-account gates and protected `JOBAGENT_ASC_KEY_ID`, `JOBAGENT_ASC_ISSUER_ID`, and `JOBAGENT_ASC_PRIVATE_KEY_BASE64` values. No store readiness or iOS publication claim is made.

## iOS Submission Receipt - 2026-09-04

- **Uploaded and processed:** GitHub Actions run `33915985274` uploaded signed build `1.0.1 (3)` to App Store Connect. IPA SHA-256: `0CD5D245E2BD6B200E036880301FD98824A15E3887695D1681494214E623B5D2`.
- **Submitted:** App Store Connect has metadata, five iPhone screenshots, build `1.0.1 (3)`, and automatic release selected. Its authenticated state is **Waiting for Review**, submitted Sep 4, 2026 at 4:50 PM EDT, submission `0083ab51-caa4-43c4-97ba-06ed1bdfeac0`.
- **Review access synchronized:** metadata workflow `33918457718` passed after the production reviewer-account reset, writing the protected review information without exposing its credentials.
- **Published:** Android only. The Google Play listing remains public at `https://play.google.com/store/apps/details?id=cloud.unalabs.jobagent`.
- **Not yet published:** iOS. Apple approval and an independently resolving App Store listing are required before claiming public availability.
- **Paused:** authenticated customer, device, tenant-isolation, and payment-lifecycle proof remain separate gates. `BILLING_CHECKOUT_ENABLED` remains disabled.
