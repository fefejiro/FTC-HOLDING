# FTC Auth Standard

A reusable, production-ready authentication and role-based access control (RBAC) architecture for all FTC/Una Labs client portals. This standard ensures secure, auditable, and scalable authentication, session management, and admin operations across all projects.

---

## 1. Architecture Overview
- **Auth Provider:** Supabase Auth (email/password, magic link, optional OAuth)
- **Session:** Supabase client session, persisted in browser, validated on server
- **Roles:** owner_admin, admin, operator, staff, customer, una_labs_super_admin
- **RBAC:** Enforced via role tables and RLS (Row Level Security)
- **Email:** Custom SMTP for sender branding and compliance
- **Audit:** All auth and role changes logged

---

## 2. Role Model
| Role                  | Description                        | Portal Access           |
|-----------------------|------------------------------------|------------------------|
| owner_admin           | Top-level owner, full control      | All admin UIs          |
| admin                 | Admin, user management             | Admin dashboard        |
| operator              | Staff with elevated ops access     | Operator dashboard     |
| staff                 | Regular staff, limited ops         | Staff dashboard        |
| customer              | End user/customer                  | Customer portal        |
| una_labs_super_admin  | FTC/Una Labs support/ops           | All portals (support)  |

---

## 3. RLS & Database Checklist
- [ ] Role table with all required roles
- [ ] RLS enabled on all sensitive tables
- [ ] Policies for each role (read, write, admin)
- [ ] Service role key never exposed to frontend
- [ ] Audit log table for auth/role changes

---

## 4. Email & SMTP Checklist
- [ ] Custom SMTP configured for production
- [ ] Sender display-name and reply-to set
- [ ] All templates reviewed for brand/compliance
- [ ] Magic link/redirect URLs set for all environments
- [ ] Known limitation: Supabase hosted sender display-name cannot be changed; use custom SMTP for full branding

---

## 5. Session & Redirect Checklist
- [ ] Session validated on every page load
- [ ] Role-based redirect logic (admin → dashboard, customer → portal, etc.)
- [ ] Session expiration and sign-out tested
- [ ] No session or role leaks to public routes

---

## 6. Admin Management Checklist
- [ ] Admin UI for inviting, resetting, and managing users
- [ ] Role assignment and change audit log
- [ ] Owner_admin can see all audit logs
- [ ] No admin action exposes service role or secrets

---

## 7. QA & Handoff Checklist
- [ ] All roles tested (admin, staff, customer)
- [ ] RLS policies verified for each role
- [ ] Session and redirect flows tested
- [ ] Email flows tested (invite, reset, magic link)
- [ ] No service role or secret exposed
- [ ] Docs updated (auth, roles, RLS, SMTP, QA)
- [ ] Client walkthrough completed
- [ ] Security handoff gate passed
- [ ] Written acceptance of any remaining limitations

---

## 8. What Not to Claim Before Security Gate
- Do **not** claim full branding if using Supabase hosted SMTP (sender display-name is fixed)
- Do **not** claim MFA or SSO unless implemented and tested
- Do **not** claim role-based access unless RLS and UI are both enforced
- Do **not** claim audit logging unless logs are visible and tested

---

## 9. Audit Logging & Monitoring
- All auth and role changes must be logged
- Owner_admin and una_labs_super_admin must have access to audit logs
- Regular review of logs for suspicious activity

---

## 10. Production Migration & Account Setup
- [ ] Production Supabase project created
- [ ] Custom SMTP credentials set and tested
- [ ] All environment variables set (public, secret, service)
- [ ] Admin and owner_admin accounts created and verified
- [ ] All QA and handoff checklists completed

---

## 11. Recommended Auth Helpers (PACKAGES/auth)

The following helpers are recommended for all FTC/Una Labs portals and admin surfaces:

- `normalizeEmail(email: string): string` — Lowercase and trim email addresses for consistency
- `authRedirectTo(path: string, origin?: string): string` — Build absolute redirect URLs for auth flows
- `resetPasswordForEmail(email: string, redirectTo?: string)` — Send password reset email
- `updatePassword(newPassword: string)` — Update the current user's password
- `getUser()` — Get the current user (if any)
- `isAdminRole(role?: string | null): boolean` — Returns true if the role is admin/owner_admin/una_labs_super_admin

See also:
- skills/ftc-auth-foundation/SKILL.md
- PACKAGES/auth, PACKAGES/supabase
- DOCS/GARDEN_AUTH_ALIGNMENT_WITH_FTC_STANDARD.md
