# FTC workspace policy

## Local layout

- Canonical source: `C:\FTC HOLDING`
- Active worktrees: under `C:\FTC HOLDING\_worktrees` only when isolation is needed and space is sufficient
- Cloud: durable release artifacts and source-of-truth branch/PR backup
- D: backup only; do not use it as the normal dependency cache or active build surface

If `C:\FTC HOLDING\node_modules` is a junction to D, inspect and reverse that migration deliberately after enough C space is available. Do not run a root install until the target and package scope are understood; package managers may replace dependency trees.

## Safe Git sequence

```powershell
git rev-parse --show-toplevel
git status --short --branch
git fetch --prune origin
git diff --stat
git add -- path\you-intended-to-change
git diff --cached
git commit -m "docs: describe the change"
git push -u origin HEAD
```

`fetch` updates remote knowledge. `pull` fetches and then integrates into the current branch. Prefer fetch plus review in a dirty or shared checkout.

## Worktree removal gate

All must be true before removal:

- Exact path is known and is inside an approved FTC worktree parent.
- `git status --porcelain` is empty in that worktree.
- Its branch/commit exists remotely or is merged into the agreed base.
- No editor, build, or agent is using it.
- The removal does not target the canonical `C:\FTC HOLDING` checkout.
