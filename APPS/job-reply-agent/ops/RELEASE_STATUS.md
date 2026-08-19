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
- **Paused:** `BILLING_CHECKOUT_ENABLED` remains false. The app-to-Worker
  authenticated catalog probe reaches the deployed JobAgent route, but Stripe
  rejects the currently installed restricted key as invalid. A replacement
  recurring-billing restricted key is prepared in the authenticated Una Labs
  Stripe account and requires the owner's action-time confirmation before it
  can be created and installed in the Worker. No genuine charge or paid
  activation is claimed.
- **External review gates:** Apple reports UnaScout `Waiting for Review`; Google
  Play reports the Production changes in review. Public-store availability is
  not claimed until each store approves the release and its public URL resolves.
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
6. The live origin reports `22db89fb`; the tested native artifacts remain tied
   to `b3a1077b`. Future promotions must retain explicit release-SHA and
   artifact-provenance verification.
7. Do not set `BILLING_CHECKOUT_ENABLED=true` or take a genuine payment until
   the preceding catalog, Checkout, portal, and entitlement proofs pass.

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
external purchase prompt is introduced. Signed builds and both review
submissions are evidenced; physical-device checks and public availability still
require their own proof.

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
  Actions secrets. Signed AAB `1.0.1 (2)` is uploaded to Play Console and is in
  review for a full Production rollout.
- GitHub Actions run `32189803248` remains historical evidence of an earlier
  service-account permission failure. The authenticated Play Console flow later
  completed the record, listing, declarations, AAB release, and review
  submission without weakening account permissions.
- The Android workflow now preserves the signed AAB and store screenshots even
  when a Play upload fails, so the next provider response and release artifact
  remain available for audit.
- A dedicated zero-cost `macos-26` GitHub Actions workflow exists for iOS and
  enforces Xcode 26 plus JobAgent-specific Apple distribution credentials.
  PeacePad credentials are not reused.
- App Store Connect is visibly authenticated to the correct organization. The
  UnaScout record exists as Apple ID `6802774371`; build `1.0.1 (2)` was
  selected for iOS version `1.0`, and the version is `Waiting for Review`.
- The Account Holder accepted the required Apple agreement. The build, listing,
  privacy responses, reviewer access, pricing, availability, and review
  submission are complete; only Apple's external review remains.
- Apple Developer portal confirms team/App ID prefix `G6UNC88GQ5`, and the
  hosted Apple App Site Association response is externally verified at `200`
  for `G6UNC88GQ5.cloud.unalabs.jobagent`. The App ID registration and App Store
  record exists as Apple ID `6802774371`; the review submission is externally
  verified and waiting on Apple.
- Both native shells still depend on the hosted origin. The origin is now live;
  store rollout remains gated by exact-image redeployment, association identities,
  physical-device proof, publisher records, signing, and store review.

## 2026-08-18 Store Submission Update

- **Apple submitted:** UnaScout AI Job Search `1.0` (Apple ID `6802774371`,
  bundle `cloud.unalabs.jobagent`) was submitted to App Review with automatic
  release enabled. App Store Connect reports `Waiting for Review`; submission
  ID `0083ab51-caa4-43c4-97ba-06ed1bdfeac0`. This is not yet public App Store
  availability.
- **Google Play submitted:** signed release `1.0.1 (2)` is attached to the
  Production track with full rollout selected for 177 countries/regions. The
  approved listing copy, app icon, feature graphic, and two phone screenshots
  are saved. The advertising ID declaration truthfully records that the app does
  not use Advertising ID. Google Play accepted all 11 changes for review and
  now reports `Changes in review`. This is not yet public Play availability.
- **Just Checking In:** App Store Connect still reports `1.0.0 Waiting for
  Review`. No withdrawal or duplicate submission was made.
- **PeacePad:** App Store Connect accepted `2.0.0 (4)` for review and reports
  `Waiting for Review`; submission ID
  `32c20f0e-60b8-4865-bdbd-29cf6b718fdf`. The existing public `1.0` listing
  is not evidence that `2.0.0` has been released.
- **Evidence:** redacted portal screenshots are stored under
  `D:\FTC-HOLDING-releases\unascout\store-release-2026-08-18`.
