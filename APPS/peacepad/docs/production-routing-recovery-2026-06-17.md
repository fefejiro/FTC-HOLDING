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

Latest verified Railway deployment after closure:

- Deployment ID: `34f1b980-0e91-41ed-81b1-5f79d56a7f66`
- Commit: `0bc84c88c5d94cf0215abd760d5362d5baca0369`
- Message: `Verify PeacePad mobile dialog opening`
- Status: `SUCCESS`

Commands used:

```powershell
npm --prefix APPS/peacepad run verify:deployment-ownership
$env:SMOKE_API_BASE_URL='https://api.peacepad.ca'; npm --prefix APPS/peacepad run smoke:guest-auth
Invoke-RestMethod https://api.peacepad.ca/api/health
```

Closure verification:

```powershell
npm --prefix APPS/peacepad run check
npm --prefix APPS/peacepad run build
$env:SMOKE_API_BASE_URL='https://api.peacepad.ca'; npm --prefix APPS/peacepad run smoke:guest-auth
npm --prefix APPS/peacepad run verify:deployment-ownership
npm --prefix APPS/peacepad run test:e2e:human-workflow
npm --prefix APPS/peacepad run test:e2e:human-workflow:mobile
```

Final closure state:

- `api.peacepad.ca` is owned by the active Railway `@ftc/peacepad` service, not the old paused project.
- Guest auth/session restore smoke passes against production.
- The human workflow proof passes on desktop and mobile browser profiles.
- Demo partnership seeding is opt-in only and is not used by production proof.
- Partner join updates the active partnership for the joining user.
- The latest Railway deployment is green.

## Android Delivery

Production Android loads the hosted web app from `https://peacepad.ca` through `capacitor.config.ts`. Normal web frontend updates deployed to Cloudflare Pages and API updates deployed to Railway are visible in Android without a Play Store rebuild.

Rebuild Android only for native shell changes such as Capacitor config, permissions, icons, splash screen, native plugins, or bundled offline assets.

## Human Workflow Gate

Run the current PeacePad workflow proof before marking guest-first behavior green:

```powershell
npm --prefix APPS/peacepad run test:e2e:human-workflow
npm --prefix APPS/peacepad run test:e2e:human-workflow:mobile
```

The suite covers solo guest drafting, tone-preview outage recovery, copy-to-send, invite link/code visibility, second-guest partner join, invalid/self-code failure, and direct join-link handoff through onboarding.
