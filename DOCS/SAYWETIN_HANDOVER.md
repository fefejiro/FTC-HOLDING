# SayWetin Handover

## Current Repository Status

- SayWetin source is present at `APPS/saywetin`.
- Root workspace scripts have been re-aligned to include `@ftc/saywetin`.

## Deployment Alignment Notes

- Railway:
  - Root Directory should be `APPS/saywetin`.
  - Dockerfile path should be `Dockerfile` (relative to that root directory).
- Cloudflare:
  - If used for frontend, set project root to `APPS/saywetin`.
  - Set `VITE_API_BASE_URL` to `https://saywetin.app` unless a separate API host is confirmed healthy.

## Live Issue Observed During Handover

- `https://saywetin.app/health` responded healthy.
- Browser requests to `https://api.saywetin.app/...` failed.
- `https://api.saywetin.app/health` showed Cloudflare Error 1016 (Origin DNS error), which breaks auth/listen calls from the frontend.

## Immediate Operational Guidance

1. If keeping current frontend:
   - Use a working API origin (or same-origin if API is served from the same host).
2. If keeping `api.saywetin.app`:
   - Fix Cloudflare DNS/origin mapping first.
   - Re-test `/api/auth/user` and `/api/listen` from browser.
3. If using a separate API domain (`api.saywetin.app`):
   - Ensure Cloudflare origin/DNS is healthy (no 1016).
   - Keep CORS aligned for browser origin `https://saywetin.app`.
