# FTC HOLDING Monorepo Runbook

This document describes how to work with the monorepo located at `C:\FTC HOLDING`.

## Prerequisites

- Windows 10/11 or similar
- Node.js v24.x (tested with v24.13.1)
- npm v11.x (tested with v11.7.0)
- PowerShell (this runbook uses PowerShell syntax, but commands should work in CMD/Bash with minor adjustments)

## Directory Layout

```
C:\FTC HOLDING
├─ APPS       # contains application projects (ftc-site, peacepad, saywetin)
├─ PACKAGES   # shared libraries (empty initially)
└─ DOCS       # documentation (this file included)
```

Each app is a standalone Node project with its own `package.json`. They are configured as npm workspace members using the `@ftc/*` scope.

## Installing Dependencies

You generally install per‑app because of peer dependency mismatches (Capacitor v7 vs v8). Use the `--legacy-peer-deps` flag when running `npm install`.

```powershell
# from the repo root
cd C:\FTC HOLDING
# optional if you want to try workspace install (may fail due to Capacitor mismatch):
# npm install --legacy-peer-deps

# safer: install in each app
cd APPS\ftc-site      ; npm install --legacy-peer-deps
cd ..\peacepad         ; npm install --legacy-peer-deps
cd ..\saywetin         ; npm install --legacy-peer-deps
```

> 🔧 **Note:** PeacePad uses Capacitor 7.x, SayWetin uses 8.x. Installing from root will throw dependency errors; that's why we install per-app.

## Building Shared Packages

Before building apps, you may need to build the shared packages under `PACKAGES/`. These are TypeScript utility packages used by apps.

**Shared packages:**
- `@ftc/config` — port numbers and environment configuration
- `@ftc/logger` — centralized logging utilities
- `@ftc/types` — shared type definitions

**Build command for each package:**
```powershell
cd C:\FTC HOLDING\PACKAGES\config   ; npm run build
cd ..\logger                         ; npm run build
cd ..\types                          ; npm run build
```

Each package compiles TypeScript to `dist/` using the `tsc` command. Apps reference these packages using `file:` protocol in their `package.json`, allowing direct imports like:
```typescript
import { PORTS } from '@ftc/config';
import { createLogger } from '@ftc/logger';
import { UserRole } from '@ftc/types';
```

## Building Projects

Each application exposes a `build` script. The root `package.json` has helper scripts to invoke them via workspace notation.

```powershell
# from repo root
npm run build:ftc        # builds ftc-site (Next.js)
npm run build:peacepad   # builds PeacePad (Vite + esbuild)
npm run build:saywetin   # builds SayWetin (Vite + esbuild)

# or, individually:
cd APPS\ftc-site   ; npm run build
cd ..\peacepad     ; npm run build
cd ..\saywetin     ; npm run build
```

All three apps compile successfully after dependencies are installed. If a build error occurs, fix only build-breaking issues (do not refactor architecture).

### Warnings Seen During Builds

- `A PostCSS plugin did not pass the 'from' option` – harmless warning from Vite.
- Chunk size warnings indicating large bundles – informational only.
- SayWetin initially failed due to missing `@capacitor/filesystem`; the dependency was added and rerun.

## Developing

- **ftc-site** uses Next.js App Router. Run `npm run dev` in its directory (or `npm run dev:ftc` from root) to start on port 3001 (this is enforced for test consistency).
- **peacepad** and **saywetin** run a Node dev server via `npm run dev`.

Example:

```powershell
# start ftc-site dev server on port 3001
cd APPS\ftc-site
npm run dev

# In another shell, do the same for PeacePad or SayWetin:
cd APPS\peacepad ; npm run dev
cd APPS\saywetin ; npm run dev
```

## Testing

### ftc-site (Playwright)

Playwright e2e specs live under `APPS\ftc-site\tests`. The test runner automatically starts a dev server on port 3001, so no manual setup is required.

**Single command to run all tests:**
```powershell
cd C:\FTC HOLDING\APPS\ftc-site
npm run test:e2e    # or npm test
```

The Playwright configuration in `playwright.config.ts` starts Next.js automatically and waits for it to be ready before running tests. The port (3001) is imported from `@ftc/config` to ensure consistency across the application. All 10 navigation tests pass, validating routes and header link behavior.

**Port:** Fixed to 3001 via `PORTS.FTC` in `@ftc/config` for test consistency.

### PeacePad / SayWetin

No dedicated test scripts are provided beyond an internal `test:report`. They both include dev dependencies for Vitest/Playwright, but configuration is project‑specific.

If you want to run unit tests manually, explore the `tests` or `server` directories and invoke `npx vitest` or relevant commands.

## Common Operations

- **Clean install:** delete `node_modules` and rerun `npm install --legacy-peer-deps` in each app.
- **Add a new package to workspace:** create under `PACKAGES/` and add its path to the `workspaces` array in root `package.json`.
- **Link local packages:** use normal workspace syntax (`npm i @ftc/mypackage` from an app) after publishing or creating in `PACKAGES`.

## Troubleshooting

- **Capacitor peer conflicts:** Stick to per-app installs with `--legacy-peer-deps`.
- **Port 3001 in use:** ftc-site dev and tests both use port 3001. Kill any existing process on that port before running tests/dev: `netstat -ano | findstr :3001` to find the PID, then `taskkill /PID <pid> /F`.
- **Locked files when renaming source directories:** original project folders have been backed up (`__MOVED_BACKUP`) – keep them until migration is verified.

## Backup Strategy

1. Original repositories were copied using `robocopy` with `/E /XD` to exclude build artifacts.
2. Source folders remain at their original paths suffixed with `__MOVED_BACKUP` for safety.
3. Backups may be removed once monorepo stability is confirmed.

## Additional Notes

- Apps are scoped `@ftc/` to simplify workspace commands and avoid name collisions.
- Documentation files (`PROJECT_CONTEXT.md`, `RUNBOOK.md`, `AI_GUARDRAILS.md`) reside at each project root for context and policies.

---

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request targeting `main`.

The job **ftc-site** uses `ubuntu-latest` and Node 24, caches npm packages, and restricts operations to the `APPS/ftc-site` folder to avoid peer‑dependency conflicts with Capacitor.

It executes:

```bash
cd APPS/ftc-site
npm ci --legacy-peer-deps
npx playwright install --with-deps
npm run build
npm run test:e2e
```

To reproduce locally, simply run the same commands from `C:\FTC HOLDING\APPS\ftc-site`.  The package scripts already exist (`build`, `test:e2e`).

---

Keep this runbook updated with changes to workspace configuration, build steps, or new applications.
