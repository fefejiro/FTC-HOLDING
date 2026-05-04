# Tow Signal Handover - 2026-03-28

## Status Note

This handover is historical.

As of 2026-04-02, the internal Dispatch runtime is live-only under the public Tow Signal product direction:

- `?mode=demo` flows are retired
- demo/session-tagged request handling is removed
- demo feedback is removed
- `dispatch.unalabs.cloud` is the live Ottawa roadside product only

Use [APPS/dispatch/README.md](/c:/FTC%20HOLDING/APPS/dispatch/README.md) as the current operational source of truth.

## Historical March 28 Snapshot

At the time of this handover, the product was being positioned as an Ottawa roadside assistance system with:

- a public product surface
- an operator workflow
- a private admin host
- a live Ottawa incident watch

That March 28 snapshot is no longer the active operating model for demo/session behavior.

## Current Live Surfaces

| Surface | URL | Notes |
|---|---|---|
| Una Labs product page | `https://unalabs.cloud/products/dispatch` | Official client entrypoint |
| Public app | `https://dispatch.unalabs.cloud` | Live Tow Signal surface |
| Private admin | `https://dispatch-admin.unalabs.cloud/admin` | Internal only |
| Railway fallback | `https://dispatch-api-production.up.railway.app` | Backend fallback |

## Current Role Split

- `unalabs.cloud/products/dispatch` is the sales and context layer.
- `dispatch.unalabs.cloud` is the live Tow Signal product surface.
- `dispatch-admin.unalabs.cloud/admin` is private and not part of the client flow.

## Current Product Behavior

- Customer intake is live
- Operator queue is live
- Request drill-down is live
- Status movement is live
- Admin oversight is live
- Incident watch is live

## Current Key Code Locations

```text
APPS/dispatch/client/src/pages/Home.tsx
APPS/dispatch/client/src/pages/Request.tsx
APPS/dispatch/client/src/pages/Operator.tsx
APPS/dispatch/client/src/pages/Admin.tsx
APPS/dispatch/server/routes.ts
APPS/dispatch/server/requestPayload.ts
APPS/dispatch/server/monitor.ts
workers/dispatch-edge/src/index.ts
APPS/ftc-site/app/products/dispatch/page.tsx
APPS/ftc-site/lib/content.ts
```

## Deployment Note

The internal Dispatch backend deploys from `APPS/dispatch` through the linked Railway service. Push `main`; do not use duplicate root-path deployment commands.
