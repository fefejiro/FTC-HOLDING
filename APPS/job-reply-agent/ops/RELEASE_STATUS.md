# JobAgent Revenue Launch RC3 Status

Updated: 2026-08-17 America/New_York
Code image: `407100eb9d872fc2ee857ad482af4807aa5cfd84`
Branch: `release/jobagent-revenue-launch-rc3`
Draft PR: `https://github.com/fefejiro/FTC-HOLDING/pull/253`
Schema version: `011_revenue_launch`

## State

- **Completed in the repository:** public launch and pricing experience at `/`,
  authenticated workspace at `/app`, capped public registration, UTM/referral
  attribution, revenue tables with forced RLS, plan entitlements, usage ledger,
  Stripe-hosted Checkout and Customer Portal contracts, Mailjet transaction
  gateway support, billing lifecycle handling, and native purchase boundaries.
- **Verified locally:** clean application and Worker installs; TypeScript build;
  lint; `30` application test files with `229` tests; `1` Worker test file with
  `7` tests; customer smoke at `390x844` and `1440x1000`; static and strict
  release checks; application and Worker production audits with `0`
  vulnerabilities when correctly scoped with `--workspaces=false`.
- **Verified in CI:** GitHub Actions run `32089839983` passed the
  `standalone-and-security`, `immutable-image`, and `billing-gateway` jobs on
  workflow head `1fb76183539f578764770092daf193e1c73b9664`.
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
