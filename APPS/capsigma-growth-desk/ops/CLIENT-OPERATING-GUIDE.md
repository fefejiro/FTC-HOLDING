# CapSigma Growth Desk Client Operating Guide

Status: turnkey single-operator outreach desk, with deliverability hardening still required before broad volume.

## What To Call It

Client-facing name: CapSigma Growth Desk

Internal workflow name: CapSigma Outreach Agent

## What It Does

CapSigma Growth Desk helps an operator turn verified prospect research into approved outreach:

```text
Real prospect list
-> AI-assisted draft
-> human review and approval
-> SendGrid delivery
-> Sent Review proof
```

It is not a fake-data demo and it should not invent prospects. Leads must come
from a real approved source such as client CSV, manual research, CRM export,
Apollo, LinkedIn Sales Navigator export, or another approved source.

## Current Production Mailbox Setup

- Visible From: `fejiro.efiuvwere@gmail.com`
- Reply-To: `sales@capsigma.com`
- Footer contact: `sales@capsigma.com`
- Proof-copy CC: `fejiro.efiuvwere@gmail.com`

This is the current working production setup because the Gmail sender is verified
in SendGrid. The preferred final setup is:

- Visible From: `sales@capsigma.com`
- Reply-To: `sales@capsigma.com`
- Footer contact: `sales@capsigma.com`
- Proof-copy CC: `fejiro.efiuvwere@gmail.com`

That final setup requires `sales@capsigma.com` verification or SendGrid domain
authentication first.

## Operator Workflow

1. Open the production URL.
2. Sign in with the admin password.
3. Import verified leads from CSV.
4. Confirm each row has company, source, reason, contact, and a real email.
5. Select a lead.
6. Generate the draft.
7. Review and edit the subject/body.
8. Approve the draft.
9. Send the approved email.
10. Open Sent Review and confirm the sent body, provider id, source, background,
    and proof-copy CC.
11. Mark replies manually until reply-webhook automation is added.

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
current Gmail-sender test path. Before broad outreach, finish one of these:

- Verify `sales@capsigma.com` as a SendGrid Single Sender, or
- Authenticate the CapSigma domain in SendGrid with SPF/DKIM records.

SendGrid references:

- https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication
- https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification

## Current Production Readiness

Green:

- Admin login
- D1 persistence
- Real lead import
- OpenAI draft generation
- Human approval gate
- SendGrid live sending
- Reply-To and footer contact routed to `sales@capsigma.com`
- Fejiro proof-copy CC support
- Sent Review proof

Yellow:

- Gmail spam placement until sender/domain authentication improves trust
- Manual reply tracking
- Single-operator access only
- Manual lead import/research workflow

Red for scale:

- Do not run broad cold outreach until sender/domain authentication is complete.
- Do not sell this as multi-client SaaS until tenant isolation and per-client roles exist.
