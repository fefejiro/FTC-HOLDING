# CapSigma Growth Desk No-DNS Client Handover

Status: recommended handover path when the client does not want to involve DNS.

## Plain-English Position

CapSigma Growth Desk can be handed over without touching DNS by using SendGrid
Single Sender verification.

That means the client only needs to verify the mailbox that will send outreach,
such as:

```text
sales@capsigma.com
```

No DNS records are required for this mode.

## What The Client Must Do Once

1. Open the SendGrid verification email sent to `sales@capsigma.com`.
2. Click the verification link.
3. Tell the operator/dev team it is verified.

After that, production can be switched to:

```text
SENDGRID_FROM_EMAIL=sales@capsigma.com
SENDGRID_FROM_NAME=CapSigma
SENDGRID_REPLY_TO_EMAIL=sales@capsigma.com
SENDGRID_REPLY_TO_NAME=CapSigma Sales
SENDGRID_CC_EMAILS=fejiro.efiuvwere@gmail.com
```

Then run:

```powershell
npm run prod:doctor
npm run prod:test-recipients
```

## What The Client Receives

- Production URL
- Admin password
- CSV template
- Operating guide
- Evidence/proof tabs inside the app
- Daily send limit
- Sent Review history
- Proof-copy CC to Fejiro

## How The Client Uses It

1. Sign in.
2. Import a CSV of verified prospects.
3. Select a prospect.
4. Generate draft.
5. Review the subject and body.
6. Approve the draft.
7. Send.
8. Check Sent Review for the exact email body, provider id, background, and source.
9. Watch `sales@capsigma.com` for replies.
10. Mark replies manually in the app.

## CSV Template

```csv
company,industry,fitScore,reason,contactName,contactTitle,email,sourceUrl,source
Acme Health,Healthcare,88,Referral records are handled across disconnected intake teams,Jordan Lee,VP Revenue Operations,jordan.lee@example.com,https://example.com,manual research
```

## Expectations

Green:

- The app sends real email through SendGrid.
- The app records provider proof.
- The operator can review the sent body later.
- Replies go to `sales@capsigma.com`.
- Fejiro can receive proof-copy CC.

Yellow:

- Inbox placement is not guaranteed by any app.
- Single Sender is easier than DNS, but weaker than full domain authentication.
- Replies are tracked manually for now.
- Lead research/import is still operator-controlled.

Optional later upgrade:

- Authenticate `capsigma.com` in SendGrid using DNS for stronger deliverability.

## Handover Acceptance

This no-DNS handover is acceptable when:

- `sales@capsigma.com` is verified in SendGrid.
- `prod:doctor` passes.
- `prod:test-recipients` sends successfully.
- A test email to `sales@capsigma.com` records provider proof.
- Fejiro receives proof-copy CC.
- The client understands inbox placement depends on sender reputation and mailbox filtering.
