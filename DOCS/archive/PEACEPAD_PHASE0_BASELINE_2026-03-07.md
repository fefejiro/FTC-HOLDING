# PeacePad Phase 0 Baseline Snapshot (2026-03-07)

## Workspace

- Active workspace: `C:\FTC HOLDING`
- Branch: `main`
- Commit: `628a20b`

## Gate Check Results

1. `npm --prefix APPS/peacepad run verify:deployment-ownership`
   - PASS
   - Web index asset: `/assets/index-B1bwC6Kh.js`

2. `npm run verify:peacepad:prod`
   - PASS
   - `peacepad.ca`/`www.peacepad.ca` return `200` HTML
   - `api.peacepad.ca/health` and `api.peacepad.ca/api/health` return `200` JSON
   - `/_peacepad/build-meta.json` reachable

3. `npm --prefix APPS/peacepad run smoke:guest-auth`
   - PASS

4. `npm --prefix APPS/peacepad run smoke:e2e:update-lifecycle`
   - PASS (Chromium + mobile profile)
   - `5 passed`

## Production Snapshot Data

1. Build metadata (`https://peacepad.ca/_peacepad/build-meta.json`)
   - `{"webBuildId":"ts-1772806466947","deployedAt":"2026-03-06T14:14:26.947Z"}`

2. Telemetry health
   - Admin metrics endpoint unauthenticated check:
     - `GET /api/admin/web-update-metrics?window=24` -> `401` (expected without auth)
   - Ingestion endpoint controlled probe:
     - `POST /api/telemetry/web-update` -> `202`
     - Response: `{"accepted":true}`

3. Bundle report
   - Command: `node APPS/peacepad/scripts/report-bundle-size.mjs`
   - Main chunk: `index-B1bwC6Kh.js (920.77 kB)`
   - Mode: `SOFT` (strict gate begins 2026-03-16 UTC)
   - Over strict target by `138.59 kB` (warning-only in soft mode)
