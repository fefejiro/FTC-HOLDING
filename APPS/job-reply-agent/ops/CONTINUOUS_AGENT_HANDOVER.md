# JobAgent Continuous Handover

## Last Verified State

UnaScout store-release code image `e6fe31c63` is committed on
`release/unascout-store-publish`. Local release checks and the signed Android
bundle are green. The hosted origin is not running, checkout remains disabled,
and no payment has been accepted. See `ops/RELEASE_STATUS.md` and
`docs/PRODUCT_RELEASE_EVIDENCE_2026-08-18.md` for the exact evidence boundary.

- Updated: 2026-08-18 America/New_York
- Engineering branch: `release/unascout-store-publish`
- Store code image: `e6fe31c63`
- Draft PR: pending branch push
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

## Revenue Launch Increment - 2026-08-17

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
- Cloudflare `/edgez` is live, but `/`, `/healthz`, `/readyz`, and
  `/api/v1/release` return `404`. Do not deploy the shared Worker or activate
  checkout until the JobAgent origin is restored and webhook delivery is proven.
- The current Railway identity owns only the PeacePad Free project. Do not mix
  JobAgent into it. Recover the original `una-jobagent` account/project first.
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

- The current store-release branch is `release/unascout-store-publish` at
  `e6fe31c63`. It contains the locked UnaScout public brand, final native art,
  store metadata, screenshot automation, iOS privacy declarations, hardened
  association routes, and release workflows.
- The signed Android `1.0.1 (2)` AAB was verified locally with SHA-256
  `D2BFD88D7DF5A8D88130FE7349A6E8D30DC42FCE4487E045C7F625DACA22BAED`.
  Its upload key remains outside Git under `D:\jobagent-release-secrets`.
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

1. Recover the Railway account/workspace that owns the original dedicated
   `una-jobagent` project. Do not deploy into PeacePad's Free project.
2. Deploy the exact revenue code image and prove health, readiness, release SHA,
   migration `011_revenue_launch`, private storage, and queue operation.
3. Deploy the shared Worker increment, bootstrap the exact Stripe catalog, and
   run the complete test-mode payment/entitlement/cancellation lifecycle.
4. Prove hosted tailored-package fulfillment before enabling checkout.
5. Publish exact-domain Android/Apple association files, then prove OAuth return
   on physical Android and iOS devices without exposing tokens in URLs/logs.
6. Restore the configured approved BA golden-template source before generating
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
