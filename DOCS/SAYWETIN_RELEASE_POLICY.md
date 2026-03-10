# SayWetin Release Policy

## Hosting Ownership

- Source of truth: GitHub `main`
- Frontend runtime: Cloudflare Pages on `https://saywetin.app`
- API runtime: Railway service `sunny-acceptance` on `https://api.saywetin.app`
- Android Play Store: separate release workflow (Capacitor wrapper)

## Web/API Deploy Ownership (PeacePad-Style)

Deploy Railway only for:
- Listen pipeline logic (`/api/listen`)
- Lyrics/cultural analysis logic
- API behavior changes
- Backend environment/config changes

Deploy path (API):
- `main` -> Railway (Dockerfile, root `APPS/saywetin`)

Deploy Cloudflare Pages for:
- Frontend UI/content changes
- Frontend asset/hash updates
- Client-side routing/static changes

Deploy path (frontend):
- `main` -> Cloudflare Pages (`APPS/saywetin` -> `dist/public`)

## When Play Store Update Is Required

A new AAB is required only for native-shell changes, including:
- `APPS/saywetin/android/` Gradle, manifest, plugin, permission, signing changes
- Capacitor native runtime/plugin changes
- App icon/splash/package/signature changes
- Native deep-link/app-link behavior changes

## Listen Pipeline Web Release Checklist

1. Deploy Railway from `main` (API).
2. Deploy Cloudflare Pages from `main` (frontend).
3. Verify:
   - `https://api.saywetin.app/health` -> `200` JSON
   - `https://api.saywetin.app/api/status` -> `200` JSON
   - `https://www.saywetin.app/` redirects to `https://saywetin.app/`
4. Confirm `/api/status` flags:
   - `acrcloud.configured=true`
   - `openai.configured=true`
5. Manual listen smoke (browser/mobile web):
   - Record/upload sample audio.
   - Confirm response includes recognized track or a structured recognition error.
   - Confirm lyrics/cultural sections return data for recognized tracks.
6. Run verifier:
   - `powershell -ExecutionPolicy Bypass -File scripts/verify-saywetin-prod.ps1`

## Temporary Fallback (If API Domain Is Blocked)

If Railway custom-domain limits block `api.saywetin.app`, keep service healthy on Railway and temporarily use:
- `DEPLOY_ROLE=fullstack`
- `PUBLIC_BASE_URL=https://saywetin.app`
- `VITE_API_BASE_URL=https://saywetin.app`

Revert to `https://api.saywetin.app` once API domain/DNS is healthy.

## Native Release Checklist

1. Bump Android `versionCode` and `versionName`.
2. Build signed release AAB (`bundleRelease`).
3. Upload AAB to Play Console Internal testing first.
4. Validate on-device:
   - App opens from launcher
   - Record audio works
   - `/api/listen` roundtrip works against production host
5. Promote only after validation.
