# CapSigma Auto-Outreach Sandbox

Status: active test-to-live path.

## Current Mode

The Growth Desk is configured to test real outreach safely:

- From: `fejiro.efiuvwere@gmail.com`
- Reply-To: `fejiro.efiuvwere@gmail.com`
- Footer contact: `fejiro.efiuvwere@gmail.com`
- Actual recipient override: `fejiro.efiuvwere@gmail.com`
- Minimum auto-send fit score: `60`

This means the app can research real prospects, write the real intended email,
and send through SendGrid, but Fejiro receives the message during sandbox.

## What Proof Must Show

Every sandbox send must record:

- Company
- Contact
- Source/background URL
- Intended recipient
- Actual recipient
- Subject
- Body
- SendGrid provider id
- Status: `sandbox_sent`

If the prospect does not pass the eligibility gate, it must be marked
`needs_review`, not sent.

## Auto-Send Eligibility

A prospect can auto-send only when it has:

- Valid non-placeholder email
- No suppression record
- Public source URL
- Fit score of at least `60`
- CapSigma service-lane match
- Clean generated draft

Blocked items route to Review Queue.

## Live Cutover

After Mike approves sandbox quality:

```powershell
npx wrangler pages secret put SENDGRID_FROM_EMAIL --project-name capsigma-growth-desk
npx wrangler pages secret put SENDGRID_REPLY_TO_EMAIL --project-name capsigma-growth-desk
npx wrangler pages secret delete OUTBOUND_RECIPIENT_OVERRIDE --project-name capsigma-growth-desk
npm run deploy
npm run prod:test-recipients
```

Use `hello@capsigma.com` for both From and Reply-To after SendGrid Single Sender
verification is completed.

Do not remove the recipient override before sandbox proof is accepted.
