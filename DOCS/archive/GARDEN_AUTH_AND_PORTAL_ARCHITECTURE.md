# Garden Cleaners Auth & Portal Architecture

**Role:** Senior Backend/Security Architect
**Date:** 2026-04-29

---

## 1. Recommended Architecture
- **Supabase Auth:**
  - Handles all user authentication, password resets, email verification, and session management.
  - Remains the single source of identity for all portal users (admin, staff, customer).
- **Supabase DB:**
  - Stores user roles, quotes, jobs, assignments, and all operational data.
  - Role mapping is managed via a dedicated roles/profile table.
- **Railway API:**
  - Hosts privileged backend/admin endpoints for operational actions (user management, job assignment, etc.).
  - Only accessible with valid Supabase Auth tokens and proper role checks.
- **Cloudflare Pages:**
  - Serves the public site and portal UI.
  - All frontend auth flows (login, reset, session) use Supabase Auth directly.

---

## 2. Why Not Build Custom Auth Fully on Railway
- **Password Security:**
  - Supabase Auth provides secure password hashing, storage, and reset flows. Custom Railway auth would require building and maintaining this securely (high risk).
- **Reset/Email Verification:**
  - Supabase handles email verification, password reset, and invite flows out of the box. Custom flows are error-prone and increase support burden.
- **Session Handling:**
  - Supabase issues secure JWTs and manages session expiry/refresh. Custom session logic is complex and a common source of vulnerabilities.
- **Rate Limiting:**
  - Supabase Auth includes built-in rate limiting for login and reset endpoints. Custom endpoints would require additional infra and tuning.
- **Audit Risk:**
  - Using a proven auth provider reduces audit and compliance risk. Custom auth increases the attack surface and audit scope.
- **Extra Maintenance:**
  - Every custom auth feature (reset, invite, MFA, etc.) adds long-term maintenance and security review overhead.

---

## 3. Role Model
| Role                | Description                                 |
|---------------------|---------------------------------------------|
| client_owner/admin  | Primary client operator, full admin rights  |
| operator            | Internal operator (Una Labs/FTC support)    |
| staff/cleaner       | Staff or cleaner, operational access        |
| customer            | End-customer or requestor                   |
| una_labs_super_admin| Platform-level super admin (Una Labs only)  |

- Roles are mapped in Supabase DB and checked by Railway API.

---

## 4. Required Railway API Endpoints
- `POST   /admin/users`           — Create/invite new user
- `PATCH  /admin/users/:id/role`  — Change user role
- `PATCH  /admin/users/:id/disable` — Disable user
- `GET    /admin/users`           — List users
- `GET    /admin/quotes`          — List all quotes
- `POST   /admin/jobs`            — Create new job
- `PATCH  /admin/jobs/:id/assign` — Assign job to staff
- `PATCH  /staff/jobs/:id/status` — Staff updates job status
- `GET    /me`                    — Get current user profile/role
- `GET    /customer/requests`     — Customer views their requests

---

## 5. Security Model
- Frontend obtains Supabase access token (JWT) after login.
- Frontend sends JWT as Bearer token to Railway API.
- Railway verifies JWT using Supabase JWT secret or JWKS endpoint.
- Railway checks user role from Supabase profile/role table before allowing privileged actions.
- Supabase `service_role` key is used **server-side only** (never exposed to browser or frontend code).
- All privileged actions (user/role/job changes) are audit-logged in a dedicated table.

---

## 6. Production Account Handoff
- Create a real client owner/admin account in Supabase Auth (do not use QA/test accounts).
- Send invite or password reset link to client owner (never send passwords directly).
- Rotate any pasted or previously shared `service_role` key before client access.
- Provide client with login URL, account email, and support/reset instructions.

---

## 7. Build Phases
- **Phase 1:** Documentation and schema review (roles, RLS, API contract)
- **Phase 2:** Implement Railway admin API (privileged endpoints, JWT verification, audit log)
- **Phase 3:** Build portal admin UI (user/job management, role assignment)
- **Phase 4:** Implement staff/customer workflows (job status, request tracking)
- **Phase 5:** Hardening (audit logs, rate limiting, security review, production handoff)

---

**No secrets, passwords, or service keys are included in this document.**
