
# Garden Portal QA Account Setup Result

**Date:** 2026-04-29

---

## Supabase CLI/Env Access
- Supabase CLI: **Missing** (not installed or not accessible in this environment)
- Supabase environment variables: **Not found** (`SUPABASE_URL`, `SUPABASE_ANON_KEY` not detected in accessible files)

---

## Can Create Auth Users
- **No** — Cannot create Supabase Auth users from this environment (CLI and env access blocked)

---

## Can Seed garden_cleaners_quotes
- **No** — Cannot seed garden_cleaners_quotes table from this environment (CLI and env access blocked)

---

## Required Env Vars (Status)
- `SUPABASE_URL`: **Missing**
- `SUPABASE_ANON_KEY`: **Missing**
- `NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS`: **Missing** (must include garden.admin.qa@unalabs.cloud)
- `NEXT_PUBLIC_GARDEN_PORTAL_STAFF_EMAILS`: **Missing** (optional, for non-@gardencleaners.ca staff)

---

## QA Accounts Planned
| Role      | Email                           | Status   |
|-----------|----------------------------------|----------|
| Customer  | garden.customer.qa@unalabs.cloud | Blocked  |
| Staff     | garden.staff.qa@gardencleaners.ca| Blocked  |
| Admin     | garden.admin.qa@unalabs.cloud    | Blocked  |

- All accounts must be created manually in Supabase Auth UI by the owner.

---

## Seed Record Status
- **Blocked** — No seed record created. Owner must insert a test record for garden.customer.qa@unalabs.cloud in garden_cleaners_quotes via Supabase SQL editor or admin UI.

---

## Credential Handoff Method
- Passwords/credentials must be set by the owner and delivered securely (never in docs or code). Use a secure channel (e.g., password manager, encrypted email, or in-person handoff).

---

## Exact Owner Action Needed
1. Install/configure Supabase CLI or use Supabase web UI.
2. Set all required environment variables in deployment.
3. Create the three QA accounts in Supabase Auth and verify emails.
4. Seed at least one garden_cleaners_quotes record for the customer QA account.
5. Deliver credentials securely to the QA team.
6. Confirm RLS policies and role mapping are correct for all accounts.

---

**No production user data was changed. All actions are doc-only and safe.**
