# CapSigma Growth Desk Turnkey Handover Status - 2026-06-15

Production URL:

```text
https://capsigma-growth-desk.pages.dev
```

Client-facing name:

```text
CapSigma Growth Desk
```

Internal workflow name:

```text
CapSigma Outreach Agent
```

## Current Mode

Status: production sandbox, ready for controlled client review.

The app uses real public prospect research, real AI draft generation, real
SendGrid delivery, real proof logging, and real Gmail reply monitoring.

Current safety mode:

- From: `fejiro.efiuvwere@gmail.com`
- Reply-To: `fejiro.efiuvwere@gmail.com`
- Actual outbound recipient override: `fejiro.efiuvwere@gmail.com`
- Intended prospect recipient: preserved in proof
- Daily send limit: `25`

This means outbound tests use real prospect context but land only in Fejiro's
inbox until Mike approves quality and the client verifies `hello@capsigma.com`.

## Green

- Production app deployed on Cloudflare Pages.
- Admin login is enabled.
- D1 proof ledger is configured.
- OpenAI prospect research/drafting is configured.
- SendGrid sending is configured.
- Prospect Builder creates source-backed prospects.
- Eligibility-gated auto-send works for matching prospects.
- Invalid, placeholder, low-fit, source-less, or suppressed prospects are blocked.
- Sent Review records intended recipient, actual recipient, provider id, source,
  background, subject, and body.
- Gmail reply monitoring is connected to `fejiro.efiuvwere@gmail.com`.
- Reply sync runs from the Windows scheduled task every 30 minutes.
- GitHub Actions reply-sync workflow is committed and ready to activate after
  merge to `main`.
- Local scheduled reports now write under `.local/reply-sync-reports/` so the
  repo does not get dirtied every 30 minutes.
- `npm run check` passes with 14/14 tests.
- `npm run prod:doctor` passes with no warnings.
- Production sandbox E2E passed against the live URL after deploy.
- Recipient routing proof passed for `sales@capsigma.com` and
  `fejiro.efiuvwere@gmail.com`.
- Outreach email report is available through `npm run prod:email-report` and
  sends a client/prospect/body/follow-up digest to Fejiro.
- Draft quality now blocks HIPAA wording outside healthcare/medical prospect
  context.

## Yellow

- Live client sender is still pending `hello@capsigma.com` SendGrid Single Sender
  verification.
- Broad live outreach should not start until `OUTBOUND_RECIPIENT_OVERRIDE` is
  removed after Mike approves sandbox quality.
- Inbox placement can still vary because sender/domain reputation is controlled
  by mailbox providers.
- Full domain authentication for `capsigma.com` is optional but recommended for
  better deliverability.
- Current app is single-operator, not multi-tenant SaaS.
- Outlook OAuth polling is not implemented; Gmail monitoring is implemented.

## Final Live Switch

After the client verifies `hello@capsigma.com` in SendGrid:

```text
SENDGRID_FROM_EMAIL=hello@capsigma.com
SENDGRID_FROM_NAME=CapSigma
SENDGRID_REPLY_TO_EMAIL=hello@capsigma.com
SENDGRID_REPLY_TO_NAME=CapSigma
SENDGRID_CC_EMAILS=fejiro.efiuvwere@gmail.com
```

Then remove:

```text
OUTBOUND_RECIPIENT_OVERRIDE
```

Run:

```powershell
npm run prod:doctor
npm run prod:test-recipients
npm run prod:sync-replies
```

Acceptance for live handover:

- `prod:doctor` has no failures or warnings.
- A controlled send to `hello@capsigma.com` has a SendGrid provider id.
- Fejiro receives proof copy when expected.
- Sent Review shows intended vs actual recipient correctly.
- Replies tab shows synced human-attention replies.

## Operator Flow

1. Open the production URL.
2. Sign in with the admin password.
3. Use Prospect Builder to create source-backed prospects.
4. Let eligible matches auto-send in sandbox or live mode.
5. Review Sent Review for body, source, provider id, and recipient proof.
6. Review Replies for human-attention messages.
7. Run `npm run prod:email-report` to email an operator digest to Fejiro.

## Latest Evidence

- `ops/PRODUCTION-E2E-SANDBOX-2026-06-15T16-11-34-738Z.json`
- `ops/RECIPIENT-TEST-2026-06-15T16-57-42-504Z.json`
- `ops/CAPSIGMA-OUTREACH-EMAIL-REPORT-2026-06-15T17-28-47-549Z.json`
- `ops/CAPSIGMA-OUTREACH-EMAIL-REPORT-2026-06-15T17-28-47-549Z.md`
- `ops/AUTO-OUTREACH-EVIDENCE-2026-06-14.md`
- `ops/GMAIL-REPLY-MONITOR-2026-06-14.md`
- `ops/SCHEDULED-REPLY-SYNC-2026-06-14.md`
- `ops/PRODUCTION-HANDOVER.md`
