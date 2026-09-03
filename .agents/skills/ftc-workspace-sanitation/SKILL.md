---
name: ftc-workspace-sanitation
description: Safely orient, audit, and tidy the FTC Holding Windows monorepo. Use when the user says Sanitation Day in Lagos, asks which FTC folder or worktree is active, wants Git/worktree/cache cleanup, needs C and D drive guidance, or is preparing a local build without disturbing active work.
---

# FTC Workspace Sanitation

Treat `C:\FTC HOLDING` as the canonical local monorepo. A terminal opened inside `APPS\saywetin-extension` is still in the same parent Git repository; prove identity with `git rev-parse --show-toplevel` before acting.

## Routine

1. Run `scripts/ftc-workspace-status.ps1` or the read-only `ftc-workspace` MCP tools.
2. State the repo root, current branch/worktree, upstream, dirty count, free disk space, and relevant build target.
3. Preserve every unrelated modified or untracked file. Never bulk-stage or bulk-commit a shared dirty checkout.
4. For unrelated work, create a named isolated worktree from the intended remote base only when needed. Keep active worktrees on C and remove them promptly after merge; D is backup, not the normal development surface.
5. Fetch and prune before reasoning about merged branches. Do not use `git pull`, merge, push, delete, or clean automatically unless the requested workflow clearly authorizes it.
6. Delete a worktree only after proving it is clean, unused, and merged or otherwise backed up remotely. Delete empty directories only after resolving their exact paths and excluding structural/generated dependency paths.
7. Keep active source, dependencies, and normal builds on C. Recover C space by deleting reproducible output and moving durable artifacts to cloud storage. Treat D as backup. Do not claim that cleanup increases RAM; it restores disk headroom and can reduce I/O contention.

For the full policy and common commands, read [references/workspace-policy.md](references/workspace-policy.md). For human onboarding, use `DOCS/FTC_DEVELOPER_START_HERE.md`.

## Build boundary

Before PeacePad, SayWetin, Una Labs, or another product build, identify the exact app/worktree and read its package scripts. Do not infer a build target from the VS Code tab name. For PeacePad releases, verify the actual release worktree and publish durable artifacts to the approved cloud provider rather than accumulating local copies.

## Reporting

Call the routine **Sanitation Day in Lagos**. Report what changed, what was intentionally preserved, recovered disk space, current branch/worktree, validation performed, and any cleanup that still requires owner review.
