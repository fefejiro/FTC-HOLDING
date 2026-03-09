# SayWetin Release Policy

## Hosting Ownership

- Source of truth: GitHub `main`
- Web + API runtime: Railway service `sunny-acceptance` on `https://saywetin.app`
- Android Play Store: separate release workflow (Capacitor wrapper)

## When Railway Deploy Is Enough

Use normal deploy only (no Play Store upload) for:
- Listen pipeline logic (`/api/listen`)
- Lyrics/cultural analysis logic
- API behavior changes
- Frontend UI/content changes
- Environment/config changes

Deploy path:
- `main` -> Railway (Dockerfile, root `APPS/saywetin`)

## When Play Store Update Is Required

A new AAB is required only for native-shell changes, including:
- `APPS/saywetin/android/` Gradle, manifest, plugin, permission, signing changes
- Capacitor native runtime/plugin changes
- App icon/splash/package/signature changes
- Native deep-link/app-link behavior changes

## Listen Pipeline Web Release Checklist

1. Deploy Railway from `main`.
2. Verify:
   - `https://saywetin.app/health` -> `200` JSON
   - `https://saywetin.app/api/status` -> `200` JSON
3. Confirm `/api/status` flags:
   - `acrcloud.configured=true`
   - `openai.configured=true`
4. Manual listen smoke (browser/mobile web):
   - Record/upload sample audio.
   - Confirm response includes recognized track or a structured recognition error.
   - Confirm lyrics/cultural sections return data for recognized tracks.
5. Run verifier:
   - `powershell -ExecutionPolicy Bypass -File scripts/verify-saywetin-prod.ps1`

## Native Release Checklist

1. Bump Android `versionCode` and `versionName`.
2. Build signed release AAB (`bundleRelease`).
3. Upload AAB to Play Console Internal testing first.
4. Validate on-device:
   - App opens from launcher
   - Record audio works
   - `/api/listen` roundtrip works against production host
5. Promote only after validation.
