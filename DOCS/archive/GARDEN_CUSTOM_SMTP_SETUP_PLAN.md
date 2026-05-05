# Garden Cleaners Custom SMTP Setup Plan

**Goal:**
- Use a generic sender identity so Supabase Auth emails no longer show "Una Labs" as the sender display name.

**Recommended Sender:**
- FTC Client Portal <no-reply@unalabs.cloud>
- Alternative: Client Portal <no-reply@gardencleaners.ca> (if Garden-specific SMTP/domain is approved)

**Provider Options:**
- Resend
- Postmark
- Mailgun
- Google Workspace SMTP

**Note:**
- Cloudflare Email Routing is NOT SMTP and cannot send auth emails.

**DNS Records Needed:**
- SPF (Sender Policy Framework)
- DKIM (DomainKeys Identified Mail)
- DMARC (Domain-based Message Authentication, Reporting & Conformance)
- Any provider-specific verification records

**Supabase Dashboard Path:**
- Authentication → SMTP Settings / Auth Email Provider

**Required SMTP Settings:**
- SMTP host
- SMTP port
- SMTP username
- SMTP password or API key
- Sender email (e.g., no-reply@unalabs.cloud)
- Sender display name (e.g., FTC Client Portal)

**Security Rules:**
- Never commit SMTP secrets to version control
- Test with founder/admin email first
- Rotate credentials if exposed or on handoff

**Verification Checklist:**
- Sender display name no longer says "Una Labs"
- Subject/body says "FTC Client Portal"
- Magic link/invite lands in Garden portal
- Admin role visible after login

**Handoff Gate:**
- Controlled walkthrough can proceed if owner explicitly accepts current sender limitation
- Full polished handoff requires custom SMTP setup complete or written owner acceptance of limitation

_No secrets or credentials in this document._
