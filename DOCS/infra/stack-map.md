# Stack Map

Last updated: 2026-04-02

This document is the canonical high-level deployment map for the FTC HOLDING / Una Labs stack.

## Core rule

- GitHub is the source of truth.
- Cloudflare owns public domains, DNS, SSL, static sites, and edge routing.
- Supabase is the shared data layer.
- Railway is runtime only for services that actually need server compute.

## Product Map

| Product | Frontend / public entry | Runtime backend | Data layer | Primary domains | Status |
| --- | --- | --- | --- | --- | --- |
| PeacePad | Cloudflare Pages from `APPS/peacepad` | Railway service `FTC-HOLDING` | Supabase Postgres + auth/storage | `peacepad.ca`, `www.peacepad.ca`, `api.peacepad.ca` | Active |
| Una Labs site (`ftc-site`) | Cloudflare Pages from `APPS/ftc-site` | No dedicated Railway service | Shared package layer, optional same-origin API proxies only | `unalabs.cloud`, `www.unalabs.cloud` | Active |
| ATEAM public + ops | Cloudflare Pages from `APPS/ftc-site` for the public route, plus Workers from `workers/ateam-edge` and `workers/ateam-ops` for API/ops edges | Railway service `ateam-api` from `APPS/ATEAM` | Shared Supabase-managed Postgres path preferred for workflow durability | `unalabs.cloud/ateam`, `unalabs.cloud/api/ateam/*`, `ops.unalabs.cloud`, Railway fallback origin | Active |
| Dispatch | Cloudflare Worker from `workers/dispatch-edge` | Railway service `dispatch-api` from `APPS/dispatch` | Supabase Postgres | `dispatch.unalabs.cloud`, `dispatch-admin.unalabs.cloud`, Railway fallback origin | Active after Railway restore |
| SayWetin | Cloudflare Pages from `APPS/saywetin` | Railway service `sunny-acceptance` only when API runtime is needed | Supabase Postgres | `saywetin.app`, `www.saywetin.app`, optional `api.saywetin.app` | Paused by default |

## Cloudflare Responsibilities

### Static / public sites

- `APPS/peacepad` -> Cloudflare Pages for `peacepad.ca`
- `APPS/ftc-site` -> Cloudflare Pages for `unalabs.cloud`
- `APPS/saywetin` -> Cloudflare Pages for `saywetin.app`

### Edge runtime / domain routing

- `workers/dispatch-edge` fronts:
  - `dispatch.unalabs.cloud`
  - `dispatch-admin.unalabs.cloud`
- `workers/ateam-edge` fronts:
  - `unalabs.cloud/api/ateam/*`
  - `unalabs.cloud/mission-control*` redirect path
- `workers/ateam-ops` fronts:
  - `ops.unalabs.cloud`

Cloudflare is the public entry layer for Dispatch and ATEAM. Railway should not be treated as the public branded hostname owner for those products.

## Railway Responsibilities

### Active runtime services

- `FTC-HOLDING`
  - Purpose: PeacePad API runtime only
  - Canonical app root: `APPS/peacepad`
  - Public domain: `api.peacepad.ca`
- `ateam-api`
  - Purpose: ATEAM workflow / operator runtime behind Cloudflare workers
  - Canonical app root: `APPS/ATEAM`
  - Public-facing entry stays on Cloudflare; Railway fallback domain is operational only
- `dispatch-api`
  - Purpose: Dispatch full runtime behind the Dispatch edge worker
  - Canonical app root: `APPS/dispatch`
  - Railway default domain is fallback only

### Paused or optional runtime services

- `sunny-acceptance`
  - Purpose: SayWetin API runtime only when the live product needs server compute
  - Default posture: paused to fit a lean Hobby plan unless active SayWetin API traffic is required

### Archived / remove from Railway surface

- `@ftc/ftc-site`
  - The marketing site belongs on Cloudflare Pages, not Railway.
  - Any stale Railway service for `ftc-site` should be archived or removed from the dashboard.

## Supabase Responsibilities

- Shared PostgreSQL database layer for PeacePad, Dispatch, SayWetin, and ATEAM durable workflow state
- Shared auth/storage capability where product-specific flows need it
- Preferred database home for lean Railway services instead of separate database infrastructure per service

## Canonical App Roots

- PeacePad API: `APPS/peacepad`
- Dispatch runtime: `APPS/dispatch`
- ATEAM runtime: `APPS/ATEAM`
- SayWetin API: `APPS/saywetin`
- Una Labs public site: `APPS/ftc-site`

Do not deploy these services from the monorepo root unless the service documentation explicitly says to do so.
