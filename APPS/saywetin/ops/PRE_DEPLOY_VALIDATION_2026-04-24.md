# SayWetin Pre-Deploy Validation — 2026-04-24

**Verdict:** GREEN — Phase 1 (backend Slice 2) shipped to prod and validated 6/6 on 2026-04-25.
**Native AAB:** NOT ready for Play submission (env not baked). Phase 2 still gated.

---

## Phase 1 Outcome — 2026-04-25

- Commits shipped: `3edbe52` (Slice 2 endpoint + ops docs), `17bb1ad` (regenerate `APPS/saywetin/package-lock.json`), `15c409b` (`APPS/saywetin/Dockerfile`: switch `npm ci` → `npm install` in build + runtime stages).
- Root cause of 7 prior failed Railway builds: package.json bumped on `6946684` (esbuild 0.28.x, postcss 8.5.10, lightningcss 1.32.0, rolldown 1.0.0-rc.17, picomatch 4.0.4, tinyglobby 0.2.16) without lockfile regen → `npm ci` rejected lockfile drift; additionally, container Node 22/npm 10 vs local Node 24/npm 11 produces a different platform-specific optional-deps tree even after regen, so `npm ci` is too strict.
- Fix: standalone lockfile regen via isolated temp dir (workspace hoisting otherwise rewrites root lock), then Dockerfile uses `npm install` to tolerate platform optional-deps divergence while still consuming the lockfile as input.
- Prod smoke (`https://ftcpeacepad-extension-production.up.railway.app/v1/slang/explain`):
  | Case | Expected | Got |
  |---|---|---|
  | happy: `shey you dey whine me` | 200 + full schema | 200 (literal/cultural/region/examples/related/confidence:0.78) |
  | happy: `how far na` | 200 | 200 |
  | happy: 240-char | 200 | 200 |
  | boundary: 1 char | 400 | 400 |
  | boundary: 241 char | 400 | 400 |
  | boundary: empty string | 400 | 400 |
  | boundary: missing field | 400 | 400 |

  **6/6 PASS in prod.**
- Phase 1 complete.

---

## What was validated locally tonight

### 1. Backend code review — Slice 2 endpoint `POST /v1/slang/explain`
- Source: `APPS/saywetin/server/routes.ts` lines 2305-2410.
- Input validation: phrase length 2-240, returns 400 with `errorCode` for boundary violations.
- AI gating: 503 with `AI_NOT_CONFIGURED` when `isAiConfigured()` is false.
- Model: `gpt-4o-mini`, temp 0.4, max_tokens 320, `response_format: json_object`.
- Output shape (verified): `{ phrase, literal, cultural, region, examples[], related[], confidence }`.
- Error path: 500 with `error` + `details` on OpenAI failure.

### 2. Local backend smoke (server on `:5179` against real OpenAI)
| Phrase | Status | Notes |
|---|---|---|
| `shey you dey whine me` | 200 | Correct decode, 3 related slang |
| `no wahala` | 200 | Correct, examples + related populated |
| `abeg comot for road` | 200 | Correct |
| `I dey kampe` | 200 | Correct |
| `wahala be like bicycle` | 200 | Correct, idiom understood |
| `""` (empty) | 400 | PHRASE_TOO_SHORT |
| `"a"` (1 char) | 400 | PHRASE_TOO_SHORT |
| `"x" * 300` | 400 | PHRASE_TOO_LONG |

5/5 happy-path pass. 3/3 boundary-case pass.

### 3. Backend `tsc --noEmit`
- Total errors: **16**.
- New errors from Slice 2: **0**.
- All 16 are pre-existing: 15 in `client/src/pages/recognized-track.tsx` (continuation typing, lines 831-1205), 1 in `server/routes.ts:677` (admin auth `string | undefined`).
- **Not regressions. Not blockers.**

### 4. Native `tsc --noEmit`
- Total errors: **0**. Clean.

### 5. Production smoke (Railway, current main)
- `https://ftcpeacepad-extension-production.up.railway.app/health` → 200.
- `POST /api/identify-by-text` (Slice 1) → returns valid SayWetin error envelope, endpoint live.
- `POST /v1/slang/explain` (Slice 2) → 404 generic. **Confirms Slice 2 not yet deployed.** Expected.

### 6. Local DB-dependent path
- `POST /api/identify-by-text` returns 500 locally (`getaddrinfo ENOTFOUND helium`). Local-only DB host issue. Prod uses Railway's `DATABASE_URL`, which is verified working via Slice 1 prod smoke.

---

## What is NOT yet validated

### A. Native AAB env baking
- `APPS/saywetin-native/src/api/slang.ts`, `listen.ts`, `live-lyrics.ts` all read `process.env.EXPO_PUBLIC_API_BASE_URL`. If undefined at bundle time → throws `EXPO_PUBLIC_API_BASE_URL is missing` at first call.
- No `.env` file at `APPS/saywetin-native/`. No fallback URL anywhere in `src/`.
- Current AAB at `android/app/build/outputs/bundle/release/app-release.aab` (47.9 MB, vc24) **has no API host baked**. Confirmed previously by scanning bundled JS for the host string (zero matches).
- **Impact:** sideloading or submitting this AAB to Play would ship a broken app.
- **Fix not yet applied** to keep this turn read-only per your "do not push live" rule.

### B. CI/auto-deploy wiring
- No GitHub Actions workflow targets SayWetin in `.github/workflows/`. Files present: `ci.yml`, `client-project-build-trigger.yml`, `og-trades-deploy.yml`, `peacepad-*.yml`, `unalabs-status-sync.yml`, `worker-build-validate.yml`.
- Auto-deploy is therefore **Railway's GitHub App watching `main`**, not GH Actions. Pushing to `main` will trigger a Docker build on Railway and replace the running container.

### C. Real-device smoke
- Not done. Requires sideloaded AAB with env baked first.

---

## Uncommitted state (relevant)

```
 M APPS/saywetin/server/routes.ts                    # Slice 2 endpoint
 M APPS/saywetin-native/app.json                     # 1.3.0
 M APPS/saywetin-native/android/app/build.gradle     # vc24
 M APPS/saywetin-native/eas.json
 M APPS/saywetin-native/src/screens/{Home,Listen,Result}Screen.tsx
?? APPS/saywetin-native/src/api/                     # slang.ts, listen.ts, live-lyrics.ts
?? APPS/saywetin-native/src/components/OrbListener.tsx, TapExplainSheet.tsx
?? APPS/saywetin-native/src/screens/LiveLyricsScreen.tsx, MeaningDetailScreen.tsx
?? APPS/saywetin/ops/                                # this report + status-summary
```

---

## Recommended ship sequence (only on your "go")

### Phase 1 — Backend ONLY (low risk, reversible via revert + Railway redeploy)
1. Stage and commit backend-only:
   - `APPS/saywetin/server/routes.ts`
   - `APPS/saywetin/ops/`
2. Commit message: `feat(saywetin): add /v1/slang/explain slang decoder endpoint`
3. Push to `main`.
4. Wait ~90s for Railway deploy.
5. Smoke prod: `POST https://ftcpeacepad-extension-production.up.railway.app/v1/slang/explain` with same 5 phrases. Expect 200 + valid JSON.
6. If green → Phase 1 done. If red → revert commit, push.

### Phase 2 — Native AAB (gated, do NOT auto-trigger)
Requires explicit go. Steps:
1. Create `APPS/saywetin-native/.env` with `EXPO_PUBLIC_API_BASE_URL=https://ftcpeacepad-extension-production.up.railway.app`.
2. Bump `versionCode` 24→25 in `android/app/build.gradle` (24 was burned on the broken AAB).
3. `cd APPS/saywetin-native/android && ./gradlew bundleRelease`.
4. Scan `android/app/build/intermediates/.../index.android.bundle` for host string — must match.
5. Sideload to your device. Smoke: slang chip on Home → result sheet, lyric paste → fallback, listen ritual → match badge.
6. Only then commit native files + (optionally) submit to internal track.

---

## Hard gates still in force
- No push to main without your "go".
- No Play Console submission without your "go".
- Backend and native commits scoped separately.

---

**Author:** automated QA pass.
**Local fix applied this turn:** none. All changes are pre-existing from earlier session.
**Next decision:** approve Phase 1 backend push? (Y/N)
