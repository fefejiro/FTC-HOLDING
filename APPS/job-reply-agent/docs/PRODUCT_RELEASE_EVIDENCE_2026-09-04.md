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

## Live Deployment and Store Receipt - 2026-09-04

The following is the current release state. The earlier sections preserve the
pre-deployment baseline for auditability.

### Source and CI

- Release branch: `release/unascout-store-completion`
- Release code commit: `13e120d18e447eee306d4bb1bfe0b8395d07c135`
- Source PR: `#352`
- Complete JobAgent CI: run `33906159955`, passed
- Android release workflow: run `33908327749`, passed
- iOS release workflow: run `33907913859`, passed archive/export with upload
  deliberately false

### Hosted deployment

- Hosted origin: `https://jobagent.unalabs.cloud`
- Railway project: `una-jobagent` (`344d231d-66f8-4777-9286-b3e4452e3fa6`)
- Railway production environment: `d2157870-91e1-4452-a5c6-2f2eb8792b9c`
- Migration deployment: `2e073df2-e972-48db-ad41-8531c4e3b50a`
- Worker deployment: `e84cd969-13e9-424c-8bc4-4a637f905ab1`
- Web deployment: `1c75c52c-5cb5-4748-80b7-eaecf4e3cbf8`
- Backup deployment: `0d59a320-6f52-481a-9178-9ded4cc91f8e`
- `/healthz`, `/readyz`, `/api/v1/release`, `/api/v1/plans`, and `/edgez`:
  HTTP 200
- Live release body reports commit SHA
  `13e120d18e447eee306d4bb1bfe0b8395d07c135`, environment `production`, and
  schema `013_product_application_packages`.
- Readiness reports PostgreSQL connectivity, enforced tenant isolation, and S3
  private object storage.

### Edge association proof

- Cloudflare worker: `una-jobagent-edge`
- Cloudflare version: `18d54293-3f94-41f9-a76e-d20d41212a4e`
- Android and Apple association endpoints: HTTP 200
- Google Digital Asset Links API: HTTP 200 with one statement matching package
  `cloud.unalabs.jobagent` and the exact Play App Signing fingerprint.
- Apple app ID: `G6UNC88GQ5.cloud.unalabs.jobagent`

### Store receipts

- Google Play versionCode `3` AAB upload was accepted and committed to the
  production track. AAB SHA-256:
  `4b796588f4814e6d9129fb6665a24e05efe131b9f4982ad6c749c819972ca420`.
- Google Play public listing resolves at
  `https://play.google.com/store/apps/details?id=cloud.unalabs.jobagent`.
- iOS build `3` archive/export succeeded and produced IPA SHA-256:
  `0CD5D245E2BD6B200E036880301FD98824A15E3887695D1681494214E623B5D2`.
- iOS was not uploaded or submitted. App Store Connect's prior submission is
  rejected under Guideline 2.1(a) because review access was unavailable. The
  account-holder agreement, review demo account, and protected ASC API values
  remain required. No iOS public listing is claimed.
- Upload-enabled workflow run `33914372796` confirmed the external gate: build
  and signing passed, then the upload step failed before transfer with
  `Missing JOBAGENT_ASC_KEY_ID`; issuer ID and private key inputs were empty.

### External customer proof

- Public live Playwright smoke passed at `390x844` and `1440x1000` for the
  landing page and unauthenticated app entry, with no horizontal overflow.
- Redacted screenshots and trace:
  `D:\FTC-HOLDING-releases\unascout\store-completion-smoke-2026-09-04`
- Authenticated live customer journeys were not run because no dedicated
  customer smoke credentials were supplied. The public smoke is not a
  substitute for authentication, tenant, or payment proof.

### Paused and blocked gates

- **Paused:** authenticated live authentication/onboarding/invitation/export/
  pause/revocation/deletion/session tests, physical Android/iOS checks,
  two-tenant hosted isolation, and Stripe lifecycle proof.
- **Paused:** `BILLING_CHECKOUT_ENABLED` remains false; no customer checkout or
  revenue readiness is claimed.
- **Blocked:** iOS upload/resubmission needs account-holder Apple agreement and
  review-demo action plus protected `JOBAGENT_ASC_KEY_ID`,
  `JOBAGENT_ASC_ISSUER_ID`, and `JOBAGENT_ASC_PRIVATE_KEY_BASE64`. These are
  external gates, not invented source credentials.
