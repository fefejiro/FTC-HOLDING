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
