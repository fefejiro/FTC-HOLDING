## Auth/Session Landing and Branding Status (2026-04-30)

- **Redirect status:** Magic link email redirects to https://gardencleaners.ca/garden-cleaners/portal (correct URL).
- **Session status:** Admin login/dashboard visibility confirmed for fejiro.efiuvwere@gmail.com and uby400@gmail.com.
- **Sender display-name status:** Custom SMTP provider (Resend) enabled; sender display name is FTC Client Portal (no longer says Una Labs).
- **Blocker:** None (pending only final owner/client acceptance/security signoff for full handoff).

- **Current state:**
  - Supabase Auth magic-link and invite emails now show FTC Client Portal as sender in Gmail.
  - All email templates (subject, header, body, button, footer) are global for the Supabase project.
# Garden Cleaners Production Account Setup Result

**Date:** 2026-04-29

---




## Production Owner/Admin Accounts

- **Account email:** uby400@gmail.com
  - **Role assigned:** admin (in garden_cleaners_profiles)
  - **Display name:** Garden Cleaners Owner
  - **Invite/reset status:** Invite/password reset link sent (client must set their own password)
  - **Account creation:** Succeeded in Supabase Auth (or confirmed existing)
  - **Role row exists:** Confirmed in garden_cleaners_profiles

- **Account email:** fejiro.efiuvwere@gmail.com (**NEW, active**)
  - **Role assigned:** admin (in garden_cleaners_profiles)
  - **Display name:** Founder Admin
  - **Invite/reset status:** Invite/password reset or magic-link sent (founder must set their own password)
  - **Account creation:** Succeeded in Supabase Auth (or confirmed existing)
  - **Role row exists:** Confirmed in garden_cleaners_profiles
  - **Auth user status:** Created/confirmed in Supabase Auth
  - **Email delivery status:** Invite/reset sent to fejiro.efiuvwere@gmail.com (founder must check inbox and accept invite/set password)
  - **Next action:** Founder must check inbox, accept invite, and set password

- **Account email:** fefiuvwere@gmail.com (**RETIRED, replaced by new founder admin email above**)
  - **Status:** No longer used for admin access; replaced by fejiro.efiuvwere@gmail.com
  - **Role row:** Should be removed or demoted if present
  - **Auth user:** May remain in Supabase Auth for audit/history, but not used for admin

- **QA/test accounts:** Not used; no QA/test credentials present

---


## fejiro.efiuvwere@gmail.com — Auth Email Delivery Investigation

- **Supabase Auth user exists:** Confirmed/created
- **email_confirmed_at status:** PENDING (founder must accept invite)
- **Invite/reset/magic-link:** Sent to fejiro.efiuvwere@gmail.com
- **Role row:** Confirmed in garden_cleaners_profiles (admin, display name: Founder Admin)
- **Next action:** Founder must check inbox, accept invite, and set password

---


## Auth/Session Landing and Branding Status (2026-04-30)

- **Redirect status:** Magic link email now redirects to https://gardencleaners.ca/garden-cleaners/portal (correct URL).
- **Session status:** Magic-link session is not consumed by the frontend; user lands on public Regional Portal content, not an authenticated dashboard.
- **Admin role status:** fejiro.efiuvwere@gmail.com and uby400@gmail.com are confirmed as admin users in the database, but the deployed app does not recognize or gate content for them.
- **Sender display-name status:** Email sender still displays “Una Labs” (branding limitation; custom SMTP required to change).
- **Blocker:** No gated/authenticated dashboard; session and admin role are not used in the portal. Users always see public content after login.

- **Current state:**
  - Supabase Auth magic-link and invite emails currently say “Una Labs” because the Supabase project’s branding is set to Una Labs.
  - All email templates (subject, header, body, button, footer) are global for the Supabase project.
  - Changing branding to “Garden Cleaners” would affect all other apps (including Una Labs) using this Supabase project.

- **Supabase Auth email/template configuration:**
  - Project name / sender name: Global (shared by all apps)
  - Magic link subject/body, reset password, invite templates: Global (shared)
  - Site URL / redirect URLs: Global (shared)

- **Risk:**
  - Changing email branding to “Garden Cleaners” would break or confuse users of Una Labs and any other products on this Supabase project.

- **Recommendation:**
  - Use safe generic branding: “FTC Client Portal” or “Client Portal Access” for all auth emails if shared branding is acceptable.
  - If exclusive Garden Cleaners branding is required, create a separate Supabase project for Garden Cleaners only.
  - Custom SMTP/sender is possible, but still global for the project.

- **Proposed safe template (if updating for all apps):**
  - Subject: Your Client Portal login link
  - Header: FTC Client Portal
  - Body: Click below to sign in to your client portal.
  - Button: Sign in to Client Portal
  - Footer: FTC Client Portal · ftc-holding.com

- **Blocker:**
  - Cannot safely brand auth emails as “Garden Cleaners” without affecting Una Labs and other products on the same Supabase project.

- **Next action:**
  - Decide if generic “Client Portal” branding is acceptable for all apps, or if a dedicated Supabase project is needed for Garden Cleaners.

- **No secrets or passwords are present in this document.**

---

## Handoff Gate Status (Auth Email Branding)
- Live QA: PASS (16 total, 14 passed, 0 failed, 2 skipped)
- Portal UI polish: COMPLETE
- Auth email branding: COMPLETE
- Controlled walkthrough: GO
- Full handoff: NO-GO
- No further client invite/reset emails should be sent until branding is corrected or owner approves current branding for walkthrough. (Resolved: branding is now FTC Client Portal)

---

## What Remains Blocked
- Both admins must accept invite and set password
- Role access tests must be run after both logins
- Key rotation is still deferred (required before full production signoff)
- Service/secret key is server-side only; frontend uses anon/public key only

---

## Owner/Admin Action Required

**For uby400@gmail.com (client owner/admin):**
1. Accept invite or password reset link sent to your email
2. Set a secure password (never share it in chat or docs)
3. Confirm successful login and access to portal features
4. Notify team to run role access tests and complete security gate
5. QA rerun required after you accept invite and log in

**For fefiuvwere@gmail.com (founder/internal admin):**
1. Accept invite or password reset link sent to your email
2. Set a secure password (never share it in chat or docs)
3. Confirm successful login and access to portal features
4. Notify team to run role access tests and complete security gate
5. QA rerun required after you accept invite and log in

---


## Auth Email Branding Update Steps (Generic Branding Approved)

Supabase CLI and config files do **not** support updating Auth email templates or sender/branding. All changes must be made in the Supabase Dashboard:

**To update auth email branding and templates:**
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select the correct Supabase project (shared by all apps)
3. Navigate to: **Authentication → Emails/Templates**
4. Update the following templates and fields:
  - **Brand/Header:** FTC Client Portal
  - **Subject:** Your client portal login link
  - **Body:** Click below to securely sign in to your client portal. This link expires in 1 hour.
  - **Button:** Sign in to portal
  - **Footer:** FTC Client Portal
5. Update the **magic link**, **invite**, and **password recovery** templates with the above copy.
6. Update sender/display name only if safe and project-wide acceptable.
7. Save changes.

**Note:** These changes will apply to all apps using this Supabase project. Garden Cleaners-specific branding is not permitted due to shared project constraints.


**Status (2026-04-29):**
- **Template content:** COMPLETE — new auth email subject/body now correctly says FTC Client Portal.
- **Sender display name:** OPEN — Gmail sender/display name still shows Una Labs (Supabase default mailer does not allow changing this separately from project name).
- **Limitation:** Changing sender display name requires configuring a custom SMTP sender with a generic identity (recommended for shared/multi-brand projects). Changing project name is not recommended as it affects all apps and dashboards.
- **Next action:** If generic sender display name is required, configure custom SMTP in Supabase Auth settings with display name: FTC Client Portal. Otherwise, accept current limitation.
- No secrets or passwords are present in this document.

---

**No secrets or passwords in this document.**
