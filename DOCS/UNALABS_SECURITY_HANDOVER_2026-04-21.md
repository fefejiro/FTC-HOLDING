# Una Labs Security Handover - 2026-04-21

This handover captures the status-board hardening work completed on 2026-04-21 so another developer can continue without re-tracing the active path.

## Scope completed

- Locked the worker summary endpoint behind admin auth.
- Moved the live status board behind an authenticated admin route.
- Redirected the public `/status` route to `/admin/status`.
- Deployed the worker and the site manually through the documented Cloudflare flow.

## Exact files changed

- `APPS/una-labs-site/app/admin/status/page.tsx`
- `APPS/una-labs-site/app/status/page.tsx`
- `APPS/una-labs-site/lib/portfolio-status.ts`
- `workers/stripe-api/src/index.ts`

## Current route ownership

- Public status entry:
  - `/status`
  - file: `APPS/una-labs-site/app/status/page.tsx`
  - behavior: redirects to `/admin/status`
- Admin status board:
  - `/admin/status`
  - file: `APPS/una-labs-site/app/admin/status/page.tsx`
  - behavior: requires logged-in admin session and passes bearer token into the worker summary loader
- Worker summary endpoint:
  - `/api/admin/status-summary`
  - file: `workers/stripe-api/src/index.ts`
  - behavior: requires `verifyAdmin()`

## Deploy commands used

Site:

```powershell
Set-Location "c:\FTC HOLDING\APPS\una-labs-site"
npm run build
npx wrangler pages deploy out --project-name=ftc-site-pages --branch=main
```

Worker:

```powershell
Set-Location "c:\FTC HOLDING\workers\stripe-api"
npx wrangler deploy
```

## Deploy proof

- Site preview deploy:
  - `https://aac12f99.ftc-site-pages.pages.dev`
- Worker:
  - `https://una-stripe-api.fejiro-efiuvwere.workers.dev`
- Worker version id:
  - `2cf9a8f3-c560-4491-82da-4fb118c30f08`
- Git commit:
  - `680df298724a726bf16e49f563392c958c73431a`

## Verification performed

Unauthenticated worker checks:

- `GET https://una-stripe-api.fejiro-efiuvwere.workers.dev/api/admin/status-summary`
  - result: `401 Unauthorized`
  - body: `{"error":"Missing Authorization header."}`
- `GET https://una-stripe-api.fejiro-efiuvwere.workers.dev/api/public/status-summary`
  - result: old public path no longer usable on the live worker

Pages preview checks:

- `GET https://aac12f99.ftc-site-pages.pages.dev/status`
  - first redirects to `/status/`
  - final response contains Next redirect metadata to `/admin/status`

Build verification:

- `npm run build` succeeded in `APPS/una-labs-site`
- `npx tsc --noEmit` succeeded in `workers/stripe-api`

## Important operational notes

- Do not run `wrangler` from repo root. Use the app folder for Pages and worker folder for the worker.
- The Cloudflare Pages project is still named `ftc-site-pages` even though the active app root is `APPS/una-labs-site`.
- The status board is no longer a public dashboard. Treat it as an operator surface only.
- There were unrelated local Saywetin changes in the workspace and they were intentionally left alone.

## Remaining follow-up for next developer

- Update any remaining test plans or smoke scripts that still expect `/api/public/status-summary` to return `200`.
- If authenticated smoke coverage is needed, supply a real admin bearer token to the verification path instead of weakening the route.
- Keep an eye on docs that still mention the old public status endpoint and remove those assumptions before adding more automation around the board.
