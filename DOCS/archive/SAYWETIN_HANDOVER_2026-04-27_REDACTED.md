# SayWetin QA, ContentOps, And Play Store Handover

Source handover date: 2026-04-27
Redacted consolidation date: 2026-04-28

This is the safe repo copy of the loose handover at `C:\FTC HOLDING\DOCS\SAYWETIN_HANDOVER_2026-04-27.md`. Raw credential values and secret-like values are intentionally omitted.

## What Was Recovered

- QA matrix for SayWetin native at `APPS/saywetin-native/qa`.
- ContentOps pipeline at `APPS/saywetin-native/contentops`.
- Android release/signing automation under `APPS/saywetin-native/android` and `APPS/saywetin-native/ops`.
- GitHub workflow drafts in root `.github/workflows` for SayWetin QA, dispatch-from-issue, and Android release.
- Backend security header patch in `APPS/saywetin/server/index.ts`.

## Automation Surfaces

| System | Path | Trigger | Output |
| --- | --- | --- | --- |
| QA matrix | `APPS/saywetin-native/qa/run-all.mjs` | Local command or GitHub Actions | `qa/_report` generated locally, ignored by git. |
| ContentOps | `APPS/saywetin-native/contentops/pipeline/full-run.mjs` | Manual or scheduled workflow when enabled | Generated voice/video assets, ignored by git. |
| Android release | `APPS/saywetin-native/android` and `ops/bump-version-code.mjs` | Manual workflow or local Gradle build | Signed AAB when signing secrets are present. |

## Required Human Setup

1. Rotate and provision `ELEVENLABS_API_KEY`.
2. Provision SayWetin release keystore secrets in GitHub Actions.
3. Create or verify the Google Play service account for package `com.saywetin.app`.
4. Store `PLAY_STORE_JSON_KEY` as a GitHub Actions secret.
5. Keep the first Play Store AAB upload manual if Google requires it.
6. Add `API_BASE_URL` and any QA variables as GitHub Actions variables.
7. Deploy the backend security headers patch before enforcing the strict security header gate.
8. Set `OPENAI_API_KEY` on the backend to turn AI-gated QA skips into real passes.
9. Record real voice samples and upload them through `contentops/voice/clone-upload.mjs` when ready.

Secret names and locations are tracked in `DOCS/SECRET_AND_SKILLS_INVENTORY_2026-04-28.md`.

## Local Verification

Run from `C:\FTC HOLDING\_restore_repo`:

```powershell
npm --prefix APPS/saywetin-native/qa install
npm --prefix APPS/saywetin-native/qa run qa:all
npm --prefix APPS/saywetin-native/contentops install
npm --prefix APPS/saywetin-native/contentops run pipeline:full -- --dry-run
npm --prefix APPS/saywetin-native run android:readiness
```

## Known Limits

- Live social publishing adapters are intentionally gated until platform tokens and final API implementations are confirmed.
- Generated video/audio/report artifacts are ignored and should be regenerated locally or in CI.
- Release signing falls back to debug signing unless release keystore env vars are present.
- Voice cloning requires real voice samples in `contentops/voice/samples`, which are ignored except for the README.
