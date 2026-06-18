# PeacePad Production Routing Recovery - 2026-06-17

## Current Routing

- Frontend: Cloudflare Pages at `https://peacepad.ca`
- Backend: Railway service `@ftc/peacepad`
- API domain: `https://api.peacepad.ca`
- Railway target: `qzw9nso8.up.railway.app`
- Railway project: `splendid-spirit`
- Railway environment: `production`
- Railway project ID: `e9cee72a-a4b0-470c-8280-b51ff62ec4e0`
- Railway service ID: `df4a35e3-b3de-4aa4-9cf0-5e0d9af206bc`

Do not relink `APPS/peacepad` to the old paused Railway project. That path caused `api.peacepad.ca` to return Railway `404` and made guest auth/session restore look broken.

## Verified Recovery

Latest verified Railway deployment during recovery:

- Deployment ID: `ffb3ee61-7b67-4c3d-b930-47653794d63b`
- Status: `SUCCESS`

Commands used:

```powershell
npm --prefix APPS/peacepad run verify:deployment-ownership
$env:SMOKE_API_BASE_URL='https://api.peacepad.ca'; npm --prefix APPS/peacepad run smoke:guest-auth
Invoke-RestMethod https://api.peacepad.ca/api/health
```

## Android Delivery

Production Android loads the hosted web app from `https://peacepad.ca` through `capacitor.config.ts`. Normal web frontend updates deployed to Cloudflare Pages and API updates deployed to Railway are visible in Android without a Play Store rebuild.

Rebuild Android only for native shell changes such as Capacitor config, permissions, icons, splash screen, native plugins, or bundled offline assets.

## Human Workflow Gate

Run the current PeacePad workflow proof before marking guest-first behavior green:

```powershell
npm --prefix APPS/peacepad run test:e2e:human-workflow
```

The suite covers solo guest drafting, tone-preview outage recovery, copy-to-send, invite link/code visibility, second-guest partner join, invalid/self-code failure, and direct join-link handoff through onboarding.
