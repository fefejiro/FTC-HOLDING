## Garden Cleaners Production Client Access Handoff

**Date:** April 29, 2026

---

### 1. Current Production-Readiness Status
- Public site is live and accessible.
- Quote persistence (database-backed) is live and operational.
- Credentialed portal QA has passed (internal accounts only).
- **Production client account has NOT yet been created.**

---

### 2. QA Accounts Are Internal Only
All QA and test accounts used during development and QA are for internal use only. **They must never be shared or repurposed as client production accounts.**

---

### 3. Production Account Setup
For production client access, the following accounts should be created:

- **Client Owner/Admin Account:**
  - Primary account for the client/founder.
  - Has full access to client portal features and management actions.
- **Staff/Cleaner Accounts:**
  - For individual staff or cleaners who require portal access.
  - Limited to their assigned permissions.
- **(Optional) Customer Test Account:**
  - For client-side testing of customer experience (optional, not required for go-live).

---


### 4. Supported Authentication Methods
Garden Cleaners portal supports the following authentication methods:
- **Supabase email/password**
- **Magic link / OTP** (one-time password via email)
- **Invite and password reset flows**

**Unsupported:** Google or social OAuth is not implemented.

To securely onboard production users:
1. **Create user(s) in Supabase Auth** (via dashboard or admin UI).
2. **Assign the correct role** in the database (admin, staff, client) via environment allowlists, admin UI, or direct DB profile management.
3. **Send password reset or invite link** to the user’s email address.
4. **Never store or transmit passwords in documentation or email.**
5. Confirm user can log in and access the correct portal features.

---


### 5. Pre-Handoff Security Gate
- **Service role/key rotation is deferred for now, but is required before final external handoff.**
- Rotation must be coordinated with environment variable updates, redeployment, and post-rotation QA.
- Do not rotate keys or update secrets until all parties are ready and a coordinated plan is in place.
- **Handoff status:** Controlled walkthrough GO; full handoff HOLD until owner acceptance, security signoff, and key rotation or explicit deferral.

---

### 6. Client Handoff Checklist
- **Login URL:** [https://garden-cleaners.yoursite.com/portal](https://garden-cleaners.yoursite.com/portal)
- **Roles:** admin, staff, client (assigned via env allowlists, admin UI, or DB)
- **What client can do today:**
  - Access portal dashboard
  - View and manage quotes
  - Manage staff/cleaner accounts (if enabled)
  - View status and history
- **Admin UI capabilities:**
  - Invite/resend invite, password reset, disable/enable, role update, user listing
- **Audit logging:** Admin user-management actions are logged to `garden_cleaners_audit_log` where implemented. Broader dashboard telemetry is recommended for future.
- **What is still coming:**
  - Additional reporting features
  - Broader telemetry/dashboard sync (future)
  - Enhanced notifications
  - Any other planned improvements (list specifics if known)
- **Support/reset process:**
  - If access issues occur, client should contact support or the founder for password reset or account help.
  - Use Supabase Auth password reset flow; never send passwords directly.

---

### 7. Founder Signoff

| Step | Owner | Date | Complete? |
|------|-------|------|-----------|
| Production account created |  |  |  |
| Role assigned |  |  |  |
| Password reset/invite sent |  |  |  |
| Client login verified |  |  |  |
| Security gate (key rotation) scheduled |  |  |  |
| Final handoff complete |  |  |  |

---

**No secrets or passwords are included in this document. All production credentials must be delivered securely and never written in docs.**
