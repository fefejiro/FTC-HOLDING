# FTC developer start here

This is the practical entry point for developing inside FTC Holding on this Windows machine.

## The one fact that removes most confusion

`C:\FTC HOLDING` is one Git monorepo. Its apps are child folders.

If VS Code opens `C:\FTC HOLDING\APPS\saywetin-extension`, Git still walks upward and finds the repository at `C:\FTC HOLDING`. That does **not** mean every command builds SayWetin Extension. The command, package path, active branch, and worktree decide what you are changing.

Prove where you are:

```powershell
git rev-parse --show-toplevel
git branch --show-current
git status --short --branch
```

## Git in plain English

- **Repository (repo):** the tracked project and its history.
- **Clone:** a local copy connected to a remote repository.
- **Branch:** a named line of work.
- **Commit:** a saved checkpoint of selected files.
- **Fetch:** download knowledge of remote changes without changing your files.
- **Pull:** fetch and then integrate remote changes into the current branch.
- **Push:** upload local commits to the remote branch.
- **Merge:** combine one branch into another.
- **Pull request (PR):** the GitHub review step before merging.
- **Worktree:** another checked-out branch that shares the same Git history without duplicating the entire repository database.

## Next time you open VS Code

1. Open `C:\FTC HOLDING\FTC-HOLDING.code-workspace`.
2. Run **Terminal > Run Task > FTC: Where am I?**.
3. Confirm `GitRoot`, `Branch`, `DirtyEntries`, and free space.
4. Decide the exact app: for example `APPS\peacepad`, `APPS\una-labs-site`, or `APPS\saywetin-extension`.
5. Read that app's `README.md` and `package.json` scripts before building.
6. Run **FTC: Fetch safely**. Review changes before integrating anything.
7. Continue the existing feature branch or create an isolated worktree for unrelated work.

Use the agent prompt: `Use $ftc-workspace-sanitation to run Sanitation Day in Lagos and orient me before we build.`

## Installed MCP connections

Run `codex mcp list` to see current status.

- `ftc_workspace`: local, read-only sanitation/context helper installed on C.
- `supabase`: hosted and configured with `read_only=true` for daily safety.
- `github`, `cloudflare`, and `context7`: hosted connections; each provider may require a one-time OAuth/token login.

An MCP being listed means its connection is configured. It does not prove account authentication. Never paste provider tokens into this repository.

## The normal save-and-share routine

```powershell
git status --short --branch
git diff -- path\you-changed
git add -- path\you-changed
git diff --cached
git commit -m "fix(app): explain the result"
git push -u origin HEAD
```

Then open a PR on GitHub. Merge only after review/checks. Do not use `git add .` in a shared dirty checkout because it can scoop another person's files into your commit like Lagos flood water.

## Updating safely

```powershell
git fetch --prune origin
git status --short --branch
git log --oneline --decorate --graph --max-count=15 --all
```

Only pull or merge after the status is understood. A dirty checkout is not automatically bad; it means there is unfinished local work that must be protected.

## Building an app

Run commands with an explicit app path, even when the terminal is elsewhere:

```powershell
npm --prefix "C:\FTC HOLDING\APPS\una-labs-site" run build
npm --prefix "C:\FTC HOLDING\APPS\saywetin-extension" run build
```

For PeacePad mobile/AAB work, first identify the active PeacePad release worktree and its documented build script. Do not build based only on an editor tab title. Keep active source, dependencies, and routine builds on C. Upload durable artifacts to their approved cloud destination and remove reproducible local output after verification. D is backup, not the daily build surface.

Cleanup restores disk headroom and can reduce I/O pressure. It does not add RAM. Keep hot caches on C for speed, but remove stale package caches, old build output, duplicate SDK downloads, and local artifacts that are already verified in cloud storage.

## Safety rules

- Never delete a branch/worktree merely because its name looks old.
- Never clean, reset, or discard files without proving ownership and backup.
- Stage explicit paths and inspect the staged diff.
- Never commit secrets, service-account JSON, `.env` files, or access tokens.
- Build/release claims require the actual artifact and provider/device evidence.

See [Sanitation Day in Lagos handover](FTC_SANITATION_HANDOVER_2026-08-29.md) for the current machine layout.
