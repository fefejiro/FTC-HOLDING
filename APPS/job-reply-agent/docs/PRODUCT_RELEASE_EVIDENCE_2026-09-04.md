# UnaScout Release Reconciliation Evidence - 2026-09-04

## Release Identity

- Product: `UnaScout` by Una Labs; internal service identity remains `JobAgent`.
- Source branch: `release/unascout-store-completion`.
- Starting source SHA: `e6c76cf674b32f6d6e3e46a0a97b8ba2ac4f978c`.
- Remote source branch `agent/unascout-customer-intelligence` matches that SHA.
- `origin/main` is an ancestor of the source SHA; no rebase was required.
- Hosted origin: `https://jobagent.unalabs.cloud`.
- Current hosted SHA before this release: `22db89fb9a58bbb07e3be64919f08f9bd0b5c6d8`.
- Current hosted schema before this release: `011_revenue_launch`.
- Native identity: `cloud.unalabs.jobagent`.

## Implemented In This Candidate

- Atomic tailored-package persistence now reserves usage in the same tenant
  transaction and rolls the reservation back when package persistence fails.
- Replayed package requests are idempotent; a reused usage key cannot silently
  be reused for another feature.
- The release endpoint source reports commit SHA, build timestamp, environment,
  and schema version, with source default schema `013_product_application_packages`.
- The candidate includes migrations 012 and 013 in release checks.
- Android App Links and Apple association documents are served directly by the
  Cloudflare edge when their exact public identities are configured.
- The exact Play App Signing SHA-256 fingerprint is configured in the edge
  source: `44:01:43:0D:08:16:50:11:86:87:48:F4:2D:B6:2C:F5:B6:8B:55:8B:D7:BA:2D:FC:FA:03:ED:5B:F2:8D:F8:AE`.
- Native update numbers are Android `1.0.1 (3)` and iOS `1.0.1 (3)`.
- Store metadata and the Apple metadata workflow now target build 3.
- The lockfile-only dependency repair resolves `qs` to `6.16.0`; the scoped
  production audit reports zero vulnerabilities.

## Locally Tested

- Full Vitest: `32` files passed, `1` skipped; `240` tests passed, `12` skipped.
- TypeScript build: passed.
- Lint/typecheck: passed.
- Store metadata and native identity checks: passed.
- Cloudflare edge tests plus release/mobile/billing/package tests: `22` passed,
  `12` skipped.
- Customer smoke: passed at `390x844` and `1440x1000`.
- Wrangler dry-run: passed with the exact public association variables.
- Evidence directory: `D:\FTC-HOLDING-releases\unascout\store-completion-smoke-2026-09-04`.

## Externally Verified Provider State

- Google Play app record exists for `cloud.unalabs.jobagent` and the public
  production release is `1.0.1 (2)` at 100 percent rollout.
- Google Play App Signing provided the exact fingerprint used above. The upload
  certificate fingerprint is intentionally not used for Digital Asset Links.
- Apple App Store Connect app ID `6802774371` exists in the authenticated
  Fejiro organization.
- Apple iOS version `1.0` is `Rejected`; the Aug 26 submission rejected build
  `2` under Guideline 2.1(a) because review could not access the app. Apple asks
  for a demo username/password in Beta App Review Information.
- Public Apple lookup in Canada and the United States returns no public listing
  for this Apple ID. iOS publication is therefore not claimed.
- Before deployment, the hosted health/readiness/release/plans probes were 200,
  AASA was 200, and assetlinks was 503 because the origin lacked its identity.

## State Separation

- **Implemented:** source repair, release metadata, build-number increment,
  edge association handling, and release documentation.
- **Locally tested:** all checks listed above; PostgreSQL integration remains
  skipped when no test database URL is supplied.
- **Deployed:** not yet. The hosted image remains SHA `22db89fb...` with schema
  `011_revenue_launch` until the candidate passes CI and is deliberately rolled
  out to Railway and Cloudflare.
- **Externally verified:** Play signing identity and Apple rejection state only;
  the candidate's runtime, migrations, and edge response are not yet verified.
- **Submitted:** existing Play `1.0.1 (2)` is public; no candidate Android upload
  or iOS resubmission is claimed.
- **Published:** Android existing release is public; candidate iOS is not public.
- **Paused:** Stripe checkout remains disabled until catalog, webhook,
  entitlement, failure, cancellation, refund, and usage lifecycle proof passes.
- **Blocked:** Apple upload needs the account-holder-controlled App Store
  Connect API credentials and a real demo account for App Review. Physical
  Android/iOS device verification is also still required. These are provider or
  human gates, not source-code blockers.

## Next Operator Actions

1. Push the scoped candidate commit and open the JobAgent PR; require the full
   JobAgent CI workflow to pass.
2. Deploy that exact approved SHA, run migrations 001-013 once, and verify the
   live release endpoint reports schema 013 and the candidate SHA.
3. Deploy the edge worker, then verify both association URLs and the Play
   Digital Asset Links API externally.
4. Create the higher-version Play release only after the signed AAB artifact is
   hash-recorded and inspect the provider response.
5. Supply the Apple demo account through protected review metadata and obtain
   the missing Apple API credentials before upload/resubmission.
6. Keep billing fail-closed until the complete Stripe test-mode lifecycle and
   no-charge live Checkout creation are evidenced.
