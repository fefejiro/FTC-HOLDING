# Dispatch Handover — 2026-03-28

## What it is

Ottawa Roadside Assistance dispatch system. Client runs gas delivery, lockouts, jump starts, and tire changes. Single-operator mobile-first PWA with real-time job routing, push notifications, and live Ottawa incident monitoring.

---

## Live surfaces

| Surface | URL | Notes |
|---|---|---|
| Customer intake | `dispatch.unalabs.cloud/request` | Public, no auth |
| Operator dashboard | `dispatch.unalabs.cloud/operator` | PIN protected |
| Admin | `dispatch.unalabs.cloud/admin` | Proxy-key protected |
| API | `dispatch-api-production.up.railway.app` | Railway, Docker |

---

## Stack

| Layer | Service |
|---|---|
| Frontend | Vite + React + Tailwind, served by Express |
| Backend | Express + Drizzle ORM + PostgreSQL |
| Database | Supabase (shared project, `dispatch` schema) |
| Deploy | Railway (Dockerfile), auto-redeploy on push |
| Push | VAPID web-push configured, FCM slot available |
| Incidents | Ontario 511 + Ottawa Traffic Events + OC Transpo RSS, 60s poll |

---

## Database

Uses the shared Supabase instance (`cmxahlxcqxphszmfywzn`) but **isolated in the `dispatch` PostgreSQL schema** — no overlap with `public.*` tables used by peacepad/ATEAM.

Tables: `dispatch.operators`, `dispatch.requests`, `dispatch.incidents`

To push schema changes:
```bash
cd APPS/dispatch
npx drizzle-kit push
```

---

## Environment variables (Railway)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Supabase pooled connection |
| `VAPID_PUBLIC_KEY` | Web push (set) |
| `VAPID_PRIVATE_KEY` | Web push (set) |
| `VAPID_EMAIL` | `mailto:mike@unalabs.cloud` |
| `DISPATCH_ADMIN_PIN` | `dispatch2026` — operator PIN |
| `DISPATCH_ADMIN_PROXY_KEY` | Admin surface gate key |
| `NODE_ENV` | `production` |

---

## Incident monitor

Three sources polled every 60 seconds:
1. Ontario 511 (`511on.ca/api/v2/get/event`) — major highway/road events
2. City of Ottawa Traffic Events (`traffic.ottawa.ca`) — municipal events
3. OC Transpo RSS — transit detours and cancellations

Events are deduped by source-prefixed ID, geocoded (Nominatim, max 8/run), stored in `dispatch.incidents`, and broadcast via SSE to connected operators. Push alert fires on high-severity new events.

---

## First-run operator setup

1. Open `dispatch.unalabs.cloud/admin`
2. Use PIN `dispatch2026` to log in
3. Add operator → name + phone + set active
4. Operator opens `/operator` on their phone, enters PIN
5. Browser subscribes to push — operator is now live

---

## Local dev

```bash
cd APPS/dispatch
npm run dev         # starts Express + Vite HMR on :8080
```

---

## Code locations

```
APPS/dispatch/
├── client/src/pages/
│   ├── Request.tsx     # Customer intake form
│   ├── Operator.tsx    # Job queue + accept/navigate/complete
│   ├── Admin.tsx       # All jobs, operator management
│   └── Home.tsx        # Public landing + system status
├── server/
│   ├── index.ts        # Express entry
│   ├── routes.ts       # All API routes
│   ├── schema.ts       # Drizzle schema (dispatch.* tables)
│   ├── push.ts         # VAPID web-push
│   ├── monitor.ts      # Incident feed polling
│   └── sse.ts          # Server-sent events broadcast
```
