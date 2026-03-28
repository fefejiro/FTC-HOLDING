# Dispatch

Dispatch is the Ottawa roadside assistance app and API in this repo.

## Live

- Public URL: `https://dispatch.unalabs.cloud`
- Public health: `https://dispatch.unalabs.cloud/health`
- Railway fallback: `https://dispatch-api-production.up.railway.app`
- Railway health: `https://dispatch-api-production.up.railway.app/health`

## Product flow

- `/` is the public Dispatch front door
- `/request` is the stranded-driver intake form
- `/operator` is the operator console

## Incident sources

Dispatch currently watches two official no-key incident sources for Ottawa-area activity:

- Ontario 511 events feed
- City of Ottawa traffic events feed

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

## Verified on March 27, 2026

- Railway service: `dispatch-api`
- Project: `enchanting-caring`
- Deploy status: `SUCCESS`
- Public `/health` returned `200` with `{"status":"ok"}`
