# FTC workspace MCP server

A local, read-only MCP server for answering three questions before an agent works:

1. Which FTC repository, branch, and worktree am I in?
2. What local changes, worktrees, disk space, and cache layout exist?
3. Is the workspace ready for a safe sanitation/build session?

It exposes `ftc_get_workspace_context`, `ftc_list_worktrees`, and `ftc_get_sanitation_report`. It does not implement commit, pull, push, merge, reset, clean, or delete operations.

## Build and test

```powershell
npm --prefix tools/ftc-workspace-mcp-server install
npm --prefix tools/ftc-workspace-mcp-server test
```

The default target is `C:\FTC HOLDING`. Override it with `FTC_REPO_ROOT` only when testing an FTC worktree. Requests are limited to approved FTC roots on C and D.
