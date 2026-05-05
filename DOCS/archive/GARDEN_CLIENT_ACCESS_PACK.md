# Garden Cleaners Client Access Pack

**Date:** April 29, 2026

---

## Client Login URL
- [https://garden-cleaners.yoursite.com/portal](https://garden-cleaners.yoursite.com/portal)

---

## Production Account Types
- **Client Owner/Admin**
  - Full access to portal features, quote management, staff management, and reporting (as available).
- **Staff/Cleaner**
  - Access to assigned jobs, view/manage quotes as permitted, limited management features.
- **Customer/Test Requester**
  - (Optional) For testing customer experience; limited to submitting/viewing their own requests.

---

## Role Capabilities
- **Client Owner/Admin:**
  - Manage all quotes and requests
  - Add/remove staff/cleaners
  - View portal dashboard and history
  - Access reporting (where available)
- **Staff/Cleaner:**
  - View assigned jobs/requests
  - Update job/request status
  - Limited access to quote details
- **Customer/Test Requester:**
  - Submit new requests/quotes
  - View their own request status

---

## What Is Currently Verified
- Public site is live
- Quote persistence is live
- Portal access and role-based features have passed internal QA (using internal-only accounts)

---

## What Is Not Production-Ready Yet
- Production client accounts have not been created or handed off
- Some advanced features (e.g., reporting, enhanced notifications) are still in development
- Service role/key rotation is **deferred for now** but remains a final pre-handoff security gate

---

## Secure Handoff Rules
- **Do not share QA or test accounts with the client**
- **Do not write or store passwords in documentation**
- Use Supabase Auth invite or password reset flow for all production users
- All credentials must be delivered securely (never in docs or email)

---

## Support/Reset Process
- If access issues occur, client should contact support or the founder for password reset or account help
- Use the Supabase Auth password reset flow; never send passwords directly

---

## Ready to Send to Client Checklist
- [ ] Production client owner/admin account created
- [ ] Staff/cleaner accounts created (if needed)
- [ ] Roles assigned in database
- [ ] Invite/password reset links sent securely
- [ ] Client login verified
- [ ] Key rotation scheduled (final security gate)
- [ ] All documentation reviewed for secrets (none present)

---

**No secrets or passwords are included in this document. All production credentials must be delivered securely and never written in docs.**
