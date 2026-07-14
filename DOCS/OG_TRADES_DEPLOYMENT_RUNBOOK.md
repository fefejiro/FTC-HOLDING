# OG Trades Academy Deployment Runbook

## Current owner decision (2026-07-14)

`https://www.ogtradesacademy.com/` is the approved live production URL. Do not change DNS, Cloudflare domain bindings, apex routing, or OG Trades connection settings. Older domain migration/cutover notes in this file are historical context only unless the owner explicitly requests domain work.

Current implementation source of truth is `APPS/ftc-site`; the standalone `APPS/og-trades-academy` folder is not the active implementation surface.

## Status (2026-04-24)

- ✅ Domain transferred: www.ogtradesacademy.com now points to og-trades-pages
- ✅ Project created: og-trades-pages on Cloudflare Pages
- ❌ Deployment: Pending (awaiting build + deploy)
- ✅ Code ready: All routes, API, and dependencies in place at APPS/og-trades-academy/

## Build Requirement

The og-trades-academy app uses `@cloudflare/next-on-pages` which requires **WSL or Linux** to build on Windows. Options:

### Option 1: Automated Deployment via GitHub Actions (Recommended)

1. Ensure Cloudflare API token and account ID are set as GitHub secrets:
   - `CLOUDFLARE_API_TOKEN` — OAuth token from https://dash.cloudflare.com/profile/api-tokens (scope: Account Pages)
   - `CLOUDFLARE_ACCOUNT_ID` — Found in Cloudflare dashboard URL

2. Workflow file is at: `.github/workflows/og-trades-deploy.yml`

3. Trigger deployment by pushing any change to `main` that touches `APPS/og-trades-academy/**` or the workflow file itself

4. Monitor at: https://github.com/fefejiro/FTC-HOLDING/actions

### Option 2: Manual Deployment from Linux

From a Linux machine or WSL terminal:

```bash
cd APPS/og-trades-academy
npm ci
npm run typecheck
npm run build
npx wrangler pages deploy .vercel/output/static --project-name og-trades-pages
```

Verify:
```bash
curl -I https://www.ogtradesacademy.com/
curl https://www.ogtradesacademy.com/ | grep -o '<title>.*</title>'
```

### Option 3: Enable WSL on Windows

```powershell
# In PowerShell as Administrator
wsl --install Ubuntu
```

Then use Option 2 from the WSL terminal.

## Manual CLI Commands (If needed)

### Extract Wrangler token for direct API calls
```powershell
$cfg = Join-Path $env:APPDATA 'xdg.config\.wrangler\config\default.toml'
$line = (Get-Content $cfg | Where-Object { $_ -like 'oauth_token*' } | Select-Object -First 1)
$tok = $line.Split('"')[1]
echo "Token: $tok"
```

### Deploy without GitHub Actions
```bash
# From Linux or WSL only
cd APPS/og-trades-academy
npm run build
npx wrangler deploy --name og-trades-pages .vercel/output/static
```

## Rollback

If deployment causes issues:

```bash
# Redeploy previous commit
git checkout HEAD~1 -- APPS/og-trades-academy/
npm run build
npx wrangler pages deploy .vercel/output/static --project-name og-trades-pages
```

## Next Steps

1. **Preserve domain:** Keep `https://www.ogtradesacademy.com/` as the approved live production URL.
2. **Lead QA:** Deploy the `public/_worker.js` lead-handler fix without DNS/domain changes, then verify production Supabase persistence for `POST /api/og-trades-leads`.
3. **Configuration:** Set webhook secrets only if OG wants additional delivery/notification automation:
   - `OG_TRADES_LEADS_WEBHOOK_URL`
   - `OG_TRADES_CONFIRMATION_WEBHOOK_URL`
4. **Link QA:** Browser-check checkout, Beacons, community, YouTube, TikTok, and Instagram links.
5. **Testimonials:** Collect only real approved testimonials; do not invent testimonials, student counts, profit claims, or financial-advice language.

## Testing Checklist

- [ ] Domain responds with HTTP 200
- [ ] Home page (`/`) loads without errors
- [ ] About page (`/about`) loads
- [ ] Course page (`/course`) loads
- [ ] Lead form validates honeypot correctly
- [ ] Lead submission persists to Supabase `og_trades_leads`
- [ ] Optional webhook delivery works if webhook secrets are configured
- [ ] Portfolio link at https://unalabs.cloud/work/og-trades-academy still works

## Monitoring

Once deployed, monitor:
- Cloudflare Pages dashboard: https://dash.cloudflare.com/pages
- Errors: Check worker logs via `npx wrangler pages deployment list --project-name og-trades-pages`
- Domain status: Check DNS propagation at https://dns.google/
