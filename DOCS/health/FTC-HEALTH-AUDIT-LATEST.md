# FTC Health Audit

Generated: 2026-07-10T04:05:27.415Z
Root: `C:\FTC HOLDING`

## Summary

- PASS: 90
- FAIL: 0
- WARN: 11
- BLOCKED_EXTERNAL: 0
- EXPECTED_PRIVATE: 2
- BLOCKED_ENV: 0

## Recovery Actions

- P1 GitHub Actions: Repair GitHub hosted runner entitlement or billing after production routes are stable; manual dispatch also fails before checkout when no runner is assigned. Evidence: GitHub schedule anion-scheduled-deploy.yml, GitHub schedule ftc-site-deploy.yml

## Audit metadata

| Status | Check | Summary |
|---|---|---|
| PASS | audit scope | Every APPS folder plus workers inventory; cloud endpoints; credentials; deploy schedules; link crawl; optional deep local gates. |


## App inventory

| Status | Check | Summary |
|---|---|---|
| PASS | APPS/anion | package.json found with 23 scripts. |
| PASS | APPS/anion-mobile | package.json found with 4 scripts. |
| PASS | APPS/ATEAM | package.json found with 33 scripts. |
| PASS | APPS/bushy-bet-bot | No package.json; static/manual app inventory only. |
| PASS | APPS/capsigma-growth-desk | package.json found with 20 scripts. |
| PASS | APPS/dispatch | package.json found with 14 scripts. |
| PASS | APPS/fefejiro | No package.json; static/manual app inventory only. |
| PASS | APPS/ftc-site | package.json found with 12 scripts. |
| PASS | APPS/gardencleaners-site | package.json found with 6 scripts. |
| PASS | APPS/gidi-dashers | package.json found with 4 scripts. |
| PASS | APPS/gidi-dashers-game | No package.json; static/manual app inventory only. |
| PASS | APPS/gidi-dashers-portal | package.json found with 5 scripts. |
| PASS | APPS/gidi-dashers-unity | No package.json; static/manual app inventory only. |
| PASS | APPS/job-reply-agent | package.json found with 62 scripts. |
| PASS | APPS/og-trades-academy | No package.json; static/manual app inventory only. |
| PASS | APPS/peacepad | package.json found with 23 scripts. |
| PASS | APPS/peacepad-extension | package.json found with 4 scripts. |
| PASS | APPS/saywetin | package.json found with 12 scripts. |
| PASS | APPS/saywetin-extension | package.json found with 17 scripts. |
| PASS | APPS/saywetin-native | package.json found with 32 scripts. |
| PASS | APPS/una-labs-site | package.json found with 4 scripts. |
| PASS | APPS/una-social-agent | package.json found with 26 scripts. |
| PASS | workers/ateam-edge | Worker folder inventory only. |
| PASS | workers/ateam-ops | Worker folder inventory only. |
| PASS | workers/dispatch-edge | Worker folder inventory only. |
| PASS | workers/peacepadai | Worker folder inventory only. |
| PASS | workers/stripe-api | Worker package.json found. |


## Cloud endpoints

| Status | Check | Summary |
|---|---|---|
| PASS | Una Labs home | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Una Labs capabilities | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Una Labs Anion product page | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Anion app home | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Anion API health | HTTP 200, content-type application/json |
| PASS | Anion API status | HTTP 200, content-type application/json |
| PASS | Garden home | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Garden portal | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Garden quote | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Garden contact | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Garden services | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | Garden legacy portal redirect | HTTP 308 |
| PASS | CapSigma home | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | CapSigma session API | HTTP 200, content-type application/json |
| PASS | PeacePad home | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | PeacePad API /health | HTTP 200, content-type application/json; charset=utf-8 |
| PASS | PeacePad API /api/health | HTTP 200, content-type application/json; charset=utf-8 |
| PASS | SayWetin home | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | SayWetin www home | HTTP 200, content-type text/html; charset=utf-8 |
| PASS | SayWetin API /health | HTTP 200, content-type application/json; charset=utf-8 |
| PASS | SayWetin API /api/status | HTTP 200, content-type application/json; charset=utf-8 |
| PASS | Dispatch home | HTTP 200, content-type text/html; charset=UTF-8 |
| PASS | Dispatch health | HTTP 200, content-type application/json; charset=utf-8 |
| EXPECTED_PRIVATE | Ops private console | Expected protected/private response 302. |
| EXPECTED_PRIVATE | ATEAM public surface | Expected protected/private response 302. |
| PASS | SayWetin database connectivity | database.configured=true and database.connected=true. |


## Credentials and vendors

| Status | Check | Summary |
|---|---|---|
| PASS | Cloudflare Wrangler identity | Command completed. |
| PASS | Railway API identity/projects | Command completed. |
| WARN | env:CLOUDFLARE_API_TOKEN | Not present in current shell. Runtime or CLI config may still provide this credential. |
| WARN | env:RAILWAY_TOKEN | Not present in current shell. Runtime or CLI config may still provide this credential. |
| WARN | env:SUPABASE_SERVICE_ROLE_KEY | Not present in current shell. Runtime or CLI config may still provide this credential. |
| WARN | env:DAILY_API_KEY | Not present in current shell. Runtime or CLI config may still provide this credential. |
| WARN | env:STRIPE_SECRET_KEY | Not present in current shell. Runtime or CLI config may still provide this credential. |
| WARN | env:STRIPE_RESTRICTED_KEY | Not present in current shell. Runtime or CLI config may still provide this credential. |
| WARN | env:GITHUB_TOKEN | Not present in current shell. Runtime or CLI config may still provide this credential. |
| WARN | env:GH_TOKEN | Not present in current shell. Runtime or CLI config may still provide this credential. |


## Deploy schedules

| Status | Check | Summary |
|---|---|---|
| WARN | GitHub schedule anion-scheduled-deploy.yml | 5/5 recent runs were not successful. Bypass with direct local/cloud checks tonight. |
| WARN | GitHub schedule ftc-site-deploy.yml | 5/5 recent runs were not successful. Bypass with direct local/cloud checks tonight. |


## Cloud command checks

| Status | Check | Summary |
|---|---|---|
| PASS | Anion production smoke | Command completed. |
| WARN | Anion production doctor | Command exited 1. |
| PASS | CapSigma production doctor | Command completed. |
| PASS | PeacePad production verifier | Command completed. |
| PASS | PeacePad deployment ownership | Command completed. |
| PASS | SayWetin production verifier | Command completed. |


## Broken links

| Status | Check | Summary |
|---|---|---|
| PASS | crawl source https://unalabs.cloud/ | Queued 2 same-origin links. |
| PASS | crawl source https://unalabs.cloud/capabilities | Queued 1 same-origin links. |
| PASS | crawl source https://unalabs.cloud/products/anion | Queued 1 same-origin links. |
| PASS | crawl source https://gardencleaners.ca/ | Queued 2 same-origin links. |
| PASS | crawl source https://gardencleaners.ca/portal | Queued 1 same-origin links. |
| PASS | crawl source https://peacepad.ca/ | Queued 2 same-origin links. |
| PASS | crawl source https://saywetin.app/ | Queued 2 same-origin links. |
| PASS | crawl source https://dispatch.unalabs.cloud/ | Queued 1 same-origin links. |
| PASS | crawl source https://capsigma-growth-desk.pages.dev/ | Queued 0 same-origin links. |
| PASS | link /manifest.webmanifest | HTTP 200 |
| PASS | link / | HTTP 200 |
| PASS | link /capabilities | HTTP 200 |
| PASS | link /products/anion | HTTP 200 |
| PASS | link /manifest.webmanifest | HTTP 200 |
| PASS | link / | HTTP 200 |
| PASS | link /portal | HTTP 200 |
| PASS | link / | HTTP 200 |
| PASS | link /manifest.json | HTTP 200 |
| PASS | link / | HTTP 200 |
| PASS | link /manifest.webmanifest | HTTP 200 |
| PASS | link /manifest.json | HTTP 200 |


## Local runtime

| Status | Check | Summary |
|---|---|---|
| PASS | localhost:3000 | No listener on this common FTC dev port. |
| PASS | localhost:3001 | No listener on this common FTC dev port. |
| PASS | localhost:3101 | No listener on this common FTC dev port. |
| PASS | localhost:3102 | No listener on this common FTC dev port. |
| PASS | localhost:4178 | No listener on this common FTC dev port. |
| PASS | localhost:5000 | No listener on this common FTC dev port. |
| PASS | localhost:5173 | No listener on this common FTC dev port. |
| PASS | localhost:8000 | No listener on this common FTC dev port. |
| PASS | localhost:8787 | No listener on this common FTC dev port. |


## Local gates

| Status | Check | Summary |
|---|---|---|
| PASS | local gate mode | Deep local build/test gates skipped; run npm run health:audit -- --deep-local --no-fail to execute them. |
