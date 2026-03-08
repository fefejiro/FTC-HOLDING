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
- Monorepo source root: `APPS/ftc-site`
- Production branch: `main`

If production is still showing legacy pages, trigger a production redeploy from the
Cloudflare Pages dashboard after confirming the source root is `APPS/ftc-site`.

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
