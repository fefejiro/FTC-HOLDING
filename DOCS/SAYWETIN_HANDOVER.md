# SayWetin Handover

## Current Repository Status

- SayWetin source is present at `APPS/saywetin`.
- Root workspace scripts have been re-aligned to include `@ftc/saywetin`.

## Deployment Alignment Notes

- Railway:
  - Root Directory should be `APPS/saywetin`.
  - Dockerfile path should be `Dockerfile` (relative to that root directory).
  - API host target should be `api.saywetin.app` in the split-host model.
- Cloudflare:
  - Frontend project root should be `APPS/saywetin`.
  - Frontend domains should be `saywetin.app` and `www.saywetin.app`.
  - Set `VITE_API_BASE_URL` to `https://api.saywetin.app`.

## Historical Issue Observed During Handover

- API subdomain routing was unhealthy (`api.saywetin.app` Cloudflare Error 1016), causing frontend `/api` failures when `VITE_API_BASE_URL` pointed there.

## Immediate Operational Guidance

1. Preferred architecture (same as PeacePad):
   - Frontend on Cloudflare Pages (`saywetin.app`, `www.saywetin.app`)
   - API on Railway (`api.saywetin.app`)
2. Domain and DNS requirements:
   - `api.saywetin.app` must resolve and return `200` on `/health`.
   - CORS must allow `https://saywetin.app`.
3. If API custom domain is blocked by Railway plan limits:
   - Only use temporary single-host fallback if Railway is also serving the live web host.
   - Set `DEPLOY_ROLE=fullstack`
   - Set `PUBLIC_BASE_URL=https://saywetin.app`
   - Set frontend `VITE_API_BASE_URL=https://saywetin.app`.
   - Keep split-host migration pending until API domain can be attached.
