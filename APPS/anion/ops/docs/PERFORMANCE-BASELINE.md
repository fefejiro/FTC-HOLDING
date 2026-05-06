# Performance Baseline — Pre-Launch

This baseline is intentionally non-destructive and does not require real secrets.

## Scope

- `GET /api/health`
- `GET /pricing`
- `POST /api/billing/checkout` (unauthenticated contract path expecting `401 UNAUTHENTICATED`)

## Runner

- Prerequisite: install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- Script: `scripts/perf-baseline.k6.js`
- Command: `npm run perf:baseline`
- Override target host with `ANION_BASE_URL` (default: `http://127.0.0.1:4178`)

Example:

```bash
cd /home/runner/work/FTC-HOLDING/FTC-HOLDING/APPS/anion
ANION_BASE_URL=http://127.0.0.1:4178 npm run perf:baseline
```

## Capacity Interpretation Bands (starter targets)

Use k6 summary output for each run and record:

- `http_req_duration` p50 + p95
- request rate (throughput)
- `http_req_failed` rate

Pass/fail target bands:

| Signal | Pass | Watch | Fail |
|---|---|---|---|
| Health p95 | `< 250ms` | `250-400ms` | `> 400ms` |
| Pricing p95 | `< 700ms` | `700-1000ms` | `> 1000ms` |
| Checkout unauth p95 | `< 500ms` | `500-800ms` | `> 800ms` |
| Overall failure rate | `< 2%` | `2-5%` | `> 5%` |
| Throughput trend vs prior baseline | Stable or better | Minor regression | Sustained regression |

## Evidence location

Save run artifacts in:

- `APPS/anion/ops/docs/perf-results/`

Use the template in:

- `APPS/anion/ops/docs/perf-results/REPORT-TEMPLATE.md`
