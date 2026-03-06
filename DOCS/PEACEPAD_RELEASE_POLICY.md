# PeacePad Release Policy

## Hosting Ownership

- Source of truth: GitHub `main`
- Frontend (web): Cloudflare Pages -> `https://peacepad.ca`
- Backend (API): Railway -> `https://api.peacepad.ca`
- Android Play Store: separate release workflow (Capacitor wrapper)

## When Web Deploy Is Enough

Use web/backend deploy only (no Play Store upload) for:
- UI/content/logic changes in web routes
- API behavior changes on Railway
- Feature flags, copy, validation, fallback logic

Deploy path:
- `main` -> Cloudflare Pages (frontend bundle)
- `main` -> Railway (API service)

## When Play Store Update Is Required

A new AAB is required only for native-shell changes, including:
- `android/` Gradle, manifest, plugin, signing, or permission changes
- Capacitor native plugin/runtime changes that require reinstall
- App icon/splash/package/signature changes
- Native deep-link/app-link behavior changes

## Web Fix Checklist

1. Deploy Cloudflare Pages from `main`.
2. Deploy Railway API from `main`.
3. Verify:
   - `https://peacepad.ca/onboarding` -> `200` HTML (Cloudflare)
   - `https://api.peacepad.ca/api/health` -> `200` JSON (Railway)
4. Run:
   - `npm run verify:peacepad:prod`
   - `npm --prefix APPS/peacepad run smoke:guest-auth`

## Native Release Checklist

1. Bump Android `versionCode`/`versionName`.
2. Build signed AAB (`bundleRelease`).
3. Upload to Play Console internal testing first.
4. Validate on-device native flows, then staged production rollout.
