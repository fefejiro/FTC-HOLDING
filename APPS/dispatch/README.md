# Dispatch

Dispatch is the Ottawa roadside assistance app and API in this repo.

## Live

- Public URL: `https://dispatch.unalabs.cloud`
- Private admin URL: `https://dispatch-admin.unalabs.cloud/admin`
- Public health: `https://dispatch.unalabs.cloud/health`
- Railway fallback: `https://dispatch-api-production.up.railway.app`
- Railway health: `https://dispatch-api-production.up.railway.app/health`

## Product flow

- `/` is the public Dispatch front door
- `/request` is the stranded-driver intake form
- `/operator` is the operator console
- `/admin` is the admin dashboard

## Live product flow

- Official entrypoint: `https://unalabs.cloud/products/dispatch`
- Customer request form: `https://dispatch.unalabs.cloud/request`
- Operator workspace: `https://dispatch.unalabs.cloud/operator`
- Admin remains private on `https://dispatch-admin.unalabs.cloud/admin`

Dispatch is live-only. The product does not support alternate request/session modes.

## Production data hygiene

- Dispatch production should contain only real Ottawa roadside operations data.
- QA, seeded, or sample jobs must be removed from production storage after verification.
- As of 2026-04-02, the older demo-tagged request and known QA/sample jobs used during rollout verification were removed from production.

## Remote admin security

- `dispatch.unalabs.cloud` stays public and does not expose remote admin access
- `dispatch-admin.unalabs.cloud` is the private admin host
- the admin worker keeps the upstream proxy key server-side
- successful admin PIN login creates a secure HTTP-only session cookie
- refresh and new-tab admin access stay on the private host without exposing the proxy key to the browser

## Incident sources

Dispatch currently watches three official no-key incident sources for Ottawa-area activity:

- Ontario 511 events feed
- City of Ottawa traffic events feed
- OC Transpo service alerts feed

The live operator feed checks these sources about every 60 seconds and keeps the road-alert list warm even when the operator is viewing jobs.

## Local

```powershell
npm install --workspaces=false
npm run build:prod
npm run dev
```

Required environment variables are shown in [`.env.example`](/c:/FTC%20HOLDING/APPS/dispatch/.env.example).

For production hardening, set `DISPATCH_OPERATOR_SESSION_SECRET` so operator sessions can authenticate request access, SSE, push subscription, and field updates without exposing admin credentials.

## Mobile road-alert smoke test

Use the focused mobile smoke test when changing operator tab logic or Road Alerts rendering:

```powershell
cd "C:\FTC HOLDING\APPS\dispatch"
npm run test:e2e:road-alerts
```

Defaults:

- Base URL: `https://dispatch.unalabs.cloud`
- Operator name: `Ottawa Operator`
- Operator PIN: `9090`

Override them with `DISPATCH_PLAYWRIGHT_BASE_URL`, `DISPATCH_TEST_OPERATOR_NAME`, or `DISPATCH_TEST_OPERATOR_PIN` if needed.

## Desktop troubleshooting workflow

Use the web app directly while debugging product behavior before shipping mobile updates:

```powershell
cd "C:\FTC HOLDING\APPS\dispatch"
npm run desktop:dev
```

Then open `http://localhost:8080` in desktop browser and troubleshoot there first.

## Capacitor update workflow (next releases)

Dispatch is configured so Capacitor production builds point to:

- `https://dispatch.unalabs.cloud`

That means:

- web/content fixes can be deployed server-side and reflected in the app webview
- native/plugin/icon/manifest changes still require a new Play Store build

### One-command Android AAB build

```powershell
cd "C:\FTC HOLDING\APPS\dispatch"
npm run cap:bundle:release
```

This command now does all required steps:

1. Builds web assets
2. Syncs Capacitor Android (`CAPACITOR_ENV=production`)
3. Ensures `android/local.properties` has SDK path when available
4. Runs Gradle `bundleRelease`
5. Prints final AAB path

Expected output file:

- `C:\FTC HOLDING\APPS\dispatch\android\app\build\outputs\bundle\release\app-release.aab`

### Useful helper commands

```powershell
# Sync Android with local dev server target (for native debugging)
npm run cap:sync:dev

# Sync Android with production target (default release behavior)
npm run cap:sync:prod

# Open Android Studio project
npm run cap:open
```

## Railway deploy

This app lives inside a monorepo, and the Railway service is already linked to `APPS/dispatch` as its root directory.

```powershell
cd "C:\FTC HOLDING\APPS\dispatch"
git push origin main
```

Why this matters:

- the linked Railway service already knows its root directory and config file
- manual `railway up . --path-as-root --detach` duplicates that root and can fail with `Could not find root directory: APPS/dispatch`
- the correct deploy path uses the `Dockerfile` and `railway.json` in this folder
- the app-root `Dockerfile` is the only valid Railway Docker path for Dispatch

## Production notes

- Docker build uses [Dockerfile](/c:/FTC%20HOLDING/APPS/dispatch/Dockerfile)
- Railway config lives in [railway.json](/c:/FTC%20HOLDING/APPS/dispatch/railway.json)
- build context is trimmed by [`.dockerignore`](/c:/FTC%20HOLDING/APPS/dispatch/.dockerignore)
- the app expects `PORT=8080` in production
- the branded public hostname is fronted by the Cloudflare Worker in [workers/dispatch-edge/src/index.ts](/c:/FTC%20HOLDING/workers/dispatch-edge/src/index.ts)
- Railway should keep only the fallback origin (`dispatch-api-production.up.railway.app`); public branded hosts stay at Cloudflare
- if Railway build health regresses, verify app-root installs with `npm ci --workspaces=false`

## Verified on March 28, 2026

- Railway service: `dispatch-api`
- Project: `enchanting-caring`
- Deploy status: `SUCCESS`
- Public `/health` returned `200` with `{"status":"ok"}`
- Live request creation worked on the live host
- Operator sign-in worked on the live host
- Una Labs product page at `/products/dispatch` linked into the live Dispatch path
