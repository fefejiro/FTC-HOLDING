# Garden Cleaners Custom SMTP Implementation Result

## 1. Provider Chosen
**Provider:** Resend (domain verified)
**Sender:** FTC Client Portal <no-reply@unalabs.cloud>
**Status:** DNS verified, SMTP enabled in Supabase, sender display name fixed in Gmail

## 2. Sender Chosen
- **Sender:** FTC Client Portal <no-reply@unalabs.cloud>
- **Alternative (not used):** Garden Cleaners Portal <no-reply@gardencleaners.ca>

## 3. DNS Records Required (Resend)
- **SPF:**
  - Type: TXT
  - Name: @
  - Value: v=spf1 include:resend.com ~all
- **DKIM:**
  - Type: CNAME
  - Name: [provided by Resend, e.g., selector._domainkey]
  - Value: [provided by Resend, e.g., selector.domainkey.resend.com]
- **DMARC:** (recommended)
  - Type: TXT
  - Name: _dmarc
  - Value: v=DMARC1; p=none; rua=mailto:postmaster@unalabs.cloud
- **Note:** Actual DKIM selector and CNAME value are provided in Resend dashboard after domain is added.

## 4. Supabase SMTP Settings (configured in dashboard, not in code)
**SMTP enabled:** Yes (smtp.resend.com, port 587, sender: FTC Client Portal <no-reply@unalabs.cloud>)
**Test email sent:** Yes (to fejiro.efiuvwere@gmail.com)
**Gmail sender/display name:** FTC Client Portal (no longer says Una Labs)

## 5. Security
- **No SMTP secrets or API keys are stored in docs or chat.**
- **Credentials must be entered directly in Supabase dashboard or via secure session.**

## 3. DNS Records Required (Resend)

| Record Type | Host/Name                | Purpose                | Value Source                | Cloudflare Proxy | Notes/Verification Steps |
|-------------|--------------------------|------------------------|-----------------------------|------------------|-------------------------|
| TXT         | @ (unalabs.cloud)        | SPF (allow Resend)     | v=spf1 include:resend.com ~all | DNS only         | Copy value from Resend docs. No proxy. |
| CNAME       | [selector]._domainkey    | DKIM (sign mail)       | Provided by Resend dashboard | DNS only         | Copy selector/value from Resend. No proxy. |
| TXT         | _dmarc                   | DMARC (reporting)      | v=DMARC1; p=none; rua=mailto:postmaster@unalabs.cloud | DNS only | Optional but recommended. No proxy. |

**Verification Steps:**
1. Add domain in Resend dashboard.
2. Copy SPF, DKIM, and DMARC records from Resend to Cloudflare DNS for unalabs.cloud.
3. Ensure all records are set to DNS only (no Cloudflare proxy/orange cloud).
4. Wait for DNS to propagate, then verify in Resend dashboard (should show green/verified for all records).
5. Do not expose DKIM secret values in docs or chat.

## 4. Supabase SMTP Settings (to be filled in dashboard, not in code)

**Where:** Supabase Dashboard → Authentication → SMTP Settings

**Fields needed:**
- SMTP host: smtp.resend.com
- SMTP port: 587 (or 465 for SSL)
- SMTP username: [from Resend dashboard]
- SMTP password/API key: [from Resend dashboard]
- Sender email: no-reply@unalabs.cloud
- Sender name: FTC Client Portal

**Do not enter credentials in docs or chat.**

**Do not configure until DNS is verified in Resend.**

## 6. Configuration Steps
1. Add domain (unalabs.cloud) to Resend and complete DNS verification (SPF, DKIM, DMARC). **(Complete)**
2. Obtain SMTP credentials from Resend dashboard. **(Complete)**
3. Enter SMTP settings in Supabase Auth dashboard (Authentication → SMTP Settings). **(Complete)**
4. Save and test configuration. **(Complete)**
## 8. Handoff/Walkthrough Status
- [x] Custom SMTP provider selected: Resend (domain verified)
- [x] DNS verification: complete
- [x] Supabase SMTP configuration: enabled
- [x] Test email: sent and verified (Gmail sender/display name is FTC Client Portal)
- [x] Controlled walkthrough: GO (admin login/dashboard verified)
- [x] Full handoff: GO pending only final owner/client acceptance/security signoff

## 7. Verification
- [ ] Send magic link to fejiro.efiuvwere@gmail.com
- [ ] Subject: FTC Client Portal
- [ ] Body: FTC Client Portal
- [ ] Gmail sender display name: FTC Client Portal (not Una Labs)
- [ ] Sender email: no-reply@unalabs.cloud
- [ ] Magic link lands on https://gardencleaners.ca/garden-cleaners/portal#portal-access
- [ ] Admin dashboard visible after login

## 8. Handoff/Walkthrough Status
- [ ] Update DOCS/GARDEN_PRODUCTION_ACCOUNT_SETUP_RESULT.md
- [ ] Update DOCS/GARDEN_PRODUCTION_HANDOFF_GATE.md
- [ ] Update DOCS/GARDEN_48H_HANDOFF_SPRINT_BOARD.md
- [ ] Update DOCS/GARDEN_CLIENT_WALKTHROUGH_PACK.md

---

**This runbook is complete when all verification and handoff steps are checked.**

_No secrets or credentials in this document._
