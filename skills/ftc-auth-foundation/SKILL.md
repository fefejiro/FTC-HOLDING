---
name: ftc-auth-foundation
description: Reusable authentication and role-based access control foundation for all FTC/Una Labs client portals. Use for new portals, admin dashboards, and any app requiring secure, auditable, and scalable auth.
---

# FTC Auth Foundation Skill

## When to Use
- Building a new client portal, admin dashboard, or operator tool
- Migrating an existing app to FTC/Una Labs auth standard
- Auditing or upgrading authentication, session, or role logic

## Required Inputs
- Project name and live URL
- Supabase project ref and environment (dev/staging/prod)
- List of required roles (owner_admin, admin, operator, staff, customer, una_labs_super_admin)
- Email sender/branding requirements
- Custom SMTP credentials (for production handoff)

## Files to Inspect
- PACKAGES/auth
- PACKAGES/supabase
- App's auth/session logic (login, signup, reset, invite, magic link)
- Role tables and RLS policies
- Email template and SMTP config
- QA and handoff docs


## Implementation Phases
1. Supabase project setup and environment config
2. Database/schema/RLS setup
3. Frontend login UX and session handling
4. Admin user management UI
5. Email/SMTP setup and template QA
6. QA and handoff checklist
7. **Auth Helper Implementation**
	 - Use/review the following helpers from PACKAGES/auth:
		 - `normalizeEmail(email)`
		 - `authRedirectTo(path, origin?)`
		 - `resetPasswordForEmail(email, redirectTo?)`
		 - `updatePassword(newPassword)`
		 - `getUser()`
		 - `isAdminRole(role)`

## Supabase Setup Checklist
- Project created and linked
- Public and service keys managed securely
- Custom SMTP configured before production handoff
- Site URL and redirect URLs set for all environments

## Database/Schema/RLS Checklist
- Role table with all required roles
- RLS enabled and policies for each role
- Service role never exposed to frontend
- Audit logging for auth and role changes

## Frontend Login UX Checklist
- Password login as primary
- Forgot/reset password flow
- Invite/set-password flow
- Magic link as optional fallback
- Google/OAuth as optional
- MFA roadmap documented
- Session/redirect logic tested

## Admin User Management Checklist
- Admins can invite, reset, and manage users
- Role assignment UI
- Audit log visible to owner_admin

## Email/SMTP Checklist
- Custom SMTP sender configured
- Email templates reviewed for brand and compliance
- Sender display-name verified in Gmail/Outlook

## QA Checklist
- All roles tested (admin, staff, customer)
- RLS policies verified for each role
- Session and redirect flows tested
- Email flows tested (invite, reset, magic link)
- No service role or secret exposed

## Handoff Checklist
- Docs updated (auth, roles, RLS, SMTP, QA)
- Client walkthrough completed
- Security handoff gate passed
- Written acceptance of any remaining limitations

## Common Failure Modes
- Magic link lands on wrong domain or route
- Sender name shows wrong brand
- Role exists in DB but UI does not recognize it
- Public env missing or misconfigured
- Service role key exposed to frontend
- RLS blocks valid user
- Admin can see data but staff/customer cannot

## Final GO/NO-GO Rules
- GO: All QA, docs, and security gates passed; sender display-name correct or accepted
- NO-GO: Any critical auth, role, RLS, or SMTP blocker remains
