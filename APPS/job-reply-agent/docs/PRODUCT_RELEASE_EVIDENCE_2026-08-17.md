# JobAgent Revenue Launch RC3 Evidence - 2026-08-17

## Release Identity

- Code image SHA: `407100eb9d872fc2ee857ad482af4807aa5cfd84`
- Branch: `release/jobagent-revenue-launch-rc3`
- Draft PR: `https://github.com/fefejiro/FTC-HOLDING/pull/253`
- Schema version: `011_revenue_launch`
- Hosted deployment identifier: **not available**

## Repository Evidence

- Public product and configurable pricing are served from `/`; the signed-in
  workspace is served from `/app`.
- Public signup is capped and can be disabled independently of invitations.
- Checkout is fail-closed behind `BILLING_CHECKOUT_ENABLED`.
- Revenue schema includes tenant-owned customers, subscriptions, events,
  entitlements, usage, and acquisition events with forced row-level security.
- `una-stripe-api` has an isolated JobAgent dispatcher, catalog status/bootstrap,
  Checkout, Customer Portal, Mailjet email, and signed webhook delivery.
- Stripe events require explicit JobAgent service metadata and are idempotent.
- Expected Stripe catalog values are enforced: CAD 999 weekly, CAD 2999 monthly,
  CAD 23999 annual, and `FOUNDING25` at 25 percent for three monthly payments
  with a maximum of 100 redemptions.
- Native clients contain no Stripe checkout or external purchase prompt.

## Local Verification

| Check | Result |
|---|---|
| Application clean install | Passed |
| Worker clean install | Passed |
| TypeScript build | Passed with 4096 MB Node heap after a parallel low-memory attempt exhausted the default heap |
| Lint | Passed |
| Application tests | `30` files, `229` tests passed |
| Worker tests | `1` file, `7` tests passed |
| PostgreSQL tenant/billing proof | Passed against local PostgreSQL 18 on an isolated temporary database |
| Customer smoke | Passed at `390x844` and `1440x1000` |
| Static production check | Passed with only the expected runtime-environment warning |
| Strict production check | Passed with no warnings using synthetic non-secret deployment values |
| Application production audit | `0` vulnerabilities with `--workspaces=false` |
| Worker production audit | `0` vulnerabilities with `--workspaces=false` |
| Credential-pattern scan | No real credentials found; only an explicit Stripe test placeholder and an existing setup prompt matched |

The unscoped monorepo audit includes ignored/extraneous root packages and is not
the application release audit. The application-local and Worker-local audits
are the relevant standalone results.

## GitHub Actions Evidence

- Workflow: `JobAgent SaaS release gates`
- Run: `https://github.com/fefejiro/FTC-HOLDING/actions/runs/32089839983`
- Head: `1fb76183539f578764770092daf193e1c73b9664`
- Result: all three jobs passed.
- `standalone-and-security` passed clean install, audit, static checks,
  compile/lint, `229` tests, browser smoke, strict configuration, and Gitleaks.
- `immutable-image` built the image and proved all entrypoints/public assets.
- `billing-gateway` passed clean install, audit, typecheck, and `7` isolated
  Stripe/Mailjet Worker tests.
- Two earlier manual runs were cancelled after `playwright install --with-deps`
  stalled on separate runners. Workflow head `1fb761835` installs only Chromium
  and caps the smoke step at five minutes; its browser smoke completed in 16
  seconds.

## External Probe

On 2026-08-17:

- `https://jobagent.unalabs.cloud/edgez` returned `200`, JSON content, and a
  Cloudflare server header.
- `/`, `/healthz`, `/readyz`, and `/api/v1/release` each returned `404`.

This proves the Cloudflare edge exists and the configured origin does not
currently serve JobAgent. It does not prove a release deployment.

## Infrastructure Audit

- Current Railway CLI account: PeacePad workspace on the Free plan.
- Visible project: `lively-simplicity`, containing PeacePad/ATEAM/FTC services.
- Original dedicated `una-jobagent` project: not accessible to the current CLI
  identity; no repository or GitHub secret exposes its project token.
- Cloudflare, Vercel, and local Google Cloud access were inspected. No existing
  zero-cost target can run the current PostgreSQL, pg-boss, private-storage,
  long-lived worker architecture without a meaningful replatform.
- The PeacePad Railway project was not modified and no production secrets,
  DNS, Stripe catalog, subscriptions, charges, or webhooks were mutated.

## Paused And Blocked

- **Paused:** shared Worker deployment, catalog bootstrap, checkout activation,
  live Stripe lifecycle, Mailjet delivery, customer activation, and marketing.
- **Blocked:** exact hosted deployment and live tests require access to the
  original `una-jobagent` Railway account/project or an explicitly funded new
  dedicated project.
- **Not claimed:** production readiness, revenue readiness, public beta,
  autonomous connector certification, Play submission, TestFlight, App Store
  review, or a genuine paid transaction.

## Cleanup

The temporary PostgreSQL proof service must be stopped at the end of the run.
Its data directory and dependency caches on `D:` are disposable after remote CI
and any needed forensic review. Candidate operational state, browser profiles,
OAuth tokens, and signing secrets were never copied into this worktree.
