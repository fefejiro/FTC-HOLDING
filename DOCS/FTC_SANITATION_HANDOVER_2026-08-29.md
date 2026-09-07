# Sanitation Day in Lagos handover

Date: 2026-08-29

Owner: Fejiro

Repository: `fefejiro/FTC-HOLDING`

## Outcome

The local FTC workspace was audited and reduced without discarding active product work. C remains the canonical source, dependency, and normal build drive. Durable artifacts should move to approved cloud storage. D is retained as backup, not daily workspace/cache.

The editor happened to be opened inside `APPS\saywetin-extension`; Git correctly identified its parent repository as `C:\FTC HOLDING`. SayWetin Extension was the current folder, not a separate repository and not proof that it was the intended build target.

## Cleanup completed before this handover

- Removed stale `C:\pp-b` and `C:\pp-c` worktrees after safety checks.
- Removed nine additional clean/merged worktrees and 100 merged local branch pointers.
- Enabled Git untracked cache and filesystem monitor for faster status scans.
- Removed partial cache-migration leftovers and generated Una Labs `.next`/`out` output.
- Temporarily moved the root dependency tree behind a junction during the first cleanup pass:
  - Local path: `C:\FTC HOLDING\node_modules`
  - Target: `D:\FTC-HOLDING\cache-offload\C-FTC-HOLDING-root-node_modules\node_modules`
- Preserved all active Una Labs and other unrelated dirty/untracked work.

## Snapshot at documentation start

- Canonical checkout branch: `fix/una-social-premium-newsroom`
- Canonical checkout HEAD: `4f7a16390`
- Dirty/untracked entries: 41
- Worktrees: 32, including the temporary documentation worktree used for this handover
- Local branches: 87, including this documentation branch
- C free: approximately 14.6 GB
- D free: approximately 123.39 GB

These counts are a timestamp, not a permanent truth. Run the status task or MCP report for current values.

## Important caveats

- Root dependencies are not the same as every app's dependencies. Verify the exact app before claiming a build is ready.
- A package-manager install can replace dependency contents. Inspect the junction and package scope before reinstalling at the root.
- The D junction is transitional. Reverse it after enough C headroom is recovered, then use cloud/offline backup for durable material rather than making D the daily cache.
- The temporary worktree `D:\FTC-HOLDING-worktrees\ftc-workspace-sanitation` should be removed after its PR is merged and the branch is confirmed clean.

## New setup added

- Beginner guide: `DOCS/FTC_DEVELOPER_START_HERE.md`
- Reusable workspace: `FTC-HOLDING.code-workspace`
- Safe VS Code tasks: `.vscode/tasks.json`
- Repo agent guidance: `AGENTS.md`
- Skill: `.agents/skills/ftc-workspace-sanitation`
- Read-only local MCP: `tools/ftc-workspace-mcp-server`

The MCP reports context, Git/worktree inventory, disk space, and sanitation status. It cannot commit, pull, push, merge, reset, clean, or delete.

Global Codex MCP state at handover:

- `ftc_workspace`: installed on C and self-test passed.
- `supabase`: authenticated through OAuth and URL-enforced read-only mode.
- `github`: registered; login remains incomplete because the sample endpoint rejected dynamic client registration.
- `cloudflare`: registered; OAuth login remains incomplete.
- `context7`: registered; OAuth login remains incomplete.

## C cleanup evidence

- No empty first-level directories were found under `C:\FTC HOLDING`.
- `C:\pp-b` and `C:\pp-c` no longer exist.
- FTC Gradle wrappers currently reference 8.5, 8.11.1, or 8.14.3.
- Verified unused Gradle 9.x candidates total about 2.27 GB:
  - `C:\Users\mikef\.gradle\caches\9.1.0` (417.4 MB)
  - `C:\Users\mikef\.gradle\caches\9.2.0` (1767.1 MB)
  - `C:\Users\mikef\.gradle\wrapper\dists\gradle-9.2.0-bin` (143.3 MB)

The execution environment blocked recursive deletion, so these candidates were not removed. Do not substitute a broad cache deletion: preserve the 8.x cache used by current FTC Android builds.

## Next safe actions

1. Review and merge the documentation/setup branch.
2. Open the root workspace file from C.
3. Use the status task before each build session.
4. Resolve or commit the 41 canonical-checkout entries by product owner and branch; do not sweep them into one cleanup commit.
5. Remove this temporary D worktree after its branch is published and verified; it exists only to protect the active C checkout while creating this handover.
