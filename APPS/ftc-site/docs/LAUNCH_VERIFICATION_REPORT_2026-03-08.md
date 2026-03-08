# FTC Launch Verification Report (2026-03-08)

## Scope

- Canonical/domain launch checks for `ftc.peacepad.ca`
- DNS/TLS reachability checks
- API/mail regression checks

## Results

### 1) Build and route tests (local)

- `npm --workspace=@ftc/ftc-site run build`: pass
- `npm --workspace=@ftc/ftc-site run test:e2e`: pass

### 2) DNS checks (public)

- `Resolve-DnsName ftc.peacepad.ca`: resolves to Cloudflare edge A/AAAA
- `Resolve-DnsName -Type MX peacepad.ca`: unchanged (`smtp.google.com`)
- `Resolve-DnsName -Type TXT peacepad.ca`: unchanged SPF + verification TXT records

### 3) HTTPS checks (public)

- `curl -I https://ftc.peacepad.ca`: responds `403` from Cloudflare edge
- `curl -I https://api.peacepad.ca/health`: responds `200 OK` (unchanged API health)

### 4) Pages target checks

- `curl -I https://ftc-site.pages.dev`: **does not resolve**
- `curl -I https://ftc-holding.pages.dev`: `200 OK`
- Wrangler pages project list currently shows `ftc-holding` project/domain set, not `ftc-site`

## Blocker

`ftc.peacepad.ca` currently points to `ftc-site.pages.dev`, but that target is not resolvable publicly.  
This blocks successful custom-domain serving and explains the Cloudflare `403`.

## Required remediation before go-live

Choose one valid path and keep records stable otherwise:

1. Point `ftc` CNAME to active Pages project domain (`ftc-holding.pages.dev`) **or**
2. Create/restore a Pages project whose default domain is `ftc-site.pages.dev` and bind `ftc.peacepad.ca`.

After remediation:

- Verify `https://ftc.peacepad.ca` returns `200`
- Verify certificate is Active in Cloudflare Pages custom domain panel
- Verify canonical redirect behavior from pages.dev host after deploy

## Regression status

- `api.peacepad.ca` remains healthy (`200`)
- MX/TXT/DKIM/SPF surface for `peacepad.ca` unchanged in verification sample

