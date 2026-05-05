# OG Trades Academy

**Status:** HOLD — domain and webhook URLs pending confirmation  
**Live URL:** [www.ogtradesacademy.com](https://www.ogtradesacademy.com)  
**Deploy target:** Cloudflare Pages project `og-trades-pages`

---

## Important: Source code location

The OG Trades Academy pages and API routes live inside `APPS/ftc-site`, not in this folder.

```
APPS/ftc-site/app/og-trades-academy/   ← public pages (about, contact, course, resources, community)
APPS/ftc-site/app/api/og-trades/       ← lead capture API route (if present)
```

This `APPS/og-trades-academy/` directory exists only as a Cloudflare Pages deploy trigger. The `.deploy-trigger` file can be updated to force a re-deploy when no ftc-site code changed.

---

## Deployment

OG Trades is deployed from `APPS/ftc-site` by the CI workflow at `.github/workflows/og-trades-deploy.yml`.

Trigger: any push to `main` that touches `APPS/ftc-site/**`.

To force a re-deploy without a code change, update the timestamp in `.deploy-trigger` and push.

Manual deploy from Linux/WSL:

```bash
cd APPS/ftc-site
npm ci
npm run build
npx wrangler pages deploy .vercel/output/static --project-name og-trades-pages
```

Full deployment runbook: `DOCS/OG_TRADES_DEPLOYMENT_RUNBOOK.md`

---

## Production checklist

- [ ] Domain `www.ogtradesacademy.com` resolves to Cloudflare Pages
- [ ] `curl -I https://www.ogtradesacademy.com/` returns 200
- [ ] Lead capture form posts successfully
- [ ] Canonical URLs confirmed with owner

---

## Related docs

- `DOCS/OG_TRADES_DEPLOYMENT_RUNBOOK.md` — full deploy steps
- `DOCS/COPILOT_OG_TRADES_HANDOVER_2026-05-01.md` — agent context
- `DOCS/OGTRADESACADEMY_DOMAIN_CUTOVER_STATUS_2026-04-25.md` — domain history
