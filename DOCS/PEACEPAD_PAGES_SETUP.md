# PeacePad Cloudflare Pages Setup

## Exact Pages Project Settings
Use these values in Cloudflare Pages for PeacePad:

- Production branch: `main`
- Root directory: `APPS/peacepad`
- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist/public`
- Node.js version: `20.x`
- Git submodules: `Disabled`

Notes:
- If Git submodules is enabled, Cloudflare may attempt a submodule update and fail.
- This repo now tracks `APPS/peacepad` as a normal directory (not a gitlink).

## Environment Variables (Pages - Production)
Set in Pages dashboard (do not commit values):

- `VITE_API_BASE_URL=https://api.peacepad.ca`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## SPA Rewrite Requirement
Required file (already in repo):

- `APPS/peacepad/client/public/_redirects`

Required rule:

```text
/* /index.html 200
```

This is required so `/auth/callback` and `/auth/mobile-callback` return `200` on Pages.

## Domain Attach Steps
In Pages project:

1. Go to `Custom domains`.
2. Add `peacepad.ca`.
3. Add `www.peacepad.ca`.
4. For each domain, create DNS record exactly as Pages instructs.

## DNS Records (Cloudflare DNS)
Create CNAME records using the exact destination shown in the Pages custom domain UI:

- Type: `CNAME`
- Name: `peacepad.ca` (or apex `@`)
- Target: `use the value shown in Pages custom domain UI`
- Proxy status: `DNS only` until validation is complete, then switch to `Proxied` if desired

- Type: `CNAME`
- Name: `www`
- Target: `use the value shown in Pages custom domain UI`
- Proxy status: `DNS only` until validation is complete, then switch to `Proxied` if desired

Do not hardcode a CNAME destination in docs; use the value Cloudflare Pages shows for your project.

## Callback URLs That Must Resolve
- `https://peacepad.ca/auth/callback`
- `https://peacepad.ca/auth/mobile-callback`
- `https://www.peacepad.ca/auth/mobile-callback`
