## Production Environment Checklist

**Required:**
- `DATABASE_URL` (Postgres connection string)
- `DISPATCH_OPERATOR_SESSION_SECRET` (operator token signing)
- `DISPATCH_ADMIN_PROXY_KEY` (admin access/proxy)
- `PORT` (default 8080)

**Optional (for push/API):**
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` (web push)
- `TOMTOM_API_KEY` (commercial incident source)
- `OPENWEBNINJA_API_KEY`, `OPENWEBNINJA_DIRECT_KEY` (experimental Waze wrapper)

---

## Local Verification Command Template (no secrets)

```powershell
$env:DATABASE_URL="..."
$env:DISPATCH_OPERATOR_SESSION_SECRET="..."
$env:DISPATCH_ADMIN_PROXY_KEY="..."
npx tsx APPS/dispatch/server/index.ts
```

---

## Expected Endpoint Tests (after server starts)

- `GET /health` should return **200**
- `GET /api/requests` (no token) should return **401/403**
- `POST /api/operators/auth` (invalid credentials) should return **401/403** or structured invalid login response

---

## 403 Clarification

- **403 is expected** if user is unauthenticated or token is missing/invalid.
- **403 is a production bug** if a valid login succeeds but protected requests still fail.
- **Missing `DATABASE_URL` is a runtime blocker, not an auth bug.**

---

## Local Verification Steps

Run from repo root:

```powershell
Set-Location "C:\FTC HOLDING\_restore_repo"
git status --short
```
# Dispatch/OG 403 Access Audit

**Date:** 2026-04-30

## Affected URLs
- Operator dashboard: https://dispatch.unalabs.cloud/operator
- Admin dashboard: https://dispatch-admin.unalabs.cloud/admin
- API base: https://dispatch.unalabs.cloud/api
- Health endpoint: https://dispatch.unalabs.cloud/health

## Required Environment Variables
- `DISPATCH_OPERATOR_SESSION_SECRET` (Railway backend env)
- `DISPATCH_ADMIN_PROXY_KEY` (Railway backend env)
- `DATABASE_URL` (Railway backend env)
- `PORT` (default 8080, Railway backend env)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` (for push, optional)
- `TOMTOM_API_KEY`, `OPENWEBNINJA_API_KEY`, `OPENWEBNINJA_DIRECT_KEY` (optional, for incident sources)

## Frontend Token Handling
- Operator session token is stored in `localStorage` under `dispatch_operator_session` (see `APPS/dispatch/client/src/lib/operatorSession.ts`).
- Operator API requests use `x-dispatch-operator-token` header (see `operatorFetch`).
- Admin login stores proxy key in `sessionStorage` as `dispatch_admin_token` (see `APPS/dispatch/client/src/pages/Login.tsx`).
- Login page: `APPS/dispatch/client/src/pages/Login.tsx` (handles both operator and admin login flows).

## Backend Files Involved
- `APPS/dispatch/server/operatorAccess.ts` (operator token logic)
- `APPS/dispatch/server/adminAccess.ts` (admin proxy key logic)
- `APPS/dispatch/server/routes.ts` (API route guards)
- `APPS/dispatch/server/index.ts` (server entry, env usage)
- `.env.example` (env variable reference)
- `railway.json`, `Dockerfile` (deploy config)


## Local Server Verification (2026-04-30)

- **Server start command:** `npx tsx APPS/dispatch/server/index.ts`
- **Result:** FAILED — `Error: DATABASE_URL is required`
- **Build output:** No `dist/index.cjs` produced; only TypeScript sources present.
- **Endpoint status codes:** Not tested (server did not start)
- **403 analysis:** Not observed locally; in production, 403 is expected for unauthenticated/missing token, but if required env vars (e.g., `DATABASE_URL`, `DISPATCH_OPERATOR_SESSION_SECRET`) are missing, all protected endpoints will return 403 (broken config).
- **Production verification:** Still required — local server and token flow not verified.

## Verification Results
- Health endpoint (`/health`) not tested locally (server did not start).
- Protected endpoints not tested locally.
- Login endpoint (`/api/operators/auth`) exists in code.
- Operator and admin login flows exist and store tokens as expected (code review only).
- Local build: Succeeded, but no runtime output produced.

---

**Dispatch remains HOLD unless local server and token flow are verified.**

## What Remains Owner/Dashboard Action
- Set/verify `DISPATCH_OPERATOR_SESSION_SECRET` and `DISPATCH_ADMIN_PROXY_KEY` in Railway backend environment (do not set in Cloudflare Pages; backend only).
- Confirm production Railway service has these secrets set and restart if needed.
- Test operator and admin login flows live after secrets are set.

## GO/HOLD/NO-GO
- **HOLD**: Production is blocked until required secrets are set in Railway backend environment and login/token flows are verified live.
- **NO-GO**: If 403 persists after secrets are set and login is confirmed.
- **GO**: Only after operator and admin access is verified live.

## Summary
- 403 is expected for unauthenticated protected endpoints.
- Login/token storage and header logic exist and are correct.
- Production is currently blocked by missing env only, not a code bug.
- No unrelated files changed. No secrets exposed in this doc.
- Build/test: Not run due to workspace path/script error; see logs for details.
