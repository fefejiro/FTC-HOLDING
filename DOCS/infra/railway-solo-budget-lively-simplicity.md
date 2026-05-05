# Railway Solo Budget Notes: lively-simplicity

Last updated: 2026-04-07

This note captures the lean-budget Railway setup for the `lively-simplicity` project under the new `Peace Pad` account.

## Project context

- Railway project: `lively-simplicity`
- Environment: `production`
- Account style: free / solo-funded
- Priority: keep only the smallest useful runtime surface active

## What was configured

### PeacePad

Service:
- `@ftc/peacepad`

Work completed:
- linked the local workspace to `lively-simplicity / production`
- imported the available PeacePad app secrets from local machine env files into Railway
- replaced the obvious local placeholder database value with the shared Supabase pooler URI found in local Dispatch config
- generated a fresh `SESSION_SECRET` instead of keeping the local dev placeholder
- added the missing production-shaped API settings:
  - `NODE_ENV=production`
  - `DEPLOY_ROLE=api`
  - `PUBLIC_BASE_URL=https://api.peacepad.ca`
  - `APP_ORIGINS=https://peacepad.ca,https://www.peacepad.ca`
  - `CORS_ALLOWED_ORIGINS=https://peacepad.ca,https://www.peacepad.ca,http://localhost,http://127.0.0.1,http://localhost:5173,http://127.0.0.1:5173`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `OPENAI_BASE_URL=https://api.openai.com/v1`
- triggered a controlled redeploy instead of repeated per-variable deploy churn

Imported feature secrets:
- `DATABASE_URL`
- `SESSION_SECRET`
- `OPENAI_API_KEY`
- `MAILJET_API_KEY`
- `MAILJET_SECRET_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Notes:
- Railway logs confirmed PeacePad can get past the missing-config crash once the required envs are present.
- VAPID formatting was corrected and now initializes successfully.
- The real Firebase Admin SDK JSON was imported into Railway on 2026-04-07.
- A small runtime hardening patch was added in [push-notifications.ts](/C:/FTC%20HOLDING/APPS/peacepad/server/push-notifications.ts) to normalize escaped `\\n` sequences inside `private_key`, which is common for env-backed Railway secrets.
- Railway logs now confirm `Firebase Admin SDK initialized successfully`.
- The Railway service boots successfully.
- As of 2026-04-07, the generated Railway domain `https://ftcpeacepad-production.up.railway.app` returns `200` for both `/health` and `/api/health`.
- As of 2026-04-07, the branded API domain `https://api.peacepad.ca` is also live and returns `200` for both `/health` and `/api/health`.
- The custom domain `api.peacepad.ca` is now attached directly to `@ftc/peacepad` in Railway.
- If the service ever falls back into a config crash again, inspect only the required vars listed in:
  - [RAILWAY_SETUP.md](/C:/FTC%20HOLDING/DOCS/RAILWAY_SETUP.md)
  - [PEACEPAD_RAILWAY_API_SETUP.md](/C:/FTC%20HOLDING/DOCS/PEACEPAD_RAILWAY_API_SETUP.md)

### ATEAM

Service:
- `ateam-platform`

Current posture:
- builds and runs
- should stay lightweight
- do not add extra provider features unless they are actively needed

Budget note:
- keep this only if the shared ATEAM Railway backend is actually being used
- otherwise pause or remove it and rely on the current Cloudflare / demo path

## What should not stay on Railway on a free account

### ftc-site

Service:
- `@ftc/ftc-site`

Rule:
- do not keep `ftc-site` on Railway as an active target
- `ftc-site` belongs on Cloudflare Pages only

Why:
- it burns build minutes without adding value
- it duplicates a platform that is already working better elsewhere

### PeacePad extension

Service:
- `@ftc/peacepad-extension`

Rule:
- remove or archive this from Railway

Why:
- it is not a long-running server workload
- failed builds here are pure free-credit waste

### Dispatch

Service:
- `@ftc/dispatch`

Current issue:
- build failure is due to the service being wired with the wrong deploy shape for Railway
- the repo expects the app root to be `APPS/dispatch`

Rule:
- do not keep Dispatch active on a solo free account unless it is immediately needed
- if it is needed later, fix the Railway root directory first, then redeploy from the app root only

## Keep / pause / remove guide

Keep:
- `@ftc/peacepad`
- `ateam-platform` only if actively needed

Pause or remove:
- `@ftc/dispatch`
- `@ftc/peacepad-extension`
- `@ftc/ftc-site`

## Free-credit protection rules

1. Do not let every repo app auto-build on every push.
2. Keep only one always-on API if possible.
3. Do not use Railway for `ftc-site`.
4. Avoid adding Railway databases unless an external DB is not available.
5. Set variables with `--skip-deploys`, then redeploy once.
6. Leave heavy optional features off unless they are being tested on purpose.
7. If a service is failing and not needed this week, pause or remove it instead of troubleshooting it in production.

## Manual dashboard cleanup still recommended

CLI work got the project linked and PeacePad configured, but the following still should be cleaned in Railway UI to stop wasting credits:

- remove or pause `@ftc/peacepad-extension`
- remove or pause `@ftc/dispatch`
- remove or archive `@ftc/ftc-site`
- `@ftc/ftc-site` already had its active deployment removed with `railway down`, so it is no longer consuming runtime even though the service object still exists.

## Weekly low-cost checks

Run these once a week, not constantly:

1. Railway service status
   - confirm only the intended services are active
   - if `dispatch`, `peacepad-extension`, or `ftc-site` are still present, pause or remove them
   - `@ftc/ftc-site` now has no active deployment; leave it that way or remove the service entirely

2. PeacePad runtime health
   - check Railway service status for `@ftc/peacepad`
   - the current live endpoints should both return `200`:
     - `https://api.peacepad.ca/health`
     - `https://api.peacepad.ca/api/health`
   - the current good Railway fallback domain is `ftcpeacepad-production.up.railway.app`

3. Credit protection
   - avoid unnecessary pushes to this GitHub-connected Railway project
   - batch env-var changes with `--skip-deploys`, then do one redeploy
   - do not keep failed, unused services rebuilding in the background

4. Firebase reality check
   - Firebase Admin service-account JSON is now present in Railway and logs show successful initialization
   - `google-services.json` is still not enough on its own for admin push if this is ever reconfigured from scratch

## Root path rule

Every Railway service in this monorepo must deploy from its app root, not monorepo root:

- `APPS/peacepad`
- `APPS/ATEAM`
- `APPS/dispatch`
- `APPS/saywetin`

If Railway is pointed at repo root, builds will be noisy, expensive, or wrong.
