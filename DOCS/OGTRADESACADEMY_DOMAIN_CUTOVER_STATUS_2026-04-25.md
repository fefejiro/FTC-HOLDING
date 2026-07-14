# OG Trades Academy — Domain Cutover Status (2026-04-25)

## 2026-07-14 update

`https://www.ogtradesacademy.com/` is now the approved live production URL. Do not change DNS, Cloudflare domain bindings, apex routing, or OG Trades connection settings. Any older cutover instructions below are historical context only unless the owner explicitly asks for domain work.

2026-07-14 Cloudflare update: `og-trades-pages` received a direct upload deployment (`https://f6713cac.og-trades-pages.pages.dev`) with the approved `www` domain preserved. Public page checks passed for `/`, `/about`, `/course`, `/resources`, `/community`, and `/contact`. `OPTIONS /api/og-trades-leads` is live; controlled POST still needs `SUPABASE_SERVICE_ROLE_KEY` added to `og-trades-pages` before Supabase `og_trades_leads` persistence can be verified.

## Live now

- **Premium site (working URL):** https://og-trades-pages.pages.dev/ — HTTP 200, content verified
- **unalabs.cloud:** healthy (HTTP 200)
- **All other Una Labs / Dispatch / PeacePad / SayWetin domains:** untouched

## What is built and waiting

Cloudflare Pages project `og-trades-pages` is fully provisioned and serving the new premium OG Trades Academy build (Next.js 14 static export, 201 files, root `index.html` is the OG homepage).

Two custom domains are attached to the project but in `pending` state because their CNAME records are not yet pointing to it:

| Hostname | Owner of DNS | Required CNAME target | Blocker |
|---|---|---|---|
| `www.ogtradesacademy.com` | Client (Google Cloud DNS, admin@ogtradesacademy.com) | `og-trades-pages.pages.dev` | Awaiting client password |
| `og.unalabs.cloud` | Us (Cloudflare zone `68fc2deb79a7a99f58443b53adcc0505`) | `og-trades-pages.pages.dev` (proxied) | Wrangler OAuth token lacks `Zone.DNS:Edit`; needs a CF API token or a 30-second dashboard add |

## Two unblock paths (pick either)

### Path A — Temporary `og.unalabs.cloud` (no client needed, takes 1 minute)

Add a single DNS record in our own Cloudflare account, no client involvement:

1. Open https://dash.cloudflare.com/ → zone `unalabs.cloud` → DNS → Records → Add record
2. Type `CNAME`, Name `og`, Target `og-trades-pages.pages.dev`, Proxy status `Proxied`, TTL `Auto`. Save.
3. Within ~60 seconds, https://og.unalabs.cloud/ serves the premium OG site under HTTPS.

This gives OG a real branded link to use today.

### Path B — Final cutover to `www.ogtradesacademy.com` (requires client password)

Once the client gives you the Google Cloud / OG admin password:

1. Sign in at https://console.cloud.google.com/net-services/dns/zones (account `admin@ogtradesacademy.com`).
2. Open the managed zone for `ogtradesacademy.com`.
3. Edit the `www` CNAME record (currently `ext-sq.squarespace.com.`) and change target to `og-trades-pages.pages.dev.` with TTL `300`.
4. Optionally remove or repoint the apex `A` records (Squarespace IPs) once you also want the bare domain on Pages.
5. Cloudflare Pages will auto-detect the CNAME and issue a Google-managed cert within a few minutes.

After step 4, run:

```powershell
Resolve-DnsName www.ogtradesacademy.com -Type CNAME
curl.exe -I https://www.ogtradesacademy.com/
```

Expect `og-trades-pages.pages.dev` and HTTP 200.

## Verifying domain status from CLI

```powershell
$cfg = Get-Content "$env:APPDATA\xdg.config\.wrangler\config\default.toml" -Raw
$token = ($cfg | Select-String 'oauth_token = "([^"]+)"').Matches[0].Groups[1].Value
$acct = "4c5c204659aebe5d95a99b55a5a7d0b4"
$d = Invoke-RestMethod -Method GET `
  -Uri "https://api.cloudflare.com/client/v4/accounts/$acct/pages/projects/og-trades-pages/domains" `
  -Headers @{ Authorization = "Bearer $token" }
$d.result | ConvertTo-Json -Depth 5
```

Each domain should move from `pending` → `active` once its CNAME resolves.

## Reference IDs

- Cloudflare account: `4c5c204659aebe5d95a99b55a5a7d0b4`
- Pages project: `og-trades-pages`
- Latest deployment: `https://decc2897.og-trades-pages.pages.dev`
- `unalabs.cloud` zone: `68fc2deb79a7a99f58443b53adcc0505`
- `www.ogtradesacademy.com` domain attachment id: `364ce600-7ab5-40ac-b66b-d531ddd10696`
- `og.unalabs.cloud` domain attachment id: `c8b05b6a-77b1-4335-8249-73a4c138de36`

## What was changed in this session (code)

- `APPS/ftc-site/app/work/og-trades-academy/page.tsx`, `app/og-trades-academy/**/page.tsx`, `app/og-trades-academy-home/page.tsx`: removed `runtime = "edge"` and `dynamic = "force-dynamic"` so all OG pages pre-render statically.
- `APPS/ftc-site/app/components/og-trades/OgTradesHero.tsx`: removed `getRequestHost()` runtime call; replaced with build-time `OG_TRADES_SITE_URL` env constant.
- `APPS/ftc-site/scripts/fix-vercel-monorepo-output.mjs`: rewritten to assemble `.vercel/output/static` from Next.js 14 flat HTML output (`route.html` → `route/index.html`), copy `_next/static`, copy `public/`, place `og-trades-academy/index.html` as root `index.html`, and copy `_not-found.html` → `404.html`. Output: 202 files, ~24 MB.

## Recommendation

Take Path A right now. Send `https://og.unalabs.cloud/` to OG as a preview/staging link. Hold the `www.ogtradesacademy.com` cutover until the client password lands, then do Path B in one editor click — no rebuild, no redeploy needed.
