# Garden Cleaners Production Admin Login Verification

**Date:** 2026-04-30

## Manual Verification Checklist

1. Open the latest FTC Client Portal email sent to the admin.
2. Confirm the email subject/body say FTC Client Portal.
3. Confirm the sender display name. Current known limitation: Supabase default mailer still shows "Una Labs"; FTC Client Portal branding is present in the email subject/body.
4. Click the login button in the email.
5. Verify the browser lands on:
   - https://gardencleaners.ca/garden-cleaners/portal
   - Or a Supabase redirect that resolves to the above URL
6. Confirm user session is established.
7. Confirm the admin role is visible for fejiro.efiuvwere@gmail.com:
   - Admin dashboard/controls are present
   - No staff/customer-only restrictions apply
8. Repeat for uby400@gmail.com if applicable.
9. If any step fails, record the exact error or unexpected behavior.

## Status Table

| Admin Email | Login Status | Notes |
| --- | --- | --- |
| fejiro.efiuvwere@gmail.com | PASS | Owner confirmed login works; auth redirect fix deployed after an earlier link landed on unalabs.cloud |
| uby400@gmail.com | PENDING | Client walkthrough email sent; awaiting client test |

## Latest Auth Redirect Fix

- Issue observed: magic-link click landed on `unalabs.cloud` because Supabase project `site_url` is shared.
- Fix applied: Garden portal now sends magic links with explicit `emailRedirectTo` set to `/garden-cleaners/portal` on the current Garden domain.
- Supabase redirect allow list now includes Garden portal URLs.
- Commit: `2f0c8e42 fix(garden): redirect auth links to portal`
- Deployment check: live portal content contains the Garden portal redirect string.
- Next test: send a fresh magic link from `https://gardencleaners.ca/garden-cleaners/portal` and confirm it lands back on the Garden portal.

## Latest Pause Point

- Founder/internal admin login: PASS
- Client walkthrough email: SENT
- Client login/walkthrough: PENDING
- Screenshot QA evidence: PENDING
- Controlled walkthrough: IN PROGRESS
- Full handoff: NO-GO pending client confirmation and final security/email gate

## Final Status

- Controlled walkthrough: IN PROGRESS (client walkthrough email sent; founder/admin login passed)
- Full handoff: NO-GO until client admin login confirmation and final security/email gate

---

**Instructions:**
- Owner: follow the checklist above for each admin email.
- Mark PASS if all steps succeed, FAIL if any step fails, PENDING if not yet tested.
- Update this file with results and any issues found.

---

*This checklist ensures secure, role-correct production access for Garden Cleaners admins before full handoff.*
