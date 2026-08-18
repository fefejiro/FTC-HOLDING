# UnaScout Store Release Candidate Status

Updated: 2026-08-18 America/New_York
Code image: `e6fe31c63`
Branch: `release/unascout-store-publish`
Evidence head: `daec0390537d75b14b8a38a31889e9e3550dda43`
Draft PR: `https://github.com/fefejiro/FTC-HOLDING/pull/257`
Schema version: `011_revenue_launch`

## State

- **Completed in the repository:** public launch and pricing experience at `/`,
  authenticated workspace at `/app`, capped public registration, UTM/referral
  attribution, revenue tables with forced RLS, plan entitlements, usage ledger,
  Stripe-hosted Checkout and Customer Portal contracts, Mailjet transaction
  gateway support, billing lifecycle handling, and native purchase boundaries.
- **Verified locally:** TypeScript build; lint; `30` passed application test
  files and `1` skipped file with `226` passed tests and `11` skipped; customer
  smoke at `390x844` and `1440x1000`; store metadata and native-contract checks;
  a signed Android `1.0.1 (2)` AAB; static and strict
  release checks; application and Worker production audits with `0`
  vulnerabilities when correctly scoped with `--workspaces=false`.
- **Verified in CI:** GitHub Actions run `32142960353` passed the current SaaS,
  security, billing, immutable-image, browser-smoke, and signed-Android jobs.
  Dedicated Android run `32142993982` also passed and retained artifact
  `9326695864` on evidence head `daec03905`.
- **Deployed:** the existing Cloudflare edge route only. The RC3 web, API,
  worker, migration, PostgreSQL, private storage, and shared Stripe Worker
  changes are not deployed.
- **Externally verified:** `https://jobagent.unalabs.cloud/edgez` returned `200`
  from Cloudflare with `{"ready":true,"edge":"cloudflare","origin":"configured"}`
  on 2026-08-17.
- **Paused:** `BILLING_CHECKOUT_ENABLED` remains false in any live environment;
  the Stripe catalog bootstrap has not been run; no live-mode Checkout session,
  subscription, charge, or customer activation has been created.
- **Blocked:** the current Railway CLI identity can access only the PeacePad Free
  workspace. It cannot access the original dedicated `una-jobagent` project.
  JobAgent must not be inserted into PeacePad's database or Free project.
- **Commercial access:** public registration is unlimited by default when
  `PUBLIC_SIGNUP_ENABLED=true`. `PUBLIC_SIGNUP_CAP` is now optional and reserved
  for an explicit emergency capacity limit. The first-100 limit applies only to
  `FOUNDING25` redemptions, not to customer registration.

## Hosted Probe

The same 2026-08-17 probe returned:

| Route | Status |
|---|---:|
| `/` | `404` |
| `/edgez` | `200` |
| `/healthz` | `404` |
| `/readyz` | `404` |
| `/api/v1/release` | `404` |

Cloudflare DNS, TLS, and edge routing are alive. The origin application is not.
This is not a production or revenue-ready deployment.

## Revenue Activation Gates

The local release preflight now proves disk headroom, clean Git scope, exact
Railway project visibility, and hosted route health in one fail-closed command:
`npm run revenue:deploy:preflight`. On 2026-08-17 it correctly stopped because
the active Railway identity cannot see `una-jobagent` and the origin routes are
still `404`.

1. Recover the Railway account/workspace that owns `una-jobagent`, or explicitly
   fund a new dedicated Hobby project. Do not replatform PostgreSQL, pg-boss,
   private storage, workers, and auth merely to avoid this single hosting gate.
2. Deploy code image `407100eb9d872fc2ee857ad482af4807aa5cfd84` as web,
   worker, and migration services with dedicated PostgreSQL and private storage.
3. Prove `/healthz`, `/readyz`, and `/api/v1/release` report the exact image and
   schema `011_revenue_launch`.
4. Deploy the isolated JobAgent module in `una-stripe-api`, run the authenticated
   catalog status/bootstrap flow, and verify the exact CAD prices plus
   `FOUNDING25` constraints.
5. Complete a Stripe test-mode lifecycle through cancellation/refund and prove
   webhook idempotency, tenant entitlement, usage limits, and Mailjet delivery.
6. Prove the hosted tailored-package workflow before setting
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
- Both native shells still depend on the hosted origin. Store rollout remains
  blocked while `/app`, `/healthz`, `/readyz`, and `/api/v1/release` return 404.
