# OG Trades Academy Domain State Backup

Date: 2026-04-09

## Scope

- Target branded domain: `ogtradesacademy.com`
- Current branded experience URL: `https://unalabs.cloud/og-trades-academy`
- Goal: determine whether `ogtradesacademy.com` can serve the OG Trades Academy experience directly on the same app, without exposing the `/og-trades-academy` path

## Repo And Hosting Snapshot

- App: [`APPS/ftc-site`](/c:/FTC%20HOLDING/APPS/ftc-site)
- Framework: Next.js 14 app router
- Edge/runtime platform: Cloudflare Pages
- Pages config: [`APPS/ftc-site/wrangler.toml`](/c:/FTC%20HOLDING/APPS/ftc-site/wrangler.toml)
- Runtime routing layer: [`APPS/ftc-site/middleware.ts`](/c:/FTC%20HOLDING/APPS/ftc-site/middleware.ts)
- OG Trades content root: [`APPS/ftc-site/app/og-trades-academy`](/c:/FTC%20HOLDING/APPS/ftc-site/app/og-trades-academy)
- OG Trades helpers: [`APPS/ftc-site/lib/ogTradesAcademy.ts`](/c:/FTC%20HOLDING/APPS/ftc-site/lib/ogTradesAcademy.ts)

## Cloudflare Pages Project Snapshot

Command:

```powershell
npx wrangler pages project list
```

Observed project:

- Project: `ftc-site-pages`
- Domains: `ftc-site-pages.pages.dev`, `ftc.peacepad.ca`, `unalabs.cloud`, `www.unalabs.cloud`
- Git provider: `Yes`

Implication:

- `unalabs.cloud` is already live on Cloudflare Pages
- `ogtradesacademy.com` is not currently attached to the Pages project

## Public DNS Snapshot

Commands:

```powershell
Resolve-DnsName ogtradesacademy.com -Type NS
Resolve-DnsName ogtradesacademy.com -Type A
Resolve-DnsName www.ogtradesacademy.com -Type CNAME
Resolve-DnsName ogtradesacademy.com -Type MX
Resolve-DnsName ogtradesacademy.com -Type TXT
Resolve-DnsName google._domainkey.ogtradesacademy.com -Type TXT
```

Observed nameservers:

- `ns-cloud-b1.googledomains.com`
- `ns-cloud-b2.googledomains.com`
- `ns-cloud-b3.googledomains.com`
- `ns-cloud-b4.googledomains.com`

Observed website records:

```text
A     @    198.185.159.145
A     @    198.49.23.145
A     @    198.49.23.144
A     @    198.185.159.144
CNAME www  ext-sq.squarespace.com
```

Observed Google Workspace records:

```text
MX    @                 1 smtp.google.com
TXT   @                 v=spf1 include:_spf.google.com ~all
TXT   google._domainkey v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnCdkR9ljDIkIlQNWBHVHIlOv7sILbIc5jIAhnvXfcuorfe3lvw2kWqUjDswH5lOFlryFWNNkp6LXjOCWU8onHXPWvW9eTDE+ohgcsqD6Rcu96r8JK7ZPHfhbVTmZuQWRNsPyFhkmo8T6LlnZS6HH+RvXp0Fv0C6kkIgfYX3AOz5k9Gh0bELC78eqgdzelKi3aeXhrktJaFbz8bYQ9XX2bAxEdKwz8j5RDQErK0sUbrGm80poBKAAP7rxhwYlnOMZ/ENY7A7BQABvZxz+gCJg6jxGzy2PK+9MrJrMRo0MbJEWEdMMgosDwH9zGK6BRV+H8Lo/CFMjxLsSuLHdorY0twIDAQAB
```

Observed missing record:

- No public `_dmarc.ogtradesacademy.com TXT` record was found at time of inspection

## Current Live Behavior

Commands:

```powershell
curl.exe -I https://ogtradesacademy.com/
curl.exe -I https://www.ogtradesacademy.com/
curl.exe -I https://unalabs.cloud/og-trades-academy/community
```

Observed responses:

- `https://ogtradesacademy.com/` -> `200` from `Squarespace`
- `https://www.ogtradesacademy.com/` -> `200` from `Squarespace`
- `https://unalabs.cloud/og-trades-academy/community` -> `200` from `cloudflare`

## Squarespace UI Snapshot From User

The user-provided Squarespace screenshots showed:

- domain present in Squarespace account: `ogtradesacademy.com`
- DNS settings page warning: domain managed by Google Workspace
- same website records shown in Squarespace UI as the public DNS snapshot above

## Architecture Conclusion At Backup Time

- The OG Trades Academy experience is already implemented as part of the Cloudflare Pages-hosted Next.js site
- The app can be made host-aware so the same experience renders directly on `ogtradesacademy.com`
- The remaining cutover challenge is not app rendering, but custom-domain attachment and DNS authority
