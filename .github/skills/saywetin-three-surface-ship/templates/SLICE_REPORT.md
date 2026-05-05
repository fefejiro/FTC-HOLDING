# Slice Report — `<SLICE_NAME>`

**Date:** `<YYYY-MM-DD>`
**versionCode:** `<N>` → `<N+1>` (`<versionName>`)
**Elapsed:** `<minutes>` min (target ≤60, cap 90)

## Backend (Railway)
- Commits: `<sha1> <sha2>`
- Smoke: `POST /v1/<route>` → `<status_codes>`
- URL: https://ftcpeacepad-extension-production.up.railway.app

## Web (Cloudflare Pages — saywetin-pages)
- Build: vite, `<seconds>`, buildId `<ts-...>`
- Deploy URL: `<https://<hash>.saywetin-pages.pages.dev>`
- Alias: https://saywetin-pages.pages.dev (200 verified)
- build-meta.json verified: `webBuildId=<ts>`, `deployedAt=<iso>`

## Native (Google Play — production track)
- AAB: `<MB>` MB, signed, vc`<N>`
- APK (sideload): `<MB>` MB
- Hermes bundle host hits: `<N>` (≥1 required)
- EAS submission ID: `<uuid>`
- EAS submission URL: https://expo.dev/accounts/official_fejiro/projects/saywetin-native/submissions/`<uuid>`
- Status at submit: `COMPLETED` (upload), queued for Play review

## Repo state
- Native commit: `<sha>` on `origin/main`
- Stashes (unrelated WIP): `<list or "none">`

## Sideload command (for tonight's smoke)
```pwsh
adb install -r "C:/FTC HOLDING/APPS/saywetin-native/android/app/build/outputs/apk/release/app-release.apk"
```

## Smoke checklist
- [ ] App launches on real device
- [ ] `<feature-1>` works against prod
- [ ] `<feature-2>` works against prod
- [ ] No crashes in `adb logcat | grep -i saywetin`

## Anomalies / time-eaters
- `<list any deviation from the playbook so the next slice is faster>`

## Next watch
- Play review window: 1–7 days. Check console at `<date>+24h`.
