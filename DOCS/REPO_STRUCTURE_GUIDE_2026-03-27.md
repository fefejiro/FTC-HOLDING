# Repo Structure Guide 2026-03-27

## Current Risks

- The canonical repo is `C:\FTC HOLDING`.
- A nested duplicate repo exists at `C:\FTC HOLDING\FTC-HOLDING`.
- Additional linked worktrees exist outside the root, including one dirty publish worktree.

This causes duplicate Source Control roots in VS Code and raises the risk of editing or committing from the wrong checkout.

## Safe End State

- Keep one canonical repo root: `C:\FTC HOLDING`
- Keep linked worktrees outside the repo in one stable directory, for example:
  - `C:\worktrees\publish-unalabs`
  - `C:\worktrees\release-snapshots`
- Do not keep a nested `.git` repo inside the main repo tree.
- Keep deploy-specific shims isolated:
  - `APPS/ftc-site` for the main site
  - `APPS/ATEAM` for the workflow engine
  - `workers/ateam-edge` for route-level fallback and edge proxying

## Recommended Cleanup Order

1. Preserve the real root as the source of truth.
2. Keep the nested repo ignored in VS Code until it is archived or removed.
3. Audit the dirty publish worktree before moving or deleting it.
4. Move any long-lived worktrees into a dedicated `C:\worktrees` folder.
5. Archive or remove the nested duplicate repo only after confirming there is no unique work left inside it.

## Fallback Strategy

- Cloudflare Pages remains the primary host for the Una Labs site.
- Railway remains the primary host for the ATEAM API.
- `workers/ateam-edge` remains the route-level fallback for `/ateam` and `/api/ateam/*` while the main Pages build path is being stabilized.

This keeps the public flow live even when the main Next/Pages adapter path is unhealthy.

## Immediate Rule

If Source Control shows multiple roots again, verify which one you are in before committing. The only repo that should carry day-to-day product changes is `C:\FTC HOLDING`.
