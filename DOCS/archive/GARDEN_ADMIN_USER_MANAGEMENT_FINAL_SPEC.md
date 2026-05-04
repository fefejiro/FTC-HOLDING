# Garden Admin User Management — Final Spec

**Date:** 2026-04-29
**Audience:** Founder, Dev, QA

---

## 1. Required UI
- **Users tab in admin portal**
  - Visible only to owner/admin roles
- **List/search users**
  - Table view: name, email, role, status (active/disabled), last login
  - Search by name/email
- **Create/invite user**
  - Form: name, email, role (owner/admin/operator/staff/customer)
  - Sends invite email (Supabase Auth)
- **Assign role**
  - Owner/admin can change any user's role (owner/admin/operator/staff/customer)
- **Disable/reactivate user**
  - Toggle active/disabled; disabled users cannot log in
- **Trigger password reset/invite**
  - Resend invite or password reset email

---

## 2. Required Backend/API
- **List users**
  - Paginated, filterable by role/status
- **Create user/invite**
  - Create Supabase Auth user, send invite
- **Update role**
  - Change user role in DB (RLS enforced)
- **Disable user**
  - Set status to disabled (cannot log in)
- **Reset invite**
  - Resend invite or password reset

---

## 3. Security
- Only owner/admin can access user management UI and APIs
- Staff/customer cannot see or access user management
- All privileged actions require server-side service_role/secret (never exposed to client)
- Audit log every privileged action (who, what, when)

---

## 4. UX
- Modern, simple, mobile-safe design
- Confirmation states for all destructive/privileged actions
- Clear error states (e.g., email in use, network error)
- No fake/test users in production

---

## 5. Acceptance Criteria
- Client owner can manage users (add, disable, change role, reset) without developer help
- Role changes take effect after refresh/login
- Unauthorized access (UI or API) is blocked and logged
- All actions are auditable

---

## 6. QA Plan
- Test as owner/admin: add, disable, reactivate, change role, reset invite for all roles
- Test as staff/customer: confirm no access to user management
- Attempt unauthorized API access: confirm blocked and logged
- Confirm audit log entries for all privileged actions
- Test on mobile and desktop
- Test error/confirmation states

---

> This spec is founder-facing and implementation-ready. No code is included. All requirements above must be met for client self-management of users.
