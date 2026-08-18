# UnaScout Store Release Candidate Status

Updated: 2026-08-18 America/New_York
Current `origin/main`: `c96c1115dc51b890a1bc1f8d90ad022121360d5b`
Exact deployed application image: `c96c1115dc51b890a1bc1f8d90ad022121360d5b`
Follow-up branch: `fix/jobagent-repeatable-live-smoke`
Follow-up code image: `e09c445d9`
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
6. Merge the repeatable-fixture follow-up `e09c445d9`; it changes release proof
   tooling only and does not require a production runtime redeploy.
   `BILLING_CHECKOUT_ENABLED=true` or taking a genuine payment.

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
- A dedicated zero-cost `macos-26` GitHub Actions workflow exists for iOS and
  enforces Xcode 26 plus JobAgent-specific Apple distribution credentials.
  PeacePad credentials are not reused.
- App Store Connect is visibly authenticated to the correct organization, but
  no UnaScout app record or uploaded build has yet been evidenced.
- Both native shells still depend on the hosted origin. The origin is now live;
  store rollout remains gated by exact-image redeployment, association identities,
  physical-device proof, publisher records, signing, and store review.
