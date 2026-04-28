# Secrets And Skills Inventory

Last updated: 2026-04-28

This inventory exists so developers know what to provision and where to look. It intentionally does not store raw secret values.

## Handling Rule

- Commit secret names, setup steps, and non-sensitive paths.
- Do not commit raw `.env` files, keystore blobs, service-account JSON, API keys, refresh tokens, or copied credential values.
- If a credential value appears in a handover, move the value to the correct secret manager and keep only the secret name in docs.

## SayWetin Native Secrets

| Name or file | Used by | Required location | Git status |
| --- | --- | --- | --- |
| `ELEVENLABS_API_KEY` | ContentOps voice rendering and voice cloning | User env, GitHub Actions secret if CI runs ContentOps | Not committed. |
| `OPENAI_API_KEY` | Backend AI recognition and some ContentOps translation checks | Railway backend env and local env when needed | Not committed. |
| `SAYWETIN_KEYSTORE_PATH` | Local Android release signing | User env or local Gradle property | Not committed. |
| `SAYWETIN_KEYSTORE_BASE64` | GitHub Actions Android release | GitHub Actions secret | Not committed. |
| `SAYWETIN_KEYSTORE_PASSWORD` | Android release signing | GitHub Actions secret or local env | Not committed. |
| `SAYWETIN_KEY_ALIAS` | Android release signing | GitHub Actions secret or local env | Not committed. |
| `SAYWETIN_KEY_PASSWORD` | Android release signing | GitHub Actions secret or local env | Not committed. |
| `PLAY_STORE_JSON_KEY` | Play Store upload workflow | GitHub Actions secret, raw JSON value in Actions only | Not committed. |
| `TIKTOK_ACCESS_TOKEN` | Optional live social publishing | GitHub Actions secret or local env | Not committed. |
| `IG_ACCESS_TOKEN` | Optional Instagram publishing | GitHub Actions secret or local env | Not committed. |
| `IG_USER_ID` | Optional Instagram publishing | GitHub Actions secret or local env | Not committed. |
| `X_BEARER_TOKEN` | Optional X publishing | GitHub Actions secret or local env | Not committed. |
| `LINKEDIN_ACCESS_TOKEN` | Optional LinkedIn publishing | GitHub Actions secret or local env | Not committed. |
| `LINKEDIN_AUTHOR_URN` | Optional LinkedIn publishing | GitHub Actions secret or local env | Not committed. |
| `APPS/saywetin-native/.env` | Local SayWetin native dev | Local only | Excluded. |
| `APPS/saywetin-native/android/local.properties` | Android SDK path | Local only | Excluded. |
| `APPS/saywetin-native/android/keystore-base64.txt` | Local helper output for GitHub secret provisioning | Local only | Excluded. |
| `APPS/saywetin-native/android/app/debug.keystore` | Local debug build signing | Local only | Excluded. |

## SayWetin Extension Secrets

| Name | Used by | Required location | Git status |
| --- | --- | --- | --- |
| `CHROME_EXTENSION_ID` | Chrome Web Store publish workflow | GitHub Actions secret | Not committed. |
| `CHROME_CLIENT_ID` | Chrome Web Store publish workflow | GitHub Actions secret | Not committed. |
| `CHROME_CLIENT_SECRET` | Chrome Web Store publish workflow | GitHub Actions secret | Not committed. |
| `CHROME_REFRESH_TOKEN` | Chrome Web Store publish workflow | GitHub Actions secret | Not committed. |

Note: workflows copied under `APPS/saywetin-extension/.github/workflows` are app-local recovered files. GitHub only runs workflows under the repo-root `.github/workflows` directory.

## Existing Sensitive Assets To Review

These existed in the restored repo before the current import and should be reviewed separately:

| Path | Status | Recommended action |
| --- | --- | --- |
| `APPS/dispatch/android/peacepad-release.keystore` | Tracked file | Confirm whether this is real signing material. If real, rotate or move to secret storage. |
| `APPS/dispatch/android/keystore.properties` | Tracked file | Confirm whether it contains real signing values. If real, rotate or replace with template. |
| `APPS/peacepad/encode-keystore.sh` | Tracked helper script | Safe if it contains no raw values. |
| `APPS/saywetin/android/keystore.properties.template` | Tracked template | Safe if placeholder-only. |
| `.env.example` files | Tracked templates | Safe if placeholder-only. |

## Recovered Skills

Recovered repo skills live at:

```text
C:\FTC HOLDING\_restore_repo\.agents\skills
```

The lock file is:

```text
C:\FTC HOLDING\_restore_repo\skills-lock.json
```

Tracked recovered skills:

| Skill | Source | Purpose |
| --- | --- | --- |
| `stripe-best-practices` | `docs.stripe.com` | Stripe billing, Connect, payments, security, and treasury guidance. |
| `stripe-projects` | `docs.stripe.com` | Stripe project-oriented workflow guidance. |
| `upgrade-stripe` | `docs.stripe.com` | Stripe upgrade guidance. |

If a fresh clone is missing local agent behavior, verify that `.agents/skills` and `skills-lock.json` are present before reinstalling anything.
