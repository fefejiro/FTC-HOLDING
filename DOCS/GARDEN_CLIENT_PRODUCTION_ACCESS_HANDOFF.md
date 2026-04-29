# Garden Cleaners Production Credential Handoff Plan

**Audience:** Founder/Owner (for production client handoff)
**Date:** 2026-04-29

---

## 1. Why QA Accounts Must Not Be Shared with the Client
- QA/test accounts are for internal validation only and may have elevated permissions, test data, or incomplete security controls.
- Sharing QA credentials risks exposing test data, breaking role boundaries, or leaking internal system details.
- Production client accounts must be created fresh, with unique credentials and proper role assignment, to ensure security and auditability.

---

## 2. Correct Production Account Model
| Role                | Purpose                                 | Example Email                  |
|---------------------|-----------------------------------------|-------------------------------|
| Client Owner/Admin  | Primary client operator, full access     | client.owner@clientdomain.com  |
| Staff/Cleaner       | Staff or cleaner, limited operational    | staff1@clientdomain.com        |
| Customer/Requester  | End-customer or test requester           | customer1@clientdomain.com     |

- Each user should have a unique email and role.
- Admin/owner accounts control staff invites and access.

---

## 3. Secure Credential Setup Steps (Supabase)
1. **Create/Invite User:**
   - Use Supabase Auth UI or API to invite the user by email (do not set a password directly).
2. **Assign Role:**
   - Use environment variables or role mapping logic to assign admin, staff, or customer roles based on email/domain.
3. **Require Password Reset/Invite Acceptance:**
   - User must accept invite and set their own password via secure link.
   - Never send or document passwords in the repo or any doc.
4. **Never Document Passwords:**
   - All credentials must be delivered via secure invite or password reset only.

---

## 4. Supabase Service Role Key Rotation Checklist (Before Handoff)
- [ ] Rotate the Supabase `service_role` key in the project settings.
- [ ] Update all backend deployments and CI/CD secrets with the new key.
- [ ] Remove any old/unused keys from all environments.
- [ ] Confirm no service or script is using the old key.

---

## 5. Client-Facing Handoff Checklist
| Item                | Value/Instructions                      |
|---------------------|-----------------------------------------|
| Login URL           | https://gardencleaners.ca/garden-cleaners/portal |
| Account Email       | [client.owner@clientdomain.com]         |
| Role                | Client Owner/Admin                      |
| Current Capabilities| Portal access, job/quote management, staff invite |
| Known Limitations   | [List any features in beta, known issues, or access restrictions] |
| Support/Reset       | Contact [support@gardencleaners.ca] for password reset or access issues |

- Provide this checklist to the client with their invite email (never send passwords).

---

## 6. Final QA Checklist for Client Account in Production
- [ ] Client can log in via portal URL
- [ ] Role and permissions are correct (admin, staff, customer)
- [ ] No access to test/QA data or internal-only features
- [ ] Can perform all expected actions (view jobs, manage staff, etc.)
- [ ] Password reset and support process tested
- [ ] All environment variables and keys are correct in production
- [ ] No secrets or credentials are present in any documentation or repo

---

**Never include passwords, service role keys, or private tokens in any documentation.**
