# Garden Cleaners Auth Alignment with FTC Auth Standard

This document tracks the current alignment and gaps between the Garden Cleaners portal authentication implementation and the FTC Auth Standard (see DOCS/FTC_AUTH_STANDARD.md).

---

## 1. Architecture Alignment
- **Auth Provider:** Supabase Auth (email/password, magic link)
- **Session:** Supabase client session, validated on server
- **Roles:** owner_admin, admin, operator, staff, customer
- **RBAC:** Role table and RLS enabled
- **Email:** Supabase hosted SMTP (branding limitation: sender display-name is fixed)
- **Audit:** No dedicated audit log table yet

---

## 2. Alignment Checklist
| Standard Area         | Garden Status         | Notes/Blockers                                  |
|----------------------|----------------------|-------------------------------------------------|
| Role table           | ✅ Implemented        | All roles present                               |
| RLS policies         | ✅ Implemented        | Per-role policies in place                      |
| Service key exposed  | ✅ Not exposed        | No service key in frontend                      |
| Audit log            | ❌ Missing            | Needs implementation                            |
| Custom SMTP          | ❌ Not configured     | Using Supabase hosted SMTP, branding limited     |
| Email templates      | ✅ Reviewed           | Templates match brand, but sender name limited   |
| Session validation   | ✅ Implemented        | Session checked on portal/dashboard              |
| Role-based redirect  | ✅ Implemented        | Admin/customer redirect logic present            |
| Admin UI             | ✅ Basic              | Can invite/reset/manage users, needs audit log   |
| QA checklist         | ✅ Done               | All roles, RLS, session, email flows tested      |
| Handoff docs         | ✅ Complete           | Client handoff docs delivered                    |
| Security gate        | 🟡 Partial            | Pending audit log and custom SMTP                |

---

## 3. Gaps and Recommendations
- **Audit Logging:** Implement audit log table and UI for owner_admin
- **Custom SMTP:** Configure and test custom SMTP for full sender branding
- **Security Gate:** Complete audit log and SMTP setup before claiming full compliance

---

## 4. References
- See: DOCS/FTC_AUTH_STANDARD.md
- See: skills/ftc-auth-foundation/SKILL.md
- See: PACKAGES/auth, PACKAGES/supabase
- See: DOCS/GARDEN_CLIENT_HANDOFF_PACKAGE.md
