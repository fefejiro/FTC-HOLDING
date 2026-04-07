# Repo Structure Guide 2026-03-27

## Current Risks

- The canonical repo is `C:\FTC HOLDING`.
- The former nested duplicate repo was archived to `C:\Users\mikef\ArchivedRepos\FTC-HOLDING-nested-2026-03-27`.
- A small locked remnant still exists at `C:\FTC HOLDING\FTC-HOLDING\APPS\ATEAM` because Windows kept file handles open on the old SQLite memory files.
- Long-lived worktrees were moved into `C:\worktrees`.

The main duplicate-repo risk is now reduced, but the locked remnant should be deleted once the holding process releases it.

## Safe End State

- Keep one canonical repo root: `C:\FTC HOLDING`
- Keep linked worktrees outside the repo in one stable directory:
  - `C:\worktrees\publish-unalabs`
  - `C:\worktrees\ftc-publish-main`
- Do not keep a nested `.git` repo inside the main repo tree.
- Keep deploy-specific shims isolated:
  - `APPS/ftc-site` for the main site
  - `APPS/ATEAM` for the workflow engine
  - `workers/ateam-edge` for route-level fallback and edge proxying

## Recommended Cleanup Order

1. Preserve the real root as the source of truth.
2. Keep any duplicate repo ignored in VS Code until it is archived.
3. Move long-lived worktrees into `C:\worktrees`.
4. Remove leftover duplicate-repo remnants after confirming they are archived and no process still holds them open.
5. Audit dirty worktrees before resolving or deleting them.

## Fallback Strategy

- Cloudflare Pages remains the primary host for the Una Labs site.
- Railway remains the primary host for the ATEAM API.
- `workers/ateam-edge` remains the API/redirect edge layer for `/api/ateam/*` and mission-control paths while Cloudflare Pages owns `/ateam`.

This keeps the public flow live even when the main Next/Pages adapter path is unhealthy.

## Immediate Rule

If Source Control shows multiple roots again, verify which one you are in before committing. The only repo that should carry day-to-day product changes is `C:\FTC HOLDING`.

## Current Layout

- Canonical repo: `C:\FTC HOLDING`
- Dirty publish worktree: `C:\worktrees\publish-unalabs`
- Clean detached worktree: `C:\worktrees\ftc-publish-main`
- Archived duplicate repo: `C:\Users\mikef\ArchivedRepos\FTC-HOLDING-nested-2026-03-27`
- Leftover locked remnant to delete later: `C:\FTC HOLDING\FTC-HOLDING\APPS\ATEAM`
