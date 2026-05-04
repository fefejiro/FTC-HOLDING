# Garden Cleaners Quote Supabase Migration Review

---

## 1. Migration Summary
This migration creates a dedicated `garden_cleaners_quotes` table for durable quote persistence, with indexes, row-level security (RLS), and an `updated_at` trigger. It is designed for safe, non-destructive deployment.

## 2. Tables, Indexes, Policies, Triggers Created
- **Table:** `garden_cleaners_quotes` (fields: id, name, email, phone, address, city, region, postal_code, property_type, service_type, service_frequency, preferred_date, preferred_time, message, status, source, raw_payload, created_at, updated_at)
- **Indexes:**
  - `idx_garden_cleaners_quotes_created_at` (created_at desc)
  - `idx_garden_cleaners_quotes_status` (status)
  - `idx_garden_cleaners_quotes_region` (region)
  - `idx_garden_cleaners_quotes_email` (email)
- **RLS Policies:**
  - `anon` insert allowed (public form submissions)
  - `authenticated` (admin) read/update/delete for `hello@unalabs.cloud`
- **Trigger:**
  - `garden_cleaners_quotes_updated_at` (auto-updates `updated_at` on row update)
- **Function:**
  - `set_garden_cleaners_quotes_updated_at()`

## 3. RLS Behavior
- **Insert:** Any unauthenticated (anon) user can insert (for public quote form)
- **Read/Update/Delete:** Only authenticated user with email `hello@unalabs.cloud` can read, update, or delete

## 4. Required Supabase Project/Env Assumptions
- Supabase project must have `pgcrypto` extension enabled for `gen_random_uuid()`
- Environment must provide correct Supabase URL and keys
- Admin user `hello@unalabs.cloud` must exist and be able to authenticate
- API uses anon key for inserts (sufficient for public form)

## 5. Pre-Apply Checks
- [ ] Confirm `pgcrypto` is enabled: `select * from pg_extension where extname = 'pgcrypto';`
- [ ] Confirm no existing table named `garden_cleaners_quotes`
- [ ] Confirm status values in check constraint match app: `new`, `triaged`, `scheduled`, `completed`, `cancelled`
- [ ] Confirm admin email matches intended admin (`hello@unalabs.cloud`)
- [ ] Confirm no destructive SQL (no drops except for trigger recreation)

## 6. Post-Apply Verification Queries
- [ ] Table exists: `select * from garden_cleaners_quotes limit 1;`
- [ ] Indexes exist: `select indexname from pg_indexes where tablename = 'garden_cleaners_quotes';`
- [ ] RLS policies: `select policyname, cmd, roles from pg_policies where tablename = 'garden_cleaners_quotes';`
- [ ] Trigger works: update a row, confirm `updated_at` changes
- [ ] Insert as anon, read as admin

## 7. Rollback/Corrective Migration Notes
- Migration is non-destructive (no data loss expected)
- If issues, drop table or policies as needed (only if no production data)
- For RLS/policy errors, update policies via dashboard or SQL
- For status constraint issues, alter constraint to match app

## 8. Risks or Questions
- **pgcrypto:** If not enabled, `gen_random_uuid()` will fail (enable via Supabase dashboard if needed)
- **Status constraint:** If app uses statuses not in constraint, inserts will fail
- **Anon insert:** Allows any user to submit; ensure API validation is strict
- **Admin policy:** Relies on exact email match; if admin email changes, update policy
- **Trigger:** Only affects `updated_at` on update, not insert
- **No destructive SQL:** Migration is safe to apply in production

---

**Migration Readiness Status:** READY WITH NOTES

**Top Risks:**
- `pgcrypto` extension must be enabled
- Status values must match app logic
- Admin email must be correct and able to authenticate
- RLS policies must be verified after apply

**No application code changes made.**
