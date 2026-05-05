# PeacePad Phase 2 Hardening

## Scope

Phase 2 hardening stabilizes production operations for:
- Web update adoption visibility
- Deployment ownership drift detection
- Resume/update reliability checks
- Bundle-size control

This is a web/backend hardening phase only. Play Store release remains separate.

## Gate Flow

1. `main` receives a commit.
2. Cloudflare Pages deploys frontend (`peacepad.ca`).
3. Railway deploys backend (`api.peacepad.ca`).
4. GitHub Action `PeacePad Production Gates` runs:
   - `verify:deployment-ownership`
   - `verify:peacepad:prod`
   - `smoke:guest-auth`
5. Result mode:
   - `soft` before 2026-03-16 UTC: failures reported as warnings.
   - `hard` on/after 2026-03-16 UTC: failures block the workflow.
6. Branch protection action (platform config):
   - Mark `PeacePad Production Gates` as a required status check on `main` on/after 2026-03-16 UTC.

## Web Update Telemetry Dictionary

Endpoint: `POST /api/telemetry/web-update`

Required payload fields:
- `eventName`
- `webBuildId`
- `sessionType`
- `platform`
- `timestamp`

Optional payload fields:
- `knownBuildId`

Event names:
- `update_prompt_shown`
- `update_later_clicked`
- `update_now_clicked`
- `update_forced_24h`
- `update_apply_started`
- `update_apply_completed`

Session types:
- `authenticated`
- `guest`
- `public`
- `unknown`

Platform values:
- `web`
- `android`
- `ios`
- `unknown`

Reporting endpoint:
- `GET /api/admin/web-update-metrics?window=24`

## Weekly Checks

Run at least weekly:
1. `npm --prefix APPS/peacepad run verify:deployment-ownership`
2. `npm run verify:peacepad:prod`
3. `npm --prefix APPS/peacepad run smoke:guest-auth`
4. `npm --prefix APPS/peacepad run smoke:e2e:update-lifecycle`
5. Review `GET /api/admin/web-update-metrics?window=168`
6. Verify latest frontend build metadata:
   - `https://peacepad.ca/_peacepad/build-meta.json`

## Bundle Policy

- Build emits bundle report from `scripts/report-bundle-size.mjs`.
- Baseline main chunk: `942.30 kB`.
- Strict target: at least 15% reduction from baseline.
- Strict budget limit: `<= 800.95 kB` (`index-*.js` main chunk).
- Warning-only before strict date, hard-fail after strict date.

## Rollback Commands and Steps

Platform rollback steps:
1. Railway: redeploy previous successful API deployment.
2. Cloudflare Pages: promote previous stable production deployment.

After rollback, run:
```powershell
npm --prefix APPS/peacepad run verify:deployment-ownership
npm run verify:peacepad:prod
npm --prefix APPS/peacepad run smoke:guest-auth
```

## Definition of Green (Per Production Update)

- [ ] `verify:deployment-ownership` passes.
- [ ] `verify:peacepad:prod` passes.
- [ ] `smoke:guest-auth` passes.
- [ ] `/_peacepad/build-meta.json` returns JSON with non-empty `webBuildId`.
- [ ] `Cache-Control` for build-meta includes `no-store`.
- [ ] No broken signup/signin exposure in public flows.
- [ ] Update lifecycle prompt behavior works on next open + 24h force path.
