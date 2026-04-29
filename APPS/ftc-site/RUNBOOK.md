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

- public workflow: `http://localhost:3001/ateam`
- operator office: `http://localhost:3001/ateam/operator/office`
- operator factory: `http://localhost:3001/ateam/operator/factory`

Public flow expectation for `/ateam`:

- `Intake`: text or voice narrative input + short clarifiers
- `System`: intent summary, run state, lane, movement reason, blocker context
- `Work`: visible public-safe work steps + public-safe timeline
- `Output`: run-owned artifacts + decision pack + handoff
- public flow should read like one intent engine, not a mini admin dashboard
- first screen should show ATEAM already alive plus the intake box; do not make users read a long hero before they can start
- before intake begins, the page should still preview believable System, Work, and Output states so ATEAM feels alive immediately
- public work/output language should hide internal operator names and approval wording
- public CTA should keep users inside ATEAM until output is ready; no premature jump to a second idea form
- once output is ready, the preferred path is an inline ATEAM handoff capture, with `/work-with-ftc?from=ateam` as fallback

Operator expectation for `/ateam/operator/*`:

- full Office / Team / Factory / Memory / Pipeline shell
- approvals, logs, overrides, and delivery control remain private

Production note:

- Cloudflare Pages owns public `https://unalabs.cloud/ateam`
- the dedicated edge workers only own:
  - `https://unalabs.cloud/api/ateam/*`
  - `https://ops.unalabs.cloud`
  - `https://unalabs.cloud/mission-control*` redirects
- `https://unalabs.cloud/ateam/operator/*` is intentionally not exposed on the public host
- use `https://ops.unalabs.cloud` for the full admin shell once the private worker and Cloudflare Access policy are active

Private operator runtime:

- Cloudflare Worker: `workers/ateam-ops`
- shared Railway upstream: `https://ateam-api-production.up.railway.app`
- required Railway env:
  - `ATEAM_AUTH_MODE=trusted_proxy`
  - `ATEAM_PUBLIC_SERVICE_MODE=false`
  - `ATEAM_TRUSTED_PROXY_KEY=<same secret used by the ops worker>`
- required Cloudflare Access behavior:
  - protect `ops.unalabs.cloud/*`
  - allowlist `hello@unalabs.cloud`
  - copy the Access team domain into `CF_ACCESS_TEAM_DOMAIN`
  - copy the Access application AUD into `CF_ACCESS_AUD`
- secure fallback if Access is not ready:
  - set `OPS_BASIC_AUTH_USERNAME`
  - set `OPS_BASIC_AUTH_PASSWORD`
  - the worker will challenge with HTTP Basic Auth until Access is fully configured

Private operator verification:

1. `GET https://ops.unalabs.cloud/` redirects to `/ateam/operator/office`
2. without Cloudflare Access, the worker returns `cloudflare_access_required`
3. with Access, `/api/operator/session` returns the operator identity payload
4. Office / Factory / Team routes load through the ops worker

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
- `/work-with-ftc?from=ateam` should behave like a handoff, not a restart:
  - shorter hero
  - no repeated idea prompt
  - attached ATEAM brief sent automatically
  - only contact details plus optional budget/timeline/notes required
