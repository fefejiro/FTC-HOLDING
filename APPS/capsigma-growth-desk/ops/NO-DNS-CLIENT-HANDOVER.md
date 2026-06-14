# CapSigma Growth Desk No-DNS Client Handover

Status: recommended handover path when the client does not want to involve DNS.

## Plain-English Position

CapSigma Growth Desk can be handed over without touching DNS by using SendGrid
Single Sender verification.

That means the client only needs to verify the mailbox that will send outreach,
such as:

```text
hello@capsigma.com
```

No DNS records are required for this mode.

## What The Client Must Do Once

1. Open the SendGrid verification email sent to `hello@capsigma.com`.
2. Click the verification link.
3. Tell the operator/dev team it is verified.

After that, production can be switched to:

```text
SENDGRID_FROM_EMAIL=hello@capsigma.com
SENDGRID_FROM_NAME=CapSigma
SENDGRID_REPLY_TO_EMAIL=hello@capsigma.com
SENDGRID_REPLY_TO_NAME=CapSigma
SENDGRID_CC_EMAILS=fejiro.efiuvwere@gmail.com
```

Also remove `OUTBOUND_RECIPIENT_OVERRIDE` after sandbox approval so live emails
go to the intended prospect recipients.

Then run:

```powershell
npm run prod:doctor
npm run prod:test-recipients
```

## What The Client Receives

- Production URL
- Admin password
- Prospect Builder
- Optional CSV template
- Operating guide
- Evidence/proof tabs inside the app
- Daily send limit
- Sent Review history
- Proof-copy CC to Fejiro

## How The Client Uses It

1. Sign in.
2. Run Prospect Builder with a target industry/query.
3. Review source-backed prospects.
4. Swipe right/click send for eligible matches.
5. Swipe left/click edit for prospects needing review.
6. Check Sent Review for exact body, provider id, background, source,
   intended recipient, and actual recipient.
7. Watch the Replies tab for human-attention replies.

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
- Replies go to `hello@capsigma.com`.
- Fejiro can receive proof-copy CC.

Yellow:

- Inbox placement is not guaranteed by any app.
- Single Sender is easier than DNS, but weaker than full domain authentication.
- Reply sync/classification is available, with full Outlook polling still a follow-up.
- Public prospect research depends on OpenAI web search availability.

Optional later upgrade:

- Authenticate `capsigma.com` in SendGrid using DNS for stronger deliverability.

## Handover Acceptance

This no-DNS handover is acceptable when:

- `hello@capsigma.com` is verified in SendGrid.
- `prod:doctor` passes.
- `prod:test-recipients` sends successfully.
- A test email to `hello@capsigma.com` records provider proof.
- Fejiro receives proof-copy CC.
- The client understands inbox placement depends on sender reputation and mailbox filtering.
