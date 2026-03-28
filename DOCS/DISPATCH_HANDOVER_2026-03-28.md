# Dispatch Handover - 2026-03-28

## What it is

Dispatch is the Ottawa roadside assistance product in this repo. It covers gas delivery, lockouts, jump starts, and tire changes, with a live operator workflow and a real Ottawa incident watch layered into the same system.

## Live surfaces

| Surface | URL | Notes |
|---|---|---|
| Una Labs product page | `https://unalabs.cloud/products/dispatch` | Official client entrypoint |
| Public app | `https://dispatch.unalabs.cloud` | Live product surface |
| Demo request form | `https://dispatch.unalabs.cloud/request?mode=demo` | Client-safe demo intake |
| Demo operator surface | `https://dispatch.unalabs.cloud/operator?mode=demo` | Invite-only sandbox operator flow |
| Private admin | `https://dispatch-admin.unalabs.cloud/admin` | Internal only |
| Railway fallback | `https://dispatch-api-production.up.railway.app` | Backend fallback |

## Role split

- `unalabs.cloud/products/dispatch` is the sales and context layer.
- `dispatch.unalabs.cloud` is the live product and demo surface.
- `dispatch-admin.unalabs.cloud/admin` is private and not part of the client flow.

For client feedback rounds, give operator sandbox access only. Do not give admin access.

## Client demo flow

1. Client opens `https://unalabs.cloud/products/dispatch`
2. Client clicks `Try Dispatch Demo`
3. Client submits a fake roadside request
4. Client opens the invited operator demo and signs in
5. Client works the same request through the queue
6. Client submits feedback from inside Dispatch

Demo requests are tagged by session so the client only sees their own sandbox queue while the real incident watch stays visible.

## Current product behavior

- Customer intake is live
- Operator queue is live
- Request drill-down is live
- Back-to-queue navigation is live
- Status movement is live
- Demo feedback form is live
- Admin can observe demo requests and see demo session markers

## Incident monitor

Dispatch currently watches three official no-key Ottawa-area sources:

1. Ontario 511
2. City of Ottawa Traffic Events
3. OC Transpo Service Alerts

The monitor polls every 60 seconds and keeps the operator road-alert feed warm through SSE.

## Security notes

- Admin stays on a separate private host
- Admin session uses a server-side worker gate and HTTP-only cookie
- Operator creation is restricted to the private admin surface
- Credentials should be shared manually and must not be committed into repo docs

## Key code locations

```text
APPS/dispatch/client/src/pages/Home.tsx
APPS/dispatch/client/src/pages/Request.tsx
APPS/dispatch/client/src/pages/Operator.tsx
APPS/dispatch/client/src/pages/Admin.tsx
APPS/dispatch/client/src/components/DemoFeedbackForm.tsx
APPS/dispatch/client/src/lib/demo.ts
APPS/dispatch/server/routes.ts
APPS/dispatch/server/demo.ts
APPS/dispatch/server/monitor.ts
workers/dispatch-edge/src/index.ts
APPS/ftc-site/app/products/dispatch/page.tsx
APPS/ftc-site/lib/content.ts
```

## Deployment notes

- Dispatch backend deploys from `APPS/dispatch` to Railway using `railway up . --path-as-root --detach`
- Una Labs marketing site deploys from the repo to Cloudflare Pages
- If `unalabs.cloud/products/dispatch` looks stale right after push, wait for Pages to roll the cache and hard refresh once

## Final state on 2026-03-28

- Dispatch demo flow is live
- Sandbox operator flow is live
- Private admin host is live
- Una Labs product page now points clients into the demo path instead of admin
- Real incident watch remains active during client demos
