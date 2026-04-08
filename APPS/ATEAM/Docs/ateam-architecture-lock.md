---
title: ATEAM Architecture Lock — Phase 0
version: 1.0
locked: 2026-04-08
---

# ATEAM Architecture Lock

This document freezes the module boundaries and deployment topology of ATEAM as of Phase 0.
No new layers may be added without revising this doc. Drift from these boundaries is a bug.

---

## Deployment Topology

```
Phone / Browser
     │
     ▼
[Cloudflare Worker]  workers/ateam-edge/src/index.ts
  - Proxy at /ateam* and /api/ateam/* on unalabs.cloud
  - Passes requests to Railway upstream
  - Does NOT serve HTML itself (proxyAteamAppRequest only)
     │
     ▼
[Railway — ATEAM Server]  APPS/ATEAM/Server/
  - Node.js + Express
  - Serves Public/ as static files
  - Handles /api/* routes
  - SQLite for local persistence
     │
     ▼
[SQLite]  local file, managed by Server/lib/sqliteDb.js
  - WorkflowRuns table
  - Approvals table
  - Tasks table
```

ATEAM is **local-first**. Railway is its production host for Mike's own use.
There is no multi-tenant database. Supabase is not active in the ATEAM stack.

---

## Module Map

### Client — `APPS/ATEAM/Public/`

| File | Responsibility |
|------|---------------|
| `index.html` | Shell: all views declared here as `<main data-mc-page="...">` |
| `app.js` | Main controller: routing, state, API calls, event binding |
| `style.css` | All visual rules including view transitions and entry mode |
| `modules/config.js` | Frozen constants: routes, agent directory, office lanes, workflow keys |

The client is **vanilla JS**. No bundler. No framework. Modules loaded as IIFE scripts.
`window.ATEAMModules` is the only module namespace. Do not add `import/export` to client files.

### Server — `APPS/ATEAM/Server/`

| File | Responsibility |
|------|---------------|
| `bridge.js` / `server.js` | Express app entry, route registration |
| `lib/workflowService.js` | Run CRUD, state transitions, approval wiring |
| `lib/workflowEngine.js` | Pure functions: plan building, state normalization, phase mapping |
| `lib/approvalStore.js` | Approval record CRUD (SQLite-backed) |
| `lib/sqliteDb.js` | DB init, schema, singleton accessor |

### Edge Worker — `workers/ateam-edge/src/index.ts`

Single responsibility: proxy requests to Railway. It must not:
- Serve HTML from `buildPage()`
- Add business logic
- Cache state

### Telegram Gateway — `APPS/ATEAM/telegram-gateway/`

Optional ingress. Sends commands to bridge via HTTP POST.
Not part of the core approval loop.

---

## What This Layer Boundary Means

1. **Engine is stateless.** `workflowEngine.js` exports pure functions only. No imports from DB or service layer.
2. **Service owns state.** `workflowService.js` is the only file allowed to read/write WorkflowRuns.
3. **Client calls `/api/*` only.** No direct DB access from browser. No server-side rendering beyond static file serving.
4. **Worker proxies only.** If a change requires the worker to do more than proxy, escalate to Mike before implementing.

---

## Things That Must Not Change Without Explicit Decision

- The worker route pattern (`/ateam*`, `/api/ateam/*`)
- The SQLite schema tables (`approvals`, `workflow_runs`, `tasks`)
- The `window.ATEAMModules` namespace convention
- The `data-mc-page` attribute as the routing mechanism for views
