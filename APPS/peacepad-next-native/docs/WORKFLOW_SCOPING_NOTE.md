# PR #148 Workflow-Scoping Note

Date: 2026-07-25  
PR: https://github.com/fefejiro/FTC-HOLDING/pull/148  
Run: https://github.com/fefejiro/FTC-HOLDING/actions/runs/30159056119

## Finding

PR #148 contains no Garden application changes. `Garden Portal Deep QA` ran because the workflow includes the shared root `package-lock.json` in its pull-request path filter.

The PR updates that lockfile only to add PeacePad Next Native test dependencies. This triggered three unrelated Garden jobs:

- Env contract + build.
- Anonymous public + portal Playwright.
- Credentialed portal role QA.

All three jobs ended before executing any steps. No Garden failure can be attributed to the PeacePad lab diff.

## Scope boundary

No Garden code or Garden workflow is changed in PR #148.

Workflow path-filter refinement belongs in the portfolio cost-control/workflow-scoping backlog, alongside:

- [`DOCS/health/BILLING-HOLD-LOCAL-OPS.md`](../../../DOCS/health/BILLING-HOLD-LOCAL-OPS.md)
- [`DOCS/FTC_DELTA_IMPLEMENTATION_QUEUE.md`](../../../DOCS/FTC_DELTA_IMPLEMENTATION_QUEUE.md)

A future infrastructure-only change should decide whether root lockfile changes require every product's deep QA or whether a cheaper dependency-impact/preflight job can narrow the affected workspaces first.

## Cloudflare Workers build failure

Cloudflare also attempted to build its `peacepad` project for this lab-only PR. Local reproduction confirmed that the build stopped during the clean dependency install because the PR branch's root `package-lock.json` did not match the current workspace manifests. The lockfile contained stale package versions and omitted required packages.

The lockfile was regenerated from the current manifests and verified from a clean dependency state:

- `npm ci --ignore-scripts --no-audit --no-fund` passed.
- PeacePad Next Native typecheck passed.
- PeacePad Next Native guardrails passed.
- All 18 automated lab tests passed.
- Expo public configuration still reports `ca.peacepad.nextnative.lab` with production writes disabled.

No Garden source, submitted PeacePad source, production API, or Cloudflare deployment configuration was changed.

This PR should not trigger a production PeacePad deployment. Cloudflare's Git integration currently appears to watch the monorepo too broadly. Follow-up infrastructure work should configure the production project's build watch paths and root directory so `APPS/peacepad-next-native/**` and other unrelated lab-only changes are ignored. Reference: [Cloudflare Build watch paths](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/).
