# Garden Cleaners Client Walkthrough Pack

**Production Admin Emails:**
- Client owner/admin: uby400@gmail.com
- Founder/internal admin: fejiro.efiuvwere@gmail.com
- (Retired: fefiuvwere@gmail.com — replaced due to email delivery issue)

**Login URL:** https://gardencleaners.ca/garden-cleaners/portal

---


## Walkthrough Sequence: Client Owner/Admin (uby400@gmail.com)
1. Go to the login URL above.
2. Use the invite or password reset link sent to uby400@gmail.com to set your password.
3. Log in as the client owner/admin.
4. Review the dashboard and navigation.
5. Test all owner/admin features:
   - View and manage job/quote queue
   - Convert quotes to jobs
   - Assign staff to jobs
   - Update job statuses
   - View all jobs and assignments
6. Confirm you can log out and log back in successfully.
7. Notify the team when walkthrough is complete.

## Walkthrough Sequence: Founder/Internal Admin (fejiro.efiuvwere@gmail.com)
1. Go to the login URL above.
2. Use the invite or password reset link sent to fejiro.efiuvwere@gmail.com to set your password.
3. Log in as the founder/internal admin.
4. Review the dashboard and navigation.
5. Test all admin features:
   - View and manage job/quote queue
   - Convert quotes to jobs
   - Assign staff to jobs
   - Update job statuses
   - View all jobs and assignments
6. Confirm you can log out and log back in successfully.
7. Notify the team when walkthrough is complete.

---

## Handoff Polish Blockers (Final)
- Live QA: PASS (16 total, 14 passed, 0 failed, 2 skipped)
- Portal UI polish: COMPLETE
- Auth email subject/body: COMPLETE (FTC Client Portal)
- Sender display name: OPEN (still shows Una Labs; Supabase default mailer limitation)
- Controlled walkthrough: CONDITIONAL GO pending owner acceptance of sender display-name limitation
- Full handoff: NO-GO until production admin login confirmation and final security/email gate
- Note: Custom SMTP is required before polished final handoff unless owner formally accepts current sender display-name limitation.

Controlled internal testing may continue.

---

## What Each Admin Should Experience
- Full access to all owner/admin features
- Ability to manage jobs, quotes, staff assignments, and statuses
- No access issues or errors
- Consistent experience between both admin accounts

---

## What Is Live
- Owner/admin portal with role-based access
- Job and quote management (view, convert, assign)
- Staff assignment and status update flows
- Customer view for own jobs/status
- Secure login and session management
- All major MVP features listed below

---

## What Is MVP
- Admin: Job/quote queue, convert, assign, status update
- Staff: Assigned jobs, status update
- Customer: Own jobs/status
- Loading, empty, and error states
- Secure API calls (Supabase session)

---

## What Not to Claim
- No payment processing or invoicing
- No calendar or scheduling integration
- No notifications or messaging
- No advanced reporting or analytics
- No mobile app (web only)
- No production data migration from legacy systems

---


## Each Admin Must Confirm After Accepting Invite/Reset
- Successful login as their admin account
- Access to all admin features
- Ability to view, convert, and assign jobs/quotes
- Ability to update job statuses
- No access issues or errors
- Notify team to run final role access tests

---

**No passwords or secrets in this document.**
