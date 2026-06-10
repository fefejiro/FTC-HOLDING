# CapSigma Growth Desk Production Handover

Status: production deployed in preview-send mode.

Production URL: https://capsigma-growth-desk.pages.dev

Latest smoke evidence: `ops/PRODUCTION-SMOKE-2026-06-10.json`

## What This Is

CapSigma Growth Desk is an operator-controlled outreach desk for real lead import, AI-assisted draft generation, human approval, SendGrid delivery, and durable proof logging.

Internal workflow name: CapSigma Outreach Agent.

## Production Readiness Checklist

- [x] No default fake production leads.
- [x] Admin login boundary.
- [x] Server-side D1 persistence model.
- [x] Real lead CSV import.
- [x] Server-owned OpenAI drafting prompt.
- [x] Human approval before send.
- [x] Placeholder email blocking.
- [x] SendGrid preview/sent/failed proof events.
- [x] Local unit validation.
- [x] Production client build.
- [x] Cloudflare D1 database created and real database_id added to wrangler.toml.
- [x] Cloudflare Pages secrets configured for auth, OpenAI, model, and sender identity.
- [x] Remote D1 migration applied.
- [ ] SendGrid API key configured.
- [ ] Verified sender/domain configured in SendGrid.
- [x] Production smoke test completed with one internal test lead.
- [ ] Client-provided real lead source connected or imported.

## Required Cloudflare Bindings

D1 binding:

```toml
[[d1_databases]]
binding = "CAPSIGMA_DB"
database_name = "capsigma-growth-desk"
database_id = "<real Cloudflare D1 database id>"
```

Secrets:

```text
ADMIN_PASSWORD
AUTH_SECRET
OPENAI_API_KEY
OPENAI_MODEL
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
SENDGRID_FROM_NAME
```

Current Cloudflare production secret state:

- Present: `ADMIN_PASSWORD`, `AUTH_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`
- Missing: `SENDGRID_API_KEY`

`SENDGRID_API_KEY` may be omitted for preview-only QA, but production handover is not complete until real SendGrid delivery is verified.

## Setup Commands

```powershell
cd "C:\FTC HOLDING\APPS\capsigma-growth-desk"
npm install
npm run check
npx wrangler d1 create capsigma-growth-desk
```

Paste the returned D1 `database_id` into `wrangler.toml`, then:

```powershell
npm run db:migrate:remote
npx wrangler pages secret put ADMIN_PASSWORD --project-name capsigma-growth-desk
npx wrangler pages secret put AUTH_SECRET --project-name capsigma-growth-desk
npx wrangler pages secret put OPENAI_API_KEY --project-name capsigma-growth-desk
npx wrangler pages secret put OPENAI_MODEL --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_API_KEY --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_FROM_EMAIL --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_FROM_NAME --project-name capsigma-growth-desk
npm run deploy
```

## Smoke Test

1. Open production URL.
2. Login with `ADMIN_PASSWORD`.
3. Confirm status chips show D1 and OpenAI ready.
4. Import one internal test lead with a real owned test email address.
5. Generate draft.
6. Edit and approve draft.
7. Send approved email.
8. Confirm Evidence tab records draft and send proof.
9. Confirm SendGrid activity shows delivery attempt.

## 2026-06-10 Production Smoke Result

- Base URL: `https://capsigma-growth-desk.pages.dev`
- Auth before login: false
- Auth after login: true
- D1 configured: true
- OpenAI configured: true
- SendGrid configured: false
- Imported internal test lead: true
- Draft created through OpenAI: true
- Draft approved: true
- Send result: `preview`
- Evidence events recorded: lead import, draft created, lead approved, preview saved

This proves the production workflow is live through preview proof. It does not prove real email delivery because `SENDGRID_API_KEY` is not configured yet.

## Data Policy

The app does not invent production leads. Lead rows must come from a real source such as client CSV, manual research, CRM export, Apollo, LinkedIn Sales Navigator export, or another approved vendor/source.

## Known Limitations

- Reply tracking is manual/status-based for now; inbound email webhook is not implemented.
- No multi-user roles yet; the current release is single-operator admin access.
- Compliance is basic transactional-provider outbound compliance, not a full cold-email compliance suite.
- Rate limiting should be added before broad campaign volume.
