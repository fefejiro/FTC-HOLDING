# Garden Cleaners Admin Dashboard Quick-Start Guide

Welcome to your Garden Cleaners admin dashboard! This guide will help you log in, understand the dashboard, perform common admin tasks, and troubleshoot any issues. No technical background required.

---


## 1. Login Steps (Supported Auth)
Garden Cleaners portal supports:
- Supabase email/password
- Magic link / OTP (sign-in link via email)
- Invite and password reset flows

Google/social OAuth is not implemented.

1. Go to the Garden Cleaners portal: https://gardencleaners.ca/garden-cleaners/portal
2. Enter your admin email address and click "Send Magic Link" (or similar button).
3. Check your email inbox for a message titled "FTC Client Portal".
4. Open the email and click the login button or magic link.
5. You will be automatically signed in and redirected to the admin dashboard.

---

## 2. Screenshot Placeholders
- **Screenshot 1:** Homepage (https://gardencleaners.ca/)
- **Screenshot 2:** Portal Login (https://gardencleaners.ca/garden-cleaners/portal)
- **Screenshot 3:** Auth Email (your inbox, subject: "FTC Client Portal")
- **Screenshot 4:** Admin Portal After Login (https://gardencleaners.ca/garden-cleaners/portal)

---


## 3. Admin Dashboard Orientation
- **Roles:** admin, staff, client (assigned via env allowlists, admin UI, or DB)
- **Admin UI capabilities:** invite/resend invite, password reset, disable/enable, role update, user listing
- **Top Navigation:** Access main areas (dashboard, jobs, quotes, sign out)
- **Quote/Job Queue:** List of all incoming quotes and jobs. Each row shows:
  - Client name and contact
  - Service requested
  - Status label (e.g., New, In Progress, Complete)
  - Assigned staff (if any)
- **Status Labels:**
  - **New:** Awaiting review
  - **In Progress:** Job assigned and underway
  - **Complete:** Job finished
- **Staff/Customer Visibility:**
  - Admins see all jobs, quotes, and staff assignments
  - Staff see only their assigned jobs
  - Customers see only their own requests

---


## 4. Common Admin Tasks
- **Review a Quote/Job:**
  - Click on any row in the queue to see details
  - Review client info, requested service, and notes
- **Check Job Status:**
  - Status label shows current progress
  - Update status as needed (if enabled)
- **Understand Assigned Staff:**
  - Assigned staff name appears in the job details
  - Contact staff if needed
- **Sign Out:**
  - Use the "Sign Out" or "Log Out" button in the navigation
- **Request Support:**
  - Look for a "Support" or "Help" link, or contact your onboarding representative
- **Audit logging:** Admin user-management actions are logged to `garden_cleaners_audit_log` where implemented. Broader dashboard telemetry is recommended for future.

---

## 5. Troubleshooting
- **Email Not Received:**
  - Check spam/junk folder
  - Wait a few minutes and try again
  - Confirm your email address is correct
- **Link Expired:**
  - Request a new magic link from the login page
- **Wrong Account:**
  - Make sure you are using your admin email
  - Log out and try again if needed
- **No Admin Controls Visible:**
  - Confirm you are logged in with an admin account
  - If you see a staff or customer view, log out and try again
- **Browser/Cache Issues:**
  - Refresh the page
  - Try a different browser
  - Clear your browser cache if problems persist

---

If you need further help, contact your onboarding representative or support team.

*This guide is for Garden Cleaners admin users. For security, do not share your login link or credentials with others.*
