# FTC Holding agent guidance

`C:\FTC HOLDING` is the canonical Windows monorepo. A session opened in an `APPS` child folder still belongs to this parent Git repository.

- Begin with `git rev-parse --show-toplevel` and `git status --short --branch`.
- Preserve unrelated modified/untracked files. Never bulk-stage, reset, clean, or discard a shared dirty checkout.
- Use an isolated named worktree for unrelated work and remove it promptly after merge.
- Keep active source, dependencies, and routine builds on C. Put durable artifacts in approved cloud storage; treat D as backup.
- Fetch/prune and inspect before pull/merge. Stage explicit files, inspect the staged diff, then commit/push the feature branch.
- Treat build, deployment, payment, and release status as evidence-backed claims.
- Use `.agents/skills/ftc-workspace-sanitation` for workspace identity, Git/worktree cleanup, disk/cache decisions, and Sanitation Day in Lagos.

Human onboarding starts at `DOCS/FTC_DEVELOPER_START_HERE.md`.
