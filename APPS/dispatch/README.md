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

## Client demo flow

- Official entrypoint: `https://unalabs.cloud/products/dispatch`
- Demo request form: `https://dispatch.unalabs.cloud/request?mode=demo`
- Demo operator surface: `https://dispatch.unalabs.cloud/operator?mode=demo&demoSession=<id>`
- Admin remains private on `https://dispatch-admin.unalabs.cloud/admin`

Demo requests are tagged with a session marker so invited operators can work a client-safe queue without mixing with unrelated live jobs. The real incident-watch feed stays visible during the demo so the system still feels live.

Credentials for invited demo operators and private admin access are managed outside the repo and should be shared manually, not committed into documentation.

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

## Railway deploy

This app lives inside a monorepo, so Railway must deploy `APPS/dispatch` as the archive root.

```powershell
cd "C:\FTC HOLDING\APPS\dispatch"
railway up . --path-as-root --detach
```

Why this matters:

- without `--path-as-root`, Railway builds from the monorepo root
- that causes Railpack to miss the local `Dockerfile`
- the correct deploy path uses the `Dockerfile` and `railway.json` in this folder

## Production notes

- Docker build uses [Dockerfile](/c:/FTC%20HOLDING/APPS/dispatch/Dockerfile)
- Railway config lives in [railway.json](/c:/FTC%20HOLDING/APPS/dispatch/railway.json)
- build context is trimmed by [`.dockerignore`](/c:/FTC%20HOLDING/APPS/dispatch/.dockerignore)
- the app expects `PORT=8080` in production
- the branded public hostname is fronted by the Cloudflare Worker in [workers/dispatch-edge/src/index.ts](/c:/FTC%20HOLDING/workers/dispatch-edge/src/index.ts)

## Verified on March 28, 2026

- Railway service: `dispatch-api`
- Project: `enchanting-caring`
- Deploy status: `SUCCESS`
- Public `/health` returned `200` with `{"status":"ok"}`
- Demo request creation worked on the live host
- Demo operator sign-in worked on the live host
- Una Labs product page at `/products/dispatch` showed the demo-first client path
