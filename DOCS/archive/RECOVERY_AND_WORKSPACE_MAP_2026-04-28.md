# FTC Holding Recovery And Workspace Map

Last updated: 2026-04-28

This document records the current local recovery state after the accidental cleanup. It is meant to keep a new developer oriented until the restored monorepo is promoted back to `C:\FTC HOLDING` or the team intentionally chooses a different canonical root.

## Current Source Of Truth

- Git-backed restored monorepo: `C:\FTC HOLDING\_restore_repo`
- Git remote: `https://github.com/fefejiro/FTC-HOLDING.git`
- Current branch: `main`
- Last verified remote sync: 2026-04-28, after `git fetch --prune`
- Current HEAD: `d00a2379 ftc-site: restore Garden Cleaners premium CSS + unoptimize images for Pages static deploy`
- Tracking state after fetch: `main` matches `origin/main`

## Important Local Reality

`C:\FTC HOLDING` is the intended canonical repo root in the repo docs, but the only live `.git` directory currently found is:

```text
C:\FTC HOLDING\_restore_repo\.git
```

That means `C:\FTC HOLDING\_restore_repo` is the safe working root for git operations right now. Running `git status` from `C:\FTC HOLDING` or from `C:\FTC HOLDING\APPS\saywetin-extension` will not work unless the `.git` metadata is promoted back to the root.

## Top-Level Folder Roles

Use these roles while cleanup is in progress:

| Path | Current role |
| --- | --- |
| `C:\FTC HOLDING\_restore_repo` | Restored monorepo with git history. Treat as source of truth for code, docs, packages, workers, scripts, and skills. |
| `C:\FTC HOLDING\APPS` | Partial working app tree outside git. Keep for comparison and recovery only until reconciled. |
| `C:\FTC HOLDING\DOCS` | Partial docs outside git. Contains a newer SayWetin handover file that should be reviewed before final consolidation. |
| `C:\FTC HOLDING\Git` | Bundled Git for Windows files, not source code. Keep out of git. |
| `C:\FTC HOLDING\node_modules` | Root dependency install from an accidental minimal package setup. Do not treat as source. |
| `C:\FTC HOLDING\tmp-bin` | Local temporary binaries/screenshots. Do not treat as source. |
| `C:\FTC HOLDING\ftc-restore.zip` | Recovery archive. Keep until final recovery signoff. |

## Skills And Agent Context

Recovered local skills are present at:

```text
C:\FTC HOLDING\_restore_repo\.agents\skills
```

The recovered lock file is:

```text
C:\FTC HOLDING\_restore_repo\skills-lock.json
```

Current recovered skills:

- `stripe-best-practices`
- `stripe-projects`
- `upgrade-stripe`

The `.agents/` directory is ignored by git in the restored repo, so this is local operational context. Do not delete it during cleanup unless the skills have been intentionally reinstalled elsewhere and the lock file has been updated.

## New Developer Entry Points

Start here from the restored repo root:

```powershell
cd "C:\FTC HOLDING\_restore_repo"
git status -sb
```

Then read:

- `README.md` for repo structure and deployment reality
- `FTC_MASTER.md` for cross-project status and priority
- `DOCS/INDEX.md` for documentation navigation
- `DOCS/RUNBOOK.md` for operational commands
- App-local docs such as `APPS/ftc-site/README.md`, `APPS/saywetin/README.md`, and `APPS/peacepad/README.md`

## Loose Files To Reconcile

These items exist outside the restored git-backed repo and should be reviewed before final promotion:

- `C:\FTC HOLDING\APPS\saywetin-extension` is a Vite/React Chrome Extension project for SayWetin. It is not currently in the restored monorepo and has its own `dist/` and `node_modules/` folders.
- `C:\FTC HOLDING\DOCS\SAYWETIN_HANDOVER_2026-04-27.md` is a newer SayWetin QA, ContentOps, and Play Store handover bundle. A redacted canonical copy now lives at `DOCS/SAYWETIN_HANDOVER_2026-04-27_REDACTED.md`.
- `C:\FTC HOLDING\package.json` is a minimal accidental package file with only `create-vite`; do not replace the restored monorepo `package.json` with it.
- `C:\FTC HOLDING\gardencleaners-pages-settings.md` is empty.
- `C:\FTC HOLDING\Screenshot 2026-03-11 185857.png` appears to be a loose local screenshot, not repo structure.

## Current Git State To Preserve

After fetch, `main` is not ahead or behind `origin/main`, but the restored working tree contains local changes and untracked recovery work. Do not reset or clean the tree without reviewing these changes.

High-level changed areas include:

- Garden Cleaners and OG Trades Academy routes in `APPS/ftc-site`
- SayWetin client/server changes plus new pages/components
- Una Labs site config changes
- Supabase package and migrations
- Garden portal docs and scripts
- New GitHub workflows for SayWetin
- New `workers/saywetin-ai`

## Consolidation Recommendation

1. Keep `_restore_repo` intact until final signoff.
2. Review files that exist only outside `_restore_repo`, especially `DOCS/SAYWETIN_HANDOVER_2026-04-27.md` and `APPS/saywetin-extension`.
3. Promote the restored monorepo back to `C:\FTC HOLDING` only after deciding whether those outside files should be copied into the restored tree.
4. Preserve `ftc-restore.zip` until the promoted root passes `git status -sb`, dependency install, and the highest-priority smoke checks.
5. After promotion, update docs so all canonical root references say `C:\FTC HOLDING`, and archive `_restore_repo` only after a git commit or external backup exists.

Related recovery docs:

- `DOCS/RECOVERY_CHECKLIST_2026-04-28.md`
- `DOCS/SECRET_AND_SKILLS_INVENTORY_2026-04-28.md`
