# Garden Cleaners Client Handoff Package

## 1. Executive Handoff Summary

- **Live Website:** https://gardencleaners.ca
- **Portal URL:** https://gardencleaners.ca/garden-cleaners/portal
- **What Was Delivered:**
  - Secure client portal for quote management, job tracking, and staff assignment
  - Admin, staff, and customer roles with role-based access
  - Automated email login (magic link) and password reset flows
  - Dashboard for job and quote visibility
- **MVP / Current Phase:**
  - All core flows (quote, job, assignment, status) are live and tested
  - Admin and staff access enabled; customer access in preview
- **What Remains for Next Phase:**
  - Enhanced reporting and analytics
  - Bulk job assignment tools
  - Customer self-service features
  - Custom email sender branding (pending)
- **Known Limitations:**
  - Email sender may still show "Una Labs" until custom sender is configured
  - Some advanced admin/reporting features are deferred to next phase
  - Customer portal features are in preview and may change

## 2. Admin User Manual

**Supported authentication methods:**
- Supabase email/password
- Magic link / OTP (sign-in link via email)
- Invite and password reset flows

**Unsupported:** Google/social OAuth is not implemented.

- **How to Access Portal:**
  - Go to https://gardencleaners.ca/garden-cleaners/portal
- **How to Request Magic Link:**
  - Enter your admin email and request a sign-in link
- **How to Sign In:**
  - Click the link in your email (expires in 1 hour)
- **If Link Expires:**
  - Request a new sign-in link from the portal login page
- **Forgot Password/Reset Flow:**
  - Use the "Forgot password?" link to receive a reset email
- **How to Read the Dashboard:**
  - View all active jobs, quotes, and assignments
  - Filter by status or assigned staff
- **Admin UI capabilities:**
  - Invite/resend invite, password reset, disable/enable, role update, user listing
- **Roles:** admin, staff, client (assigned via env allowlists, admin UI, or DB)
- **What Admin Can Currently Do:**
  - View and manage all jobs and quotes
  - Assign staff to jobs
  - Update job status
- **What Staff/Customer Roles Can See:**
  - Staff: See assigned jobs and update status
  - Customer: View their own job status (preview)
- **Audit logging:**
  - Admin user-management actions are logged to `garden_cleaners_audit_log` where implemented. Broader dashboard telemetry is recommended for future.
- **What Is Not Available Yet:**
  - Bulk actions, advanced reporting, and customer self-service (planned for next phase)

## 3. FAQ

- **No Email Received:**
  - Check spam/junk folder; verify correct email address
- **Link Expired:**
  - Request a new sign-in link from the portal
- **Wrong Email Used:**
  - Only registered admin/staff emails can access the portal
- **Cannot See Admin Controls:**
  - Ensure you are signed in with an admin account
- **Sender Still Says Una Labs:**
  - Branding update is pending; functionality is unaffected
- **Quote Submitted but Not Visible:**
  - Allow a few minutes for processing; contact support if issue persists
- **How to Request Support:**
  - See support section below
- **How to Report a Bug:**
  - Email support with a description and screenshot if possible

## 4. Client Acceptance/Signoff Checklist

- [ ] Website reviewed and accessible
- [ ] Quote form tested and submits successfully
- [ ] Portal login tested (magic link received and used)
- [ ] Admin access confirmed (can view/manage jobs)
- [ ] Known limitations acknowledged (see above)
- [ ] Next phase items accepted or deferred

**Client Name:** ______________________

**Signature:** ________________________

**Date:** _____________________________

## 5. Support / Escalation

- **Support Contact:** support@gardencleaners.ca
- **What to Send:**
  - Description of the issue
  - Screenshot or screen recording (if possible)
  - Steps to reproduce
  - Your role (admin, staff, customer)
- **Severity Levels:**
  - Critical: Cannot access portal or core features
  - Major: Key feature not working, but portal accessible
  - Minor: Cosmetic or non-blocking issue
- **Expected Response Guidance:**
  - Critical: Response within 4 business hours
  - Major: Response within 1 business day
  - Minor: Response within 2 business days

---

_This document contains no passwords, secrets, or internal-only notes. For any questions or support, please use the contact above._
