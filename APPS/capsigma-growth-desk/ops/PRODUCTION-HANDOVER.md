# CapSigma Growth Desk Production Handover

Status: production deployed with verified SendGrid sending. Current operating
mode is Fejiro sandbox auto-outreach: real prospect context, real SendGrid
delivery, actual delivery to `fejiro.efiuvwere@gmail.com`, and intended
recipient preserved in proof. No-DNS live handover is available after the client
verifies `hello@capsigma.com` in SendGrid.

Production URL: https://capsigma-growth-desk.pages.dev

Preferred client URL: https://growth.capsigma.com

Custom domain status: added to Cloudflare Pages and pending DNS. `capsigma.com`
currently uses Google nameservers, so add this DNS record at the DNS host:

```text
Type: CNAME
Host: growth
Value: capsigma-growth-desk.pages.dev
TTL: default or 300
```

Latest smoke evidence: `ops/PRODUCTION-SMOKE-2026-06-10T16-19-21-154Z.json`

Latest full live outreach proof: `ops/LIVE-E2E-HARRIS-HEALTH-CORRECTED-2026-06-10T17-16-56Z.json`

Latest actual external outreach proof: `ops/LIVE-E2E-HARRIS-HEALTH-ACTUAL-2026-06-10T17-37-48Z.json`

Latest recipient delivery proof: `ops/RECIPIENT-TEST-2026-06-11T17-04-35-361Z.json`

Latest Gmail delivery check: `ops/GMAIL-DELIVERY-CHECK-2026-06-11.md`

Latest Gmail reply monitor evidence:

- `ops/GMAIL-REPLY-MONITOR-2026-06-14.md`
- `ops/SCHEDULED-REPLY-SYNC-2026-06-14.md`

Latest SendGrid domain-auth evidence:

- `ops/SENDGRID-DOMAIN-AUTH-2026-06-11T17-26-42Z.json`
- `ops/SENDGRID-DOMAIN-VALIDATION-2026-06-11T17-29-28Z.json`
- `ops/SENDGRID-DNS-RECORDS-2026-06-11.md`

No-DNS handover guide:

- `ops/NO-DNS-CLIENT-HANDOVER.md`

## What This Is

CapSigma Growth Desk is an operator-controlled outreach desk for source-backed
prospect discovery, AI-assisted draft generation, eligibility-gated auto-send,
SendGrid delivery, reply attention, and durable proof logging.

Internal workflow name: CapSigma Outreach Agent.

## Production Readiness Checklist

- [x] No default fake production leads.
- [x] Admin login boundary.
- [x] Server-side D1 persistence model.
- [x] Real lead CSV import.
- [x] Source-backed Prospect Builder.
- [x] Server-owned OpenAI drafting prompt.
- [x] Eligibility-gated auto-send for matching prospects.
- [x] Fejiro sandbox recipient override.
- [x] Placeholder email blocking.
- [x] SendGrid needs_review/sandbox_sent/live_sent/failed proof events.
- [x] Local unit validation.
- [x] Production client build.
- [x] Cloudflare D1 database created and real database_id added to wrangler.toml.
- [x] Cloudflare Pages secrets configured for auth, OpenAI, model, and sender identity.
- [x] Remote D1 migration applied.
- [x] SendGrid API key configured.
- [x] Verified sender configured in SendGrid.
- [x] Production smoke test completed with one internal test lead.
- [x] Gmail reply monitor routes added with encrypted mailbox token storage.
- [x] Existing Job Reply Agent Gmail token import command added.
- [x] Local loopback Gmail connector added for the current Google redirect allow-list mismatch.
- [x] Local Windows scheduled reply sync registered and verified.
- [x] GitHub Actions scheduled reply sync added; activates after merge to `main`.
- [x] No-DNS client handover path documented.
- [x] SendGrid authenticated domain created for `capsigma.com`.
- [ ] Client clicks the SendGrid verification email for `hello@capsigma.com`.
- [ ] Production From/Reply-To switched to `hello@capsigma.com`.
- [ ] `OUTBOUND_RECIPIENT_OVERRIDE` removed after sandbox approval.
- [ ] Recipient/Gmail placement rechecked after `hello@capsigma.com` verification.
- [ ] Optional: SendGrid DNS records added at the `capsigma.com` DNS host.
- [ ] Optional: SendGrid domain authentication validated.
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
OPENAI_PROSPECT_MODEL
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
SENDGRID_FROM_NAME
SENDGRID_REPLY_TO_EMAIL
SENDGRID_REPLY_TO_NAME
SENDGRID_CC_EMAILS
OUTBOUND_RECIPIENT_OVERRIDE
AUTO_SEND_MIN_FIT_SCORE
DAILY_SEND_LIMIT
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REDIRECT_URI
TOKEN_ENCRYPTION_KEY
REPLY_SYNC_TOKEN
```

GitHub Actions secrets:

```text
CAPSIGMA_REPLY_SYNC_TOKEN
```

Current Cloudflare production secret state:

- Cloudflare present: `ADMIN_PASSWORD`, `AUTH_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_PROSPECT_MODEL`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `SENDGRID_REPLY_TO_EMAIL`, `SENDGRID_REPLY_TO_NAME`, `SENDGRID_CC_EMAILS`, `OUTBOUND_RECIPIENT_OVERRIDE`, `AUTO_SEND_MIN_FIT_SCORE`, `DAILY_SEND_LIMIT`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, `REPLY_SYNC_TOKEN`
- GitHub present: `CAPSIGMA_REPLY_SYNC_TOKEN`
- Missing: none for current production smoke.

Current verified sender: `fejiro.efiuvwere@gmail.com`
Current reply-to/contact address: `fejiro.efiuvwere@gmail.com`
Current actual recipient override: `fejiro.efiuvwere@gmail.com`
Current proof-copy CC address: `fejiro.efiuvwere@gmail.com`
Pending preferred sender: `hello@capsigma.com` as the visible `From` address.
Pending authenticated domain id: `31406421`

Recommended no-DNS handover path: client verifies the `hello@capsigma.com`
Single Sender request in SendGrid by clicking the verification email. After
that, production can switch the visible From/Reply-To address to
`hello@capsigma.com` and remove `OUTBOUND_RECIPIENT_OVERRIDE`. Until then,
SendGrid sends from the verified Gmail sender and routes all actual sandbox
delivery to Fejiro while preserving intended recipients in proof.

Optional DNS records for stronger domain authentication are documented in:

```text
ops/SENDGRID-DNS-RECORDS-2026-06-11.md
```

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
npx wrangler pages secret put OPENAI_PROSPECT_MODEL --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_API_KEY --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_FROM_EMAIL --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_FROM_NAME --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_REPLY_TO_EMAIL --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_REPLY_TO_NAME --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_CC_EMAILS --project-name capsigma-growth-desk
npx wrangler pages secret put OUTBOUND_RECIPIENT_OVERRIDE --project-name capsigma-growth-desk
npx wrangler pages secret put AUTO_SEND_MIN_FIT_SCORE --project-name capsigma-growth-desk
npx wrangler pages secret put GMAIL_CLIENT_ID --project-name capsigma-growth-desk
npx wrangler pages secret put GMAIL_CLIENT_SECRET --project-name capsigma-growth-desk
npx wrangler pages secret put GMAIL_REDIRECT_URI --project-name capsigma-growth-desk
npx wrangler pages secret put TOKEN_ENCRYPTION_KEY --project-name capsigma-growth-desk
npx wrangler pages secret put REPLY_SYNC_TOKEN --project-name capsigma-growth-desk
npx wrangler pages secret put DAILY_SEND_LIMIT --project-name capsigma-growth-desk
npm run deploy
```

Safer SendGrid key upload:

```powershell
Set-Content -LiteralPath .local\sendgrid-api-key.txt -Value "<paste SendGrid API key>" -NoNewline
npm run sendgrid:set-secret
npm run prod:doctor
```

## Smoke Test

1. Open production URL.
2. Login with `ADMIN_PASSWORD`.
3. Confirm status chips show D1 and OpenAI ready.
4. Import one internal test lead with a real owned test email address or run Prospect Builder.
5. Generate draft.
6. Send eligible prospect through sandbox mode.
8. Confirm Evidence tab records draft and send proof.
9. Confirm Sent Review shows intended recipient and actual Fejiro recipient.
10. Confirm SendGrid activity shows delivery attempt.

## Client Operator Workflow

1. Open the production URL.
2. Sign in with the admin password.
3. Run Prospect Builder or import a CSV of real, verified prospects.
4. Confirm each prospect has a real company, source, business reason, contact,
   and email address.
5. Use Review Queue.
6. Swipe right/click send for eligible matches.
7. Swipe left/click edit for prospects that need review.
8. Confirm the Sent Review tab shows exact sent body, SendGrid provider id,
   prospect background, source link, intended recipient, actual recipient, and
   proof-copy CC routing.
9. Use Replies for human-attention messages after reply sync/import.

For client use, this is currently a single-operator agent/app, not a multi-tenant
self-serve SaaS. A client can use it by receiving the production URL, admin
password, CSV template, and operating rules. For multiple client companies,
create a separate Cloudflare Pages project, D1 database, SendGrid sender/domain,
and admin password per client so data and proof ledgers stay isolated.

If the client does not want to involve DNS, use the no-DNS handover path in:

```text
ops/NO-DNS-CLIENT-HANDOVER.md
```

## 2026-06-10 Production Smoke Result

- Base URL: `https://capsigma-growth-desk.pages.dev`
- Auth before login: false
- Auth after login: true
- D1 configured: true
- OpenAI configured: true
- SendGrid configured: true
- From email: `fejiro.efiuvwere@gmail.com`
- Daily send limit: 25
- Imported internal test lead: true
- Draft created through OpenAI: true
- Draft approved: true
- Send result: `sent`
- Evidence events recorded: lead import, draft created, lead approved, send sent
- Daily send limit guardrail: default 25 real sends/day

This proves the production workflow is live through real SendGrid delivery proof.

## 2026-06-10 Full Live Outreach Test

- Target researched: Harris Health System
- Test recipient override: `fejiro.efiuvwere@gmail.com`
- Lead imported: true
- Public-source fit score: 94
- AI draft generated: true
- Placeholder scan passed: true
- Human approval gate passed: true
- Send result: `sent`
- Provider message id: `oUnpzWdHR36VdykQVErZXA`
- Evidence events recorded: lead import, draft created, lead approved, send sent
- Report: `ops/LIVE-E2E-HARRIS-HEALTH-CORRECTED-2026-06-10T17-16-56Z.json`

Note: this test used operator-curated public-source research as the lead input. Autonomous web scraping/import should be added before promising unattended prospect discovery.

## 2026-06-10 Actual External Harris Send

- Target: Harris Health System
- Recipient: `Victoria.Nikitin@harrishealth.org`
- Contact: Victoria Nikitin, MBA, CPA, FHFMA - Executive Vice President and Chief Financial Officer
- Fit score: 94
- Subject: `Enhancing Revenue Cycle and Eligibility Workflows`
- Send result: `sent`
- Provider message id: `DJmp-svrSZewc8NNPWwNLg`
- Sent Review tab: available in app with full sent body, background, source, provider id, and proof status.
- Report: `ops/LIVE-E2E-HARRIS-HEALTH-ACTUAL-2026-06-10T17-37-48Z.json`

Repeatable commands:

```powershell
npm run prod:doctor
npm run prod:smoke
npm run prod:test-recipients
npm run gmail:import-job-token
npm run gmail:connect-local
npm run prod:sync-replies
npm run prod:doctor
npm run sendgrid:domain-status
```

## 2026-06-11 Recipient Delivery Test

- Base URL: `https://capsigma-growth-desk.pages.dev`
- D1 configured: true
- OpenAI configured: true
- SendGrid configured: true
- From email: `fejiro.efiuvwere@gmail.com`
- Reply-to/contact email: `sales@capsigma.com`
- Proof-copy CC email: `fejiro.efiuvwere@gmail.com`
- Daily send limit: 25
- Recipient 1: `sales@capsigma.com`
- Recipient 1 result: `sent`
- Recipient 1 provider message id: `V69LWW5XR2WmEcll2VTjMA`
- Recipient 1 CC: `fejiro.efiuvwere@gmail.com`
- Recipient 2: `fejiro.efiuvwere@gmail.com`
- Recipient 2 result: `sent`
- Recipient 2 provider message id: `g8Ol3awGSwiX7S7_sWyz1A`
- Recipient 2 CC: none, because duplicate Fejiro CC is removed when Fejiro is
  the direct recipient.
- Sent Review verified: both sent bodies are stored with provider proof and a
  footer contact address of `sales@capsigma.com`.
- Gmail mailbox check: Fejiro received the message, but Gmail labeled the
  current Gmail-sender test messages as spam. This is a deliverability warning
  and should be resolved with SendGrid sender/domain authentication before
  broad client outreach.
- Report: `ops/RECIPIENT-TEST-2026-06-11T17-04-35-361Z.json`

## Data Policy

The app must not invent production leads. Prospects must come from public
source-backed web research, client CSV, manual research, CRM export, Apollo,
LinkedIn Sales Navigator export, or another approved vendor/source.

## Known Limitations

- Gmail reply monitoring is implemented for the sandbox mailbox through encrypted token storage. The production OAuth callback still needs Google Console redirect allow-listing; until then, use `npm run gmail:connect-local`.
- Outlook OAuth polling is not implemented.
- No multi-user roles yet; the current release is single-operator admin access.
- Compliance is basic transactional-provider outbound compliance, not a full cold-email compliance suite.
- Rate limiting should be added before broad campaign volume.
