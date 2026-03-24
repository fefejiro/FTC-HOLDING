# RUNBOOK - Una Labs Site

## Prerequisites

- Node.js v18+
- npm
- Cloudflare Wrangler authenticated (`pages` write scope)

## Install (repo root)

```powershell
npm install
```

## Dev

```powershell
npm --workspace=@ftc/ftc-site run dev
```

Real ATEAM integration during local dev:

1. start ATEAM separately from `APPS/ATEAM/Server`
2. start Una Labs on port `3001`
3. open `http://localhost:3001/ateam`

Deep-link checks:

- `http://localhost:3001/ateam/office`
- `http://localhost:3001/ateam/factory`

Optional proxy override:

```powershell
$env:ATEAM_UPSTREAM_ORIGIN="http://127.0.0.1:3000"
npm --workspace=@ftc/ftc-site run dev
```

## Build

```powershell
npm --workspace=@ftc/ftc-site run build
```

## Test

```powershell
npm --workspace=@ftc/ftc-site run test:e2e
```

## Production smoke (post-deploy)

```powershell
npm --workspace=@ftc/ftc-site run smoke:prod
```

## Intake webhooks / trust loop

Set these in Cloudflare Pages project settings or your deployment environment:

- `UNALABS_INTAKE_WEBHOOK_URL`
- `UNALABS_CONFIRMATION_EMAIL_WEBHOOK_URL`

Recommended public contact address:

- `hello@unalabs.cloud`

Expected intake behavior in production:

1. project request is accepted by `/api/intake`
2. internal lead capture webhook receives the payload
3. acknowledgment email webhook is called when configured
4. the visitor sees a success state with a request reference

Optional overrides:

```powershell
$env:UNALABS_SMOKE_BASE_URL="https://ftc.peacepad.ca"
$env:UNALABS_SMOKE_PAGES_URL="https://ftc-site-pages.pages.dev"
npm --workspace=@ftc/ftc-site run smoke:prod
```

## Cloudflare Pages alignment (cutover)

```powershell
Set-Location "C:\FTC HOLDING"
npx wrangler whoami
npx wrangler pages project list
Set-Location "C:\FTC HOLDING\APPS\ftc-site"
npx wrangler pages download config ftc-site-pages
```

Expected project binding for V1:

- Pages project: `ftc-site-pages`
- Custom domain: `ftc.peacepad.ca`
- Build root: repository root
- Build command: `npm --prefix APPS/ftc-site run build && cd APPS/ftc-site && npx @cloudflare/next-on-pages@1`
- Output directory: `APPS/ftc-site/.vercel/output/static`
- Production branch: `main`

If production is still showing legacy pages, trigger a production redeploy from the
Cloudflare Pages dashboard after confirming the build command and output path above.

## DNS, TLS, and canonical verification

### Phase A (rebrand on existing host)

```powershell
Resolve-DnsName ftc.peacepad.ca
curl -I https://ftc.peacepad.ca/
curl -I https://ftc.peacepad.ca/capabilities
curl -I https://ftc.peacepad.ca/services
curl -I https://ftc-site-pages.pages.dev/
```

### Phase B (domain migration to unalabs.cloud)

Cloudflare dashboard sequence:

1. `Workers & Pages -> ftc-site-pages -> Custom domains -> Set up a custom domain`
2. Add `unalabs.cloud`
3. Add `www.unalabs.cloud`
4. Ensure DNS records are proxied and certificates are active

```powershell
Resolve-DnsName unalabs.cloud
Resolve-DnsName www.unalabs.cloud
curl -I https://unalabs.cloud/
curl -I https://www.unalabs.cloud/
curl -I https://ftc.peacepad.ca/
```

Expected after Phase B switch:

- canonical host = `https://unalabs.cloud`
- `https://www.unalabs.cloud` serves production (or redirects to apex)
- `https://ftc.peacepad.ca` returns `308` to `https://unalabs.cloud`

## Launch readiness artifacts

- `docs/LAUNCH_READINESS_CHECKLIST.md`
- `docs/EXTERNAL_PROFILE_LINKAGE_PACK.md`
- `docs/LAUNCH_VERIFICATION_REPORT_2026-03-08.md`

## Launch distribution pass (LinkedIn, Upwork, Fiverr)

After production smoke is green:

1. set profile website URL to `https://unalabs.cloud`
2. point profile CTA to `https://unalabs.cloud/work-with-ftc`
3. add featured links:
   - `https://unalabs.cloud/work`
   - `https://unalabs.cloud/products`
   - `https://unalabs.cloud/work/peacepad`
   - `https://unalabs.cloud/work/saywetin`
   - `https://unalabs.cloud/work/ateam`
