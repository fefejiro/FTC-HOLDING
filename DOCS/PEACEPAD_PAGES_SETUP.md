# PeacePad Cloudflare Pages Setup (Option A UI Host)

This setup makes `peacepad.ca` and `www.peacepad.ca` serve the PeacePad frontend from Cloudflare Pages only.

## Cloudflare Dashboard Click Path
1. Cloudflare dashboard -> `Workers & Pages`.
2. Open the PeacePad Pages project (or `Create application` -> `Pages` -> connect Git repo).
3. `Settings` -> `Build & deployments`.

## Pages Build Settings (Copy/Paste)
- Production branch: `main`
- Root directory (monorepo): repository root
- Framework preset: `None`
- Build command: `npm --prefix APPS/peacepad run build:frontend`
- Build output directory: `APPS/peacepad/dist/public`
- Node.js version: `20.x`
- Git submodules: `Disabled`

Pages must deploy directly from GitHub `main`. Do not chain Pages deployment through Railway.

## Required Pages Environment Variables
Set in Pages -> `Settings` -> `Environment variables` (Production):

- `VITE_API_BASE_URL=https://api.peacepad.ca`
- `VITE_SUPABASE_URL=<set in dashboard>`
- `VITE_SUPABASE_ANON_KEY=<set in dashboard>`

Do not commit secret values to git.

## SPA Routing Requirement
File in repo:
- `APPS/peacepad/client/public/_redirects`

Required content:
```text
/* /index.html 200
```

This is required so callback routes do not 404:
- `https://peacepad.ca/auth/callback`
- `https://peacepad.ca/auth/mobile-callback`

## Attach Custom Domains
Click path:
1. Pages project -> `Custom domains`.
2. `Set up a custom domain` -> add `peacepad.ca`.
3. Add `www.peacepad.ca`.
4. For each domain, use the exact DNS target shown in the Pages UI.

## DNS Records (Cloudflare DNS)
Create CNAME records exactly as Pages instructs. Do not hardcode the target in docs.

- Type: `CNAME`
- Name: `@` (apex for `peacepad.ca`) or `peacepad.ca` if your DNS UI uses full hostnames
- Target: `use the value shown in Pages custom domain UI`
- Proxy status: `DNS only` until SSL/domain validation completes, then `Proxied` if desired

- Type: `CNAME`
- Name: `www`
- Target: `use the value shown in Pages custom domain UI`
- Proxy status: `DNS only` until SSL/domain validation completes, then `Proxied` if desired

## Verify the Deployment Is Serving HTML
Run from repo root:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-peacepad-prod.ps1
```

Expected:
- `https://peacepad.ca` returns `200` and `Content-Type` includes `text/html`
- `https://www.peacepad.ca` returns `200` and `Content-Type` includes `text/html`
- callback routes return `200` (not `404 Not Found`)

Ownership checks (run from `APPS/peacepad`):
```powershell
npm run verify:deployment-ownership
```

Expected:
- `peacepad.ca` is served by Cloudflare and references `api.peacepad.ca` in frontend bundle.
- `api.peacepad.ca/api/health` returns `200` JSON from Railway.
- `api.peacepad.ca/onboarding` returns `404` JSON (Railway API-only mode).
