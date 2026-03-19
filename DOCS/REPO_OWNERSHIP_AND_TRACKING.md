# Repo Ownership and Tracking Clarity

Last updated: 2026-03-08
Canonical root: `C:\FTC HOLDING`

## Current Ownership Reality

1. Root Git repository
- Remote: `https://github.com/fefejiro/FTC-HOLDING.git`
- Branch: `main`
- Source of truth for this codebase is the root repo at `C:\FTC HOLDING`.

2. Nested duplicate tree
- `C:\FTC HOLDING\FTC-HOLDING` contains its own `.git`.
- This nested tree is not the canonical source of truth for the root repo.
- To reduce accidental staging/confusion, root `.gitignore` now excludes `FTC-HOLDING/`.

3. `APPS/ATEAM` tracking status
- `APPS/ATEAM` currently appears as untracked in root (`git status` shows `?? APPS/ATEAM/`).
- `git ls-tree -d HEAD APPS/...` includes `ftc-site`, `peacepad`, `saywetin`, but not `ATEAM`.
- `APPS/ATEAM` does not contain its own `.git` file/dir in this working tree.
- Root `.gitmodules` is absent, so this is not a submodule case.

## Why `APPS/ATEAM` Is Untracked from Root

Based on repo evidence:
- `APPS/ATEAM` is present on disk.
- It is not included in the current `HEAD` tree.
- It is not excluded by root ignore rules (except temp files added in this pass).

Conclusion:
- The directory exists locally but has not been added/committed into root git history in the current branch state.

## Minimum Safe Changes Applied in This Pass

1. Added ignore rule for nested duplicate tree:
- `.gitignore`: `FTC-HOLDING/`

2. Added ignore rule for ATEAM temp artifacts:
- `.gitignore`: `APPS/ATEAM/tmpclaude-*`

No destructive repo restructuring was performed.

## Manual Decisions Still Required

1. ATEAM ownership decision (required)
- Option A: Track `APPS/ATEAM` in this root monorepo and commit intentionally.
- Option B: Keep ATEAM out of this root repo and move/archive it elsewhere.

2. Duplicate tree decision (recommended)
- Confirm whether `C:\FTC HOLDING\FTC-HOLDING` should be deleted/archived outside repo root.
- Current safe default is to keep it ignored and untouched.

3. Temp publish worktree decision (recommended)
- Multiple temp worktrees may exist during isolated production promotion flows.
- Do not remove them casually during active work.
- If cleanup is desired, handle it as a deliberate hygiene pass after confirming no release work depends on them.

## Verification Commands

Run from `C:\FTC HOLDING`:

```powershell
git status -sb
git ls-tree -d HEAD APPS APPS/ATEAM APPS/ftc-site APPS/peacepad APPS/saywetin
Test-Path APPS/ATEAM/.git
Test-Path .gitmodules
```
