# CapSigma Growth Desk Client Operating Guide

Status: sandbox-first turnkey outreach desk. It can build source-backed
prospects, generate outreach, auto-send eligible matches to the Fejiro sandbox
recipient, and preserve proof before the final switch to `hello@capsigma.com`.

## What To Call It

Client-facing name: CapSigma Growth Desk

Internal workflow name: CapSigma Outreach Agent

## What It Does

CapSigma Growth Desk helps an operator turn public prospect research into
proof-backed outreach:

```text
Public source-backed prospect research
-> AI-assisted draft
-> eligibility gate
-> sandbox or live SendGrid delivery
-> Sent Review proof
-> reply attention queue
```

It is not a fake-data demo and it should not invent prospects. Prospects must
come from public-source research or a real import source. The app stores the
source/background used for outreach proof.

## Current Production Mailbox Setup

- Visible From: `fejiro.efiuvwere@gmail.com`
- Reply-To: `fejiro.efiuvwere@gmail.com`
- Footer contact: `fejiro.efiuvwere@gmail.com`
- Actual recipient override: `fejiro.efiuvwere@gmail.com`
- Proof-copy CC: `fejiro.efiuvwere@gmail.com`

This is the current sandbox setup. It uses real prospect context and real
SendGrid delivery, but all outbound mail lands in Fejiro's inbox. Sent Review
shows both the intended prospect recipient and the actual Fejiro recipient.

The preferred final setup is:

- Visible From: `hello@capsigma.com`
- Reply-To: `hello@capsigma.com`
- Footer contact: `hello@capsigma.com`
- Actual recipient override: removed
- Proof-copy CC: `fejiro.efiuvwere@gmail.com`

That final setup requires `hello@capsigma.com` verification in SendGrid. This
can be done without DNS by having the client click the SendGrid verification
email sent to `hello@capsigma.com`.

The stronger optional upgrade is SendGrid domain authentication for
`capsigma.com`. That requires DNS records, but it is not required for a basic
client handover.

## Operator Workflow

1. Open the production URL.
2. Sign in with the admin password.
3. Open Prospect Builder.
4. Enter a target research query and industries.
5. Run source-backed prospect discovery.
6. Open Review Queue.
7. Swipe right or click send for eligible matches.
8. Swipe left or click edit for prospects that need review.
9. Open Sent Review and confirm sent body, provider id, source/background,
   intended recipient, and actual recipient.
10. Open Replies for human-attention messages after reply sync/import.

## CSV Shape

Recommended columns:

```csv
company,industry,fitScore,reason,contactName,contactTitle,email,sourceUrl,source
```

Every lead should have a real source and a concrete business reason. Placeholder
emails are blocked server-side.

## Client Access Model

Current model:

- Single admin operator
- One Cloudflare Pages app
- One D1 proof ledger
- One SendGrid sender setup

That is good for CapSigma internal use or one closely managed client handover.

For multiple external clients, use one isolated deployment per client:

- Separate Cloudflare Pages project
- Separate D1 database
- Separate admin password
- Separate SendGrid sender/domain
- Separate proof ledger

Do not mix multiple client companies into one D1 database unless the product is
upgraded with tenant isolation, roles, and per-client access boundaries.

## Deliverability Notes

The app can prove SendGrid accepted and logged a send, but inbox placement is
controlled by sender trust, domain reputation, SPF, DKIM, DMARC, content, and
recipient mailbox filtering.

The latest Gmail check confirmed receipt but showed spam placement for the
current Gmail-sender test path.

No-DNS live handover path:

- Client verifies `hello@capsigma.com` in SendGrid by clicking the verification email.
- Production From and Reply-To switch to `hello@capsigma.com`.
- `OUTBOUND_RECIPIENT_OVERRIDE` is removed.
- Operator reruns recipient tests and reviews delivery placement.

Optional stronger upgrade:

- Add the SendGrid DNS records in `ops/SENDGRID-DNS-RECORDS-2026-06-11.md`.
- Validate SendGrid domain authentication.
- Switch production From to `hello@capsigma.com`.
- Rerun recipient and Gmail placement tests.

SendGrid references:

- https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication
- https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification

## Current Production Readiness

Green:

- Admin login
- D1 persistence
- Real lead import
- OpenAI draft generation
- Eligibility-gated auto-send
- Fejiro sandbox recipient override
- SendGrid live sending
- Reply-To and footer contact routed to `fejiro.efiuvwere@gmail.com` in sandbox
- Fejiro proof-copy CC support
- Sent Review proof
- Intended vs actual recipient proof
- Reply attention ledger
- Gmail reply monitoring connected to Fejiro sandbox mailbox
- Windows scheduled reply sync every 30 minutes
- No-DNS handover path documented in `ops/NO-DNS-CLIENT-HANDOVER.md`
- SendGrid authenticated domain created for `capsigma.com` as optional upgrade

Yellow:

- Gmail spam placement until sender verification/domain authentication improves trust
- `hello@capsigma.com` still needs the client to click the SendGrid verification email
- SendGrid DNS records pending at the `capsigma.com` DNS host for optional stronger authentication
- Outlook OAuth polling is still a follow-up; Gmail reply monitoring is implemented
- Single-operator access only
- Public prospect research depends on OpenAI web search availability

Red for scale:

- Do not run broad live outreach until `hello@capsigma.com` is verified at minimum and sandbox proof is approved.
- Do not sell this as multi-client SaaS until tenant isolation and per-client roles exist.
