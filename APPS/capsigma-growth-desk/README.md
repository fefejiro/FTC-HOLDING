# CapSigma Growth Desk

Operator-controlled growth desk for CapSigma lead import, AI-assisted outreach drafting, human approval, SendGrid sending, and durable proof logging on Cloudflare Pages Functions + D1.

Internal workflow name: **CapSigma Outreach Agent**.

## Local Development

```bash
cd APPS/capsigma-growth-desk
npm install
npm run db:migrate:local
npm run dev
```

For local Pages Functions testing, copy `.dev.vars.example` to `.dev.vars` and fill the values.

## Quality Checks

```bash
npm test
npm run build
npm run check
```

## Cloudflare Pages Deployment

This app deploys as a Cloudflare Pages site with Pages Functions, D1, OpenAI, and SendGrid.

### Create D1

```bash
cd APPS/capsigma-growth-desk
npx wrangler d1 create capsigma-growth-desk
```

Update `wrangler.toml` with the returned `database_id`, then apply migrations:

```bash
npm run db:migrate:remote
```

### Set Production Secrets

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name capsigma-growth-desk
npx wrangler pages secret put AUTH_SECRET --project-name capsigma-growth-desk
npx wrangler pages secret put OPENAI_API_KEY --project-name capsigma-growth-desk
npx wrangler pages secret put OPENAI_MODEL --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_API_KEY --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_FROM_EMAIL --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_FROM_NAME --project-name capsigma-growth-desk
npx wrangler pages secret put DAILY_SEND_LIMIT --project-name capsigma-growth-desk
```

### Deploy

```bash
npm run deploy
```

## What Is Included

- Admin login with signed HttpOnly session cookie
- CSV import for real leads
- D1-backed lead pipeline and proof ledger
- Server-owned OpenAI drafting route
- Human approval before send
- SendGrid delivery with preview/sent/failed proof events
- Placeholder email blocking
- Daily send limit guardrail
- Industry intelligence playbook

## Notes

- The app no longer ships with fake production leads.
- If `SENDGRID_API_KEY` is missing, sends are recorded as preview proof only.
- Production handover is not complete until D1, secrets, SendGrid sender verification, and a real internal smoke test pass.
- See `ops/PRODUCTION-HANDOVER.md` for the full checklist.
