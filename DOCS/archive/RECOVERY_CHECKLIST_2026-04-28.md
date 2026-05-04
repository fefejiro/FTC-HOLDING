# FTC Holding Recovery Checklist

Last updated: 2026-04-28

Use this checklist to finish the local cleanup without losing recovered work or committing local-only secrets.

## Completed In This Pass

- Added a root recovery pointer at `C:\FTC HOLDING\README.md`.
- Added the recovery map at `DOCS/RECOVERY_AND_WORKSPACE_MAP_2026-04-28.md`.
- Fixed `DOCS/INDEX.md` so the canonical root no longer points to `C:\FTC HOLDING\FTC-HOLDING`.
- Imported `APPS/saywetin-extension` into the restored monorepo, excluding `node_modules` and `dist`.
- Imported newer `APPS/saywetin-native` source, Android project files, QA bench, ContentOps scripts, release tooling, and docs.
- Preserved recovered repo skills under `.agents/skills` and kept `skills-lock.json` as the lock file.
- Updated ignore rules so Android source is trackable while local envs, keystores, generated reports, generated media, and build outputs stay ignored.
- Generated non-empty Chrome extension icon PNGs for `16`, `32`, `48`, and `128` sizes.

## Imported From Loose Local Folders

| Source | Destination | Status |
| --- | --- | --- |
| `C:\FTC HOLDING\APPS\saywetin-extension` | `C:\FTC HOLDING\_restore_repo\APPS\saywetin-extension` | Imported source/config/docs only. |
| `C:\FTC HOLDING\APPS\saywetin-native` | `C:\FTC HOLDING\_restore_repo\APPS\saywetin-native` | Imported source/config/Android/QA/ContentOps only. |
| `C:\FTC HOLDING\DOCS\SAYWETIN_HANDOVER_2026-04-27.md` | `DOCS/SAYWETIN_HANDOVER_2026-04-27_REDACTED.md` | Converted to redacted operational handover. |

## Intentionally Not Imported

| Local item | Reason |
| --- | --- |
| `APPS/saywetin-extension/node_modules` | Dependency install output. Recreate with `npm install` or `npm ci`. |
| `APPS/saywetin-extension/dist` | Build output. Recreate with `npm run build`. |
| `APPS/saywetin-native/.env` | Local secret/config file. Accounted for in the secrets inventory. |
| `APPS/saywetin-native/node_modules` | Dependency install output. |
| `APPS/saywetin-native/.expo` | Local Expo state. |
| `APPS/saywetin-native/qa/_report` | Generated QA output. |
| `APPS/saywetin-native/tools/agent-test/_runs` | Generated smoke logs. |
| `APPS/saywetin-native/contentops/voice/_out` | Generated audio/video output. |
| `APPS/saywetin-native/contentops/voice/_smoke` | Generated smoke audio output. |
| `APPS/saywetin-native/contentops/demos` | Generated demo videos. |
| `APPS/saywetin-native/contentops/approval/_archive` | Generated approval history. |
| `APPS/saywetin-native/contentops/approval/queue.json` | Runtime approval queue. |
| `APPS/saywetin-native/android/local.properties` | Local Android SDK path/config. |
| `APPS/saywetin-native/android/keystore-base64.txt` | Secret material. |
| `APPS/saywetin-native/android/app/debug.keystore` | Local debug signing material. |
| `APPS/saywetin-native/android/.gradle`, `android/.kotlin`, `android/build`, `android/app/build`, `android/app/.cxx` | Generated native build output. |

## Still Needs Review

- Decide whether nested app workflows under `APPS/saywetin-extension/.github/workflows` should remain app-local documentation or be converted into root `.github/workflows` files.
- Run a repo-level secret audit before committing.
- Review pre-existing tracked sensitive assets listed in `DOCS/SECRET_AND_SKILLS_INVENTORY_2026-04-28.md`.
- Decide whether to promote `_restore_repo` back to `C:\FTC HOLDING` after checks pass.
- Keep `ftc-restore.zip` until final promotion and smoke checks are complete.

## Verification Commands

Run from `C:\FTC HOLDING\_restore_repo`:

```powershell
git status -sb
npm run audit:secrets
npm --prefix APPS/saywetin-native run version:show
npm --prefix APPS/saywetin-native/qa run qa:unit
npm --prefix APPS/saywetin-extension run build
```

## Verification Run 2026-04-28

| Check | Result |
| --- | --- |
| `npm.cmd run audit:secrets` | PASS: no non-placeholder secrets detected in tracked files. |
| `npm.cmd --prefix APPS/saywetin-native run version:show` | PASS: `app.json` and `package.json` both at `1.3.2`; Android `versionCode` is `31`. |
| `npm.cmd --prefix APPS/saywetin-extension run build` | PASS after fixing TypeScript narrowing, removing unsupported `erasableSyntaxOnly`, and generating real icon PNGs. |

Note: the first extension build attempt inside the sandbox failed with `spawn EPERM` when Vite tried to start esbuild. The same build passed outside the sandbox, so that failure was environment-related.
