---
name: "saywetin-three-surface-ship"
description: "Use when shipping a SayWetin feature slice end-to-end across all three surfaces in one pass: Railway backend (Express), Cloudflare Pages web (vite), and Google Play production (Expo bare → AAB → EAS submit). Encodes the monorepo Metro projectRoot fix, Hermes bundle verification gate, and the exact commit/deploy/submit sequence proven on Slice 2 (2026-04-25). Target: ≤60 min ship, hard cap 90 min."
---

# SayWetin Three-Surface Ship

End-to-end playbook for shipping a feature slice to backend + web + native in one pass without rediscovering the monorepo Metro pitfalls.

## Use When

- A SayWetin feature touches both API and clients (web + native).
- Ship must reach Play Production track and Cloudflare Pages prod in the same sprint.
- You want a deterministic 60-minute pipeline, not a 4-hour debugging detour.

## DO NOT use when

- Single-surface change (server-only or web-only). Use the standard CI deploy.
- Native-only typo or pure UI tweak. Use OTA path (Expo updates), not a full AAB.

## Hard preconditions (verify ONCE before slice; fail fast if missing)

1. `APPS/saywetin-native/metro.config.js` exists with `projectRoot = __dirname`, `watchFolders = [workspaceRoot]`, and `resolver.nodeModulesPaths = [local, workspace]`. **DO NOT** set `disableHierarchicalLookup` — breaks `expo-asset`.
2. `APPS/saywetin-native/android/app/build.gradle` has inside `react { ... }`:
   ```groovy
   extraPackagerArgs = ["--entry-file", file("${projectRoot}/index.ts").absolutePath]
   ```
3. `APPS/saywetin-native/.env` (gitignored) contains `EXPO_PUBLIC_API_BASE_URL=https://ftcpeacepad-extension-production.up.railway.app`.
4. EAS auth: `eas whoami` returns `official_fejiro`.
5. Play key: `Test-Path "C:/FTC HOLDING/secrets/play-store-key.json"` returns True.
6. wrangler authed for Cloudflare account `4c5c204659aebe5d95a99b55a5a7d0b4`.

If any of these fail, run the bootstrap script — do NOT proceed:
```pwsh
powershell -ExecutionPolicy Bypass -File .github/skills/saywetin-three-surface-ship/scripts/bootstrap.ps1
```
(`powershell` is Windows PowerShell 5.1, the default on this box. `pwsh` is NOT installed.)

## The 7-step sequence

### Step 1 — Backend route (15 min)
- Add route to `APPS/saywetin/server/routes.ts`, types in `APPS/saywetin/shared/`.
- Run `npm test` in `APPS/saywetin/`.
- Commit `feat(saywetin): <slice> backend` + push. Railway auto-deploys.
- Smoke prod:
  ```pwsh
  curl.exe -sS -X POST https://ftcpeacepad-extension-production.up.railway.app/v1/<route> -H "Content-Type: application/json" -d '{...}'
  ```
- **Gate**: 200 OK on at least 3 representative inputs.

### Step 2 — Client wiring (20 min, parallel native + web)
- Native: add `APPS/saywetin-native/src/api/<feature>.ts` reading `process.env.EXPO_PUBLIC_API_BASE_URL?.trim()`. Wire into screens.
- Web: add client call in `APPS/saywetin/client/src/...`, reading `import.meta.env.VITE_API_BASE_URL`.

### Step 3 — Bump versionCode (1 min)
Edit `APPS/saywetin-native/android/app/build.gradle`: increment `versionCode`, update `versionName` if user-visible.

### Step 4 — Native build (12 min, the slow part)
```pwsh
cd "C:/FTC HOLDING/APPS/saywetin-native/android"
./gradlew :app:bundleRelease :app:assembleRelease --rerun-tasks
```
`--rerun-tasks` is non-negotiable when `.env` or build.gradle changed.

### Step 5 — BLOCKING verification gate (1 min)
```pwsh
Add-Type -AssemblyName System.IO.Compression.FileSystem
$aab = "C:/FTC HOLDING/APPS/saywetin-native/android/app/build/outputs/bundle/release/app-release.aab"
$tmp = "$env:TEMP/saywetin-aab-scan"
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
[System.IO.Compression.ZipFile]::ExtractToDirectory($aab, $tmp)
$hits = (Select-String "$tmp/base/assets/index.android.bundle" -Pattern "ftcpeacepad-extension-production.up.railway.app" -SimpleMatch -AllMatches | Measure-Object).Count
"AAB bundle host hits: $hits"
```
**MUST be ≥1.** If 0, the prod URL is not baked — STOP, do not submit. Diagnose: `.env` missing, Metro projectRoot wrong, or `--rerun-tasks` skipped.

DO NOT use `Expand-Archive` — rejects `.apk`/`.aab` extensions.

### Step 6 — Deploy web (3 min)
```pwsh
cd "C:/FTC HOLDING/APPS/saywetin"
npm run build:frontend
npx wrangler pages deploy dist/public --project-name saywetin-pages --branch main --commit-dirty=true
curl.exe -sS https://saywetin-pages.pages.dev/_saywetin/build-meta.json
```
**Gate**: deploy returns 200 + buildId visible in build-meta.json.

### Step 7 — Submit Play (3 min)
```pwsh
cd "C:/FTC HOLDING/APPS/saywetin-native"
eas submit --platform android --profile production `
  --path "android/app/build/outputs/bundle/release/app-release.aab" `
  --non-interactive --no-wait
```
**Use `--no-wait`** — without it output buffers indefinitely with `Select-Object`.

### Step 8 — Commit + push native (2 min)
```pwsh
cd "C:/FTC HOLDING"
git add APPS/saywetin-native/{App.tsx,app.json,eas.json,package*.json,metro.config.js,src/}
# .env is gitignored. android/ is gitignored at app level. Do not -f.
git commit -m "feat(saywetin-native): <slice> + vc<N>"
git pull --rebase origin main
git push origin main
```
If unrelated WIP exists in tree: `git stash push -m "wip" --include-untracked` first.

## Output / handoff artifact

Produce a short ship summary (no separate doc unless asked). Format:

```
SLICE: <name>
Backend:  <commit> @ Railway 200/200/200
Web:      <pages-url> buildId=<ts>
Native:   AAB vc<N> — EAS submission <id>, status=COMPLETED, queued for Play
Hermes:   bundle host hits: <N> (≥1 required)
Time:     <minutes>
```

## Failure modes (each one cost real time on Slice 2)

| Symptom | Root cause | Fix |
|---|---|---|
| `Unable to resolve module ./index.ts` | Metro auto-picked workspace root because `package.json` has `workspaces` field | metro.config.js + absolute `--entry-file` |
| AAB built, host string NOT in bundle | Gradle UP-TO-DATE used stale cached bundle from before `.env` was added | Always `--rerun-tasks` after env/config change |
| `disableHierarchicalLookup` set, build fails on `expo-asset` | `expo-asset` is hoisted under `expo/node_modules` (nested) | Remove the flag |
| `Expand-Archive: .apk is not supported` | PowerShell only accepts `.zip` | Use `[System.IO.Compression.ZipFile]::ExtractToDirectory` |
| `eas submit` hangs with no output | `Select-Object -Last N` buffers stream | Add `--no-wait`, drop `Select-Object` |
| `git pull --rebase` rejects | Unstaged WIP | `git stash push --include-untracked` first |
| `git push` rejected (non-FF) | Remote moved while building | `git pull --rebase` then push |

## Project constants
- EAS account: `official_fejiro`
- EAS project: `90cce2fa-dffb-4bd3-9899-ef92da34777f`
- Play service account: `play-store-deploy@saywetin-ba452.iam.gserviceaccount.com`
- Play key: `C:/FTC HOLDING/secrets/play-store-key.json`
- CF Pages: `saywetin-pages`
- CF account: `4c5c204659aebe5d95a99b55a5a7d0b4`
- Prod API host: `ftcpeacepad-extension-production.up.railway.app`

## Templates included

- [scripts/bootstrap.ps1](./scripts/bootstrap.ps1) — preflight: verify all preconditions, exit non-zero on any miss.
- [scripts/ship-slice.ps1](./scripts/ship-slice.ps1) — runs steps 4–7 with gates, prints the handoff artifact.
- [templates/SHIP_PROMPT.md](./templates/SHIP_PROMPT.md) — the prompt to give the agent next time.
- [templates/SLICE_REPORT.md](./templates/SLICE_REPORT.md) — output template (matches handoff artifact above).

## Time budget
- Total target: **60 min**
- Hard cap: **90 min**
- If exceeded, halt and write a postmortem under `/memories/repo/`.
