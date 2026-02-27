# FTC HOLDING

![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)

This monorepo contains multiple related applications and shared packages for the FTC ecosystem.

## Workspace layout
- `APPS/` – individual applications (ftc-site, peacepad, saywetin)
- `PACKAGES/` – shared libraries; currently contains `ateam`

## Running
- `npm install` to install dependencies for all workspaces.
- `npm run dev` (runs ftc-site dev server).
- `npm run build` builds all apps sequentially.
- `npm run test` runs available tests in each workspace.
- `npm run dev:peacepad` / `npm run dev:saywetin` for other apps.

## Notes
Keep each app as a standalone project; migrations use `robocopy` to move content.
