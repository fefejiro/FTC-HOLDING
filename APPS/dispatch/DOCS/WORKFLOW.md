# Dispatch - Workflow

## Local Dev

```powershell
cd "C:\FTC HOLDING\APPS\dispatch"
npm install --workspaces=false
npm run build:prod
npm run dev
```

Open http://localhost:8080 for desktop debugging before shipping mobile updates.

## Run E2E Smoke Tests (Against Production)

```powershell
cd "C:\FTC HOLDING\APPS\dispatch"
npm run test:e2e:road-alerts
```

Defaults:
- Base URL: https://dispatch.unalabs.cloud
- Operator name: Ottawa Operator
- Operator PIN: 9090

Override with env vars: DISPATCH_PLAYWRIGHT_BASE_URL, DISPATCH_TEST_OPERATOR_NAME, DISPATCH_TEST_OPERATOR_PIN

## Deploy

Push to main branch. Railway auto-deploys the backend. Cloudflare Pages auto-deploys the frontend.

## Android Build (Play Store)

```powershell
cd "C:\FTC HOLDING\APPS\dispatch"
npm run cap:bundle:release
```

This builds web assets, syncs Capacitor, and outputs the signed AAB.

## Health Check URLs

- Production API: https://dispatch.unalabs.cloud/health
- Railway direct: https://dispatch-api-production.up.railway.app/health

## Railway Backend

- Plan: Hobby ($5 USD/month)
- Does NOT auto-pause (unlike ATEAM). Must stay live for operator real-time flow.
- Cold start can cause 502 on first request — mitigate with keepalive ping.
