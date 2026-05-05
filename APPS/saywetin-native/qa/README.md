# SayWetin QA Bench (full SDLC)

Single workspace, all gates in one place. Each layer runs standalone or as
part of the orchestrator.

## One-time install

```powershell
Set-Location "c:\FTC HOLDING\APPS\saywetin-native\qa"
npm install
```

E2E (optional, requires a connected device or running emulator):

```powershell
iwr -useb https://get.maestro.mobile.dev/install.ps1 | iex
```

## Layers

| Layer    | What it asserts                                                  | Tool        |
|----------|------------------------------------------------------------------|-------------|
| smoke    | Production endpoints reachable, no obvious regression            | smoke-api.mjs |
| unit     | Pure functions behave correctly (no I/O)                         | vitest      |
| api      | HTTP shape, status codes, side-effect surfaces against live API  | vitest      |
| contract | Response payload schemas (zod) — locks API ↔ mobile contract     | vitest+zod  |
| security | npm audit, secret scan, HTTPS headers, admin auth required       | node        |
| perf     | p99 latency + min RPS budgets (autocannon load run)              | autocannon  |
| uat      | End-user acceptance scenarios (json driven)                      | node        |
| bat      | Business acceptance — paid-product promise                       | node        |
| e2e      | Maestro UI flows (cold launch, identify, etc.)                   | maestro     |

## Run

```powershell
# everything (writes _report/index.html + summary.json)
npm run qa:all

# individual layers
npm run qa:unit
npm run qa:api
npm run qa:contract
npm run qa:security
npm run qa:perf
npm run qa:uat
npm run qa:bat
npm run qa:e2e
```

## Configure via env

| Var                | Default                                                    |
|--------------------|------------------------------------------------------------|
| `API_BASE_URL`     | `https://api.saywetin.app`                                 |
| `AUDIO_FIXTURE`    | _empty_ — set to an .m4a/.mp3 to enable `/api/listen` smoke |
| `PERF_DURATION`    | 15 (seconds per perf scenario)                             |
| `PERF_CONNECTIONS` | 25                                                         |
| `PERF_P99_BUDGET_MS` | 1500                                                     |
| `PERF_MIN_RPS`     | 30                                                         |
| `AUDIT_LEVEL`      | `high`                                                     |
| `E2E_DEVICE`       | _empty_ — adb serial or AVD name                           |
| `E2E_PLATFORM`     | `android`                                                  |

## Output

Everything lands in `qa/_report/`:

- `summary.json` — full machine-readable result
- `index.html` — single-page human view
- `perf.json`, `security.json`, `uat.json`, `bat.json`, `e2e.json` — per-layer
- `vitest.json` — unit/api/contract details

For CI runs, the workflow also uploads Android test video artifacts from
`qa/_report/videos/`.

## CI hookup

The orchestrator exits non-zero on any layer failure. Drop `npm run qa:all`
into a GitHub Action / Railway pre-deploy / Vercel deploy hook to gate
releases on the full pyramid.
