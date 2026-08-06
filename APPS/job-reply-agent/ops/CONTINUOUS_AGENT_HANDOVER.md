# JobAgent Continuous Handover

## Last Verified State

- Updated: 2026-08-06 17:21 America/New_York
- Release branch: `feat/job-agent-product-foundation`
- Recorded parent HEAD: `b90ff6b1 Fix JobAgent workspace agent discovery`;
  verify the current HEAD with git because the handover update commit follows it
- Autonomous worktree: `C:\FTC HOLDING\_worktrees\job-agent-continuous`
- Autonomous branch: `agent/job-agent-continuous`
- Windows task: `JobReplyAgent-Product-Continuous`
- Task policy: every 6 hours, no overlap, 45-minute limit, maximum two model
  runs per day, product engineering only
- Last task result: `0` after the daily-cap safety check

This file is a resumable evidence record, not a claim that every external
connector or production release gate is complete. Verify drift-prone runtime
facts before changing them.

## Completed In The Latest Increment

- Added the visible `JobAgent Continuous Operator` workspace agent.
- Added a bounded Windows scheduled Codex runner and registration script.
- Added an isolated autonomous worktree and explicit safe engineering backlog.
- Completed and reviewed the first autonomous increment for connector and
  scheduler release-gate status surfaces.
- Preserved the connected account identifier in the authenticated user's view
  while excluding credentials, private evidence references, raw blocking text,
  and candidate message content.
- Added this durable handover and the reusable `jobagent-continue` prompt.

## Verification Evidence

- PowerShell parser: passed for continuous runner and registrar.
- Focused scheduler/release-gate tests: `8/8` passed after review.
- Full Vitest suite: `27` files passed, `1` skipped; `205` tests passed,
  `8` skipped.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run production:check`: passed in static mode.
- Strict deployment-environment release checks were not run in this increment.
- No recruiter email, job application, browser action, deployment, DNS change,
  secret change, billing action, or production mutation occurred.

## Current Boundaries And Manual Gates

- The scheduled product agent runs only while the Windows computer is on and
  the configured user has an interactive session.
- The release branch has local commits ahead of origin and is not pushed by the
  unattended task.
- Gmail OAuth, authenticated job-board proof runs, deployment operations, and
  candidate actions remain separate explicitly authorized workflows.
- Public beta expansion still depends on external and pilot gates documented in
  `PRODUCT_ARCHITECTURE.md`.

## Next Highest-Impact Work

1. Add responsive Playwright coverage for match explanations, ATS gap reports,
   application timelines, interview preparation, and approvals on mobile and
   desktop.
2. Audit queue idempotency, lease recovery, and dead-letter operator visibility;
   implement only the smallest missing test-backed increment.
3. Reconcile architecture, runbook, and public-beta status against current code,
   deployment evidence, and external/manual gates.

## Resume Command

In the FTC workspace, select **JobAgent Continuous Operator**, invoke
`/jobagent-continue`, and optionally replace the Optional Override line.

For a direct scheduled-run preflight without model invocation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File `
  "C:\FTC HOLDING\_worktrees\job-agent-release\APPS\job-reply-agent\scripts\continuous-agent-run.ps1" `
  -ProjectRoot "C:\FTC HOLDING\_worktrees\job-agent-release\APPS\job-reply-agent" `
  -WorktreeRoot "C:\FTC HOLDING\_worktrees\job-agent-continuous" `
  -StateRoot "C:\FTC HOLDING\APPS\job-reply-agent" `
  -MaxRunsPerDay 2 -MaxMinutes 45 -DryRun
```

## Update Contract

Every interactive or scheduled product-engineering run must update this file
before its final commit. Replace stale evidence rather than stacking optimistic
claims. Keep completed, deployed, externally verified, paused, and blocked
states distinct.
