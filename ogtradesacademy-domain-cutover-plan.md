# OG Trades Academy Domain Cutover Plan

## What Was Changed

- Added host-aware OG Trades routing so the same app can serve branded paths on a custom host and still keep `/og-trades-academy/*` working on `unalabs.cloud`
- Added branded-path rewrites and redirects in [`APPS/ftc-site/middleware.ts`](/c:/FTC%20HOLDING/APPS/ftc-site/middleware.ts)
- Added OG Trades host helpers and metadata helpers in [`APPS/ftc-site/lib/ogTradesAcademy.ts`](/c:/FTC%20HOLDING/APPS/ftc-site/lib/ogTradesAcademy.ts)
- Updated OG Trades pages, navigation, `robots.txt`, and `sitemap.xml` so canonical URLs, nav links, icons, Open Graph tags, and Twitter tags all work correctly on both:
  - `https://unalabs.cloud/og-trades-academy/...`
  - `https://www.ogtradesacademy.com/...`
- Added target custom-domain env values in [`APPS/ftc-site/wrangler.toml`](/c:/FTC%20HOLDING/APPS/ftc-site/wrangler.toml)

## Whether True Custom-Domain Support Was Achieved

Application-level support: yes.

- The site code now supports true branded host behavior.
- The canonical branded host is configurable through `OG_TRADES_SITE_URL`.
- In the current safe fallback configuration, the canonical branded host is `https://www.ogtradesacademy.com`.
- Local verification proved that `Host: www.ogtradesacademy.com` serves the OG Trades Academy experience directly at `/`, `/community`, `/course`, `/resources`, `/about`, and `/contact`.
- Local verification also proved that:
  - `Host: ogtradesacademy.com` redirects to `https://www.ogtradesacademy.com`
  - `Host: www.ogtradesacademy.com` redirects `/og-trades-academy/...` back to clean branded URLs

Production apex cutover on the current DNS model: no.

Blocker:

- `ogtradesacademy.com` is not a Cloudflare zone right now.
- Public DNS is authoritative on Google-managed nameservers, not Cloudflare.
- Cloudflare custom domains for Workers and apex hostnames require an active Cloudflare zone.
- That means `ogtradesacademy.com` cannot be attached as a true apex Cloudflare Pages hostname unless DNS authority is moved to Cloudflare first.

Official references:

- Cloudflare custom domains require an active Cloudflare zone:
  - https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Cloudflare Pages subdomain custom domains can be set up with DNS changes, but branch and custom-domain routing behavior depends on proxied Cloudflare DNS:
  - https://developers.cloudflare.com/pages/how-to/custom-branch-aliases/

## Recommended Path

Recommended now:

1. Ship the code changes to the existing `ftc-site-pages` project.
2. Use `www.ogtradesacademy.com` as the true Cloudflare Pages custom host.
3. Forward apex `ogtradesacademy.com` to `https://www.ogtradesacademy.com` from the current DNS/registrar side.

Why this is the safest low-cost path:

- No mail migration is required.
- Google Workspace records stay where they are.
- `www` can be pointed at Cloudflare Pages with a single CNAME change.
- Apex redirect keeps the brand usable immediately.

If you later want true apex hosting with no redirect:

1. Add `ogtradesacademy.com` as a full Cloudflare zone.
2. Recreate all current mail records in Cloudflare DNS first.
3. Change nameservers to Cloudflare.
4. Add both `ogtradesacademy.com` and `www.ogtradesacademy.com` as Pages custom domains.

## Exact DNS Delta

### Recommended fallback cutover: `www` on Cloudflare Pages, apex 301 to `www`

Records to remove:

```text
A     @    198.185.159.145
A     @    198.49.23.145
A     @    198.49.23.144
A     @    198.185.159.144
CNAME www  ext-sq.squarespace.com
```

Records to add:

```text
CNAME www  ftc-site-pages.pages.dev
```

Configuration to add outside DNS:

```text
Squarespace / registrar forwarding:
  ogtradesacademy.com  ->  https://www.ogtradesacademy.com
  type: 301 permanent redirect
  preserve path: on
  preserve query string: on
  SSL / HTTPS forwarding: on
```

Records to leave untouched:

```text
MX    @                 1 smtp.google.com
TXT   @                 v=spf1 include:_spf.google.com ~all
TXT   google._domainkey v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnCdkR9ljDIkIlQNWBHVHIlOv7sILbIc5jIAhnvXfcuorfe3lvw2kWqUjDswH5lOFlryFWNNkp6LXjOCWU8onHXPWvW9eTDE+ohgcsqD6Rcu96r8JK7ZPHfhbVTmZuQWRNsPyFhkmo8T6LlnZS6HH+RvXp0Fv0C6kkIgfYX3AOz5k9Gh0bELC78eqgdzelKi3aeXhrktJaFbz8bYQ9XX2bAxEdKwz8j5RDQErK0sUbrGm80poBKAAP7rxhwYlnOMZ/ENY7A7BQABvZxz+gCJg6jxGzy2PK+9MrJrMRo0MbJEWEdMMgosDwH9zGK6BRV+H8Lo/CFMjxLsSuLHdorY0twIDAQAB
NS    @                 ns-cloud-b1.googledomains.com
NS    @                 ns-cloud-b2.googledomains.com
NS    @                 ns-cloud-b3.googledomains.com
NS    @                 ns-cloud-b4.googledomains.com
```

Do not change:

- MX
- SPF
- DKIM
- any Google verification TXT records if you see them in the UI
- any future DMARC record if it gets added later

### True apex cutover plan: only if you are willing to move DNS authority to Cloudflare

Records to recreate in Cloudflare before nameserver cutover:

```text
MX    @                 1 smtp.google.com
TXT   @                 v=spf1 include:_spf.google.com ~all
TXT   google._domainkey v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnCdkR9ljDIkIlQNWBHVHIlOv7sILbIc5jIAhnvXfcuorfe3lvw2kWqUjDswH5lOFlryFWNNkp6LXjOCWU8onHXPWvW9eTDE+ohgcsqD6Rcu96r8JK7ZPHfhbVTmZuQWRNsPyFhkmo8T6LlnZS6HH+RvXp0Fv0C6kkIgfYX3AOz5k9Gh0bELC78eqgdzelKi3aeXhrktJaFbz8bYQ9XX2bAxEdKwz8j5RDQErK0sUbrGm80poBKAAP7rxhwYlnOMZ/ENY7A7BQABvZxz+gCJg6jxGzy2PK+9MrJrMRo0MbJEWEdMMgosDwH9zGK6BRV+H8Lo/CFMjxLsSuLHdorY0twIDAQAB
```

Then add website records in Cloudflare:

```text
CNAME @    ftc-site-pages.pages.dev   proxied
CNAME www  ogtradesacademy.com        proxied
```

Note:

- Do not perform this nameserver move unless you are ready to recreate every current mail and verification record in Cloudflare first.

## Rollback Steps

If you use the recommended fallback path and need to roll back:

1. Remove `CNAME www -> ftc-site-pages.pages.dev`.
2. Restore:
   - `A @ -> 198.185.159.145`
   - `A @ -> 198.49.23.145`
   - `A @ -> 198.49.23.144`
   - `A @ -> 198.185.159.144`
   - `CNAME www -> ext-sq.squarespace.com`
3. Disable the apex forwarding rule to `https://www.ogtradesacademy.com`.
4. Confirm `https://ogtradesacademy.com/` and `https://www.ogtradesacademy.com/` are back on Squarespace.

## Validation Checklist After Cutover

For the recommended fallback path:

1. `curl -I https://www.ogtradesacademy.com/` returns `200` from Cloudflare.
2. `curl -I https://www.ogtradesacademy.com/community` returns `200`.
3. `curl -I https://ogtradesacademy.com/` returns `301` or `308` to `https://www.ogtradesacademy.com/`.
4. `curl -I https://ogtradesacademy.com/community` redirects to `https://www.ogtradesacademy.com/community`.
5. `curl https://www.ogtradesacademy.com/robots.txt` shows:
   - `Host: https://www.ogtradesacademy.com`
   - `Sitemap: https://www.ogtradesacademy.com/sitemap.xml`
6. `curl https://www.ogtradesacademy.com/sitemap.xml` lists branded URLs only.
7. Browser-check:
   - home page loads directly
   - nav links stay on branded paths
   - `/community`, `/course`, and `/contact` load cleanly
   - favicon is OG Trades branded
   - Open Graph and Twitter metadata no longer show Una Labs
8. Mail check:
   - sending and receiving on the Google Workspace inbox still works

## Local Verification Completed In This Pass

- `npm.cmd run build` in `APPS/ftc-site`: pass
- `curl -H "Host: www.ogtradesacademy.com" http://127.0.0.1:3001/community`: pass
- `curl -H "Host: www.ogtradesacademy.com" http://127.0.0.1:3001/robots.txt`: pass
- `curl -H "Host: www.ogtradesacademy.com" http://127.0.0.1:3001/sitemap.xml`: pass
- `curl -H "Host: ogtradesacademy.com" http://127.0.0.1:3001/community`: `308` to `https://www.ogtradesacademy.com/community`
- `curl -H "Host: www.ogtradesacademy.com" http://127.0.0.1:3001/og-trades-academy/community`: `308` to `/community`
- `curl -H "Host: unalabs.cloud" http://127.0.0.1:3001/og-trades-academy/community`: pass

## Deployment Status

- Code changes are ready for Cloudflare Pages.
- Local build is passing.
- A production deploy was not completed from this shell because the Pages packaging step `npx @cloudflare/next-on-pages@1` hangs on this Windows machine while spawning the Vercel build pipeline.
- The app-level solution is still valid; the deploy blocker is local tooling, not the routing implementation.
