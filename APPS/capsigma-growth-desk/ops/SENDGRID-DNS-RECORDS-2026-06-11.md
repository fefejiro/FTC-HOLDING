# CapSigma SendGrid DNS Records - 2026-06-11

Status: SendGrid authenticated domain created, pending DNS records.

SendGrid authenticated domain id: `31406421`

Domain: `capsigma.com`

Subdomain: `em`

## Required DNS Records

Add these records wherever `capsigma.com` DNS is managed. Current authoritative
nameservers are Google nameservers:

```text
ns-cloud-b1.googledomains.com
ns-cloud-b2.googledomains.com
ns-cloud-b3.googledomains.com
ns-cloud-b4.googledomains.com
```

### SendGrid Domain Authentication

```text
Type: CNAME
Host: em
Value: u109069880.wl131.sendgrid.net
TTL: default or 300
```

```text
Type: CNAME
Host: s1._domainkey
Value: s1.domainkey.u109069880.wl131.sendgrid.net
TTL: default or 300
```

```text
Type: CNAME
Host: s2._domainkey
Value: s2.domainkey.u109069880.wl131.sendgrid.net
TTL: default or 300
```

### Client App URL

```text
Type: CNAME
Host: growth
Value: capsigma-growth-desk.pages.dev
TTL: default or 300
```

## Validation Commands

After the DNS records are added and have propagated:

```powershell
Resolve-DnsName -Name em.capsigma.com -Type CNAME
Resolve-DnsName -Name s1._domainkey.capsigma.com -Type CNAME
Resolve-DnsName -Name s2._domainkey.capsigma.com -Type CNAME
Resolve-DnsName -Name growth.capsigma.com -Type CNAME
```

Then validate with SendGrid:

```powershell
$env:SENDGRID_API_KEY="<paste key for this shell only>"
npm run sendgrid:domain-status
```

Expected result:

```text
"valid": true
```

Once valid, switch production sending to:

```text
SENDGRID_FROM_EMAIL=sales@capsigma.com
SENDGRID_FROM_NAME=CapSigma
SENDGRID_REPLY_TO_EMAIL=sales@capsigma.com
SENDGRID_REPLY_TO_NAME=CapSigma Sales
SENDGRID_CC_EMAILS=fejiro.efiuvwere@gmail.com
```

Then redeploy/retest:

```powershell
npm run prod:doctor
npm run prod:test-recipients
```

## Current Evidence

The first SendGrid validation failed because the DNS records are not present yet:

```text
em.capsigma.com expected u109069880.wl131.sendgrid.net
s1._domainkey.capsigma.com expected s1.domainkey.u109069880.wl131.sendgrid.net
s2._domainkey.capsigma.com expected s2.domainkey.u109069880.wl131.sendgrid.net
```

Evidence files:

- `ops/SENDGRID-DOMAIN-AUTH-2026-06-11T17-26-42Z.json`
- `ops/SENDGRID-DOMAIN-VALIDATION-2026-06-11T17-29-28Z.json`

References:

- https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication
- https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification
