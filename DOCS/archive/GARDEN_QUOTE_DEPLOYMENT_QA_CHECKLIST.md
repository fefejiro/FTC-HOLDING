# Garden Cleaners Quote Persistence: Deployment QA Checklist

**Final QA State (2026-04-29):**
- Garden Cleaners quote form is live and persists to Supabase in production.
- All QA checklist items completed and verified.
- No further infra actions required; Railway is documentation-only for this service.

---

## 1. Pre-Deploy Checklist
- [x] Confirm `supabase/migrations/202604280001_garden_cleaners_quotes.sql` exists and is correct
- [x] Confirm correct Supabase project is targeted (production, not staging)
- [x] Confirm app runtime env vars are set:
    - `NEXT_PUBLIC_SUPABASE_URL` or `VITE_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`
    - `GARDEN_CLEANERS_QUOTE_WEBHOOK_URL` (optional notification only)
- [x] Confirm Supabase CLI/dashboard access for applying the migration
- [x] Confirm admin email policy includes `hello@unalabs.cloud` as admin
- [x] Confirm Garden build passes from repo root: `npm --workspace=@ftc/ftc-site run build`

## 2. Migration Application Steps
- [x] Apply migration:
    - `supabase db push` (if using CLI)
    - Or run SQL in Supabase dashboard SQL editor
- [x] Verify table exists:
    - `select count(*) from garden_cleaners_quotes;`
- [x] Verify RLS policies exist for table:
    - `select policyname, cmd, roles from pg_policies where tablename = 'garden_cleaners_quotes';`
- [x] Verify indexes exist:
    - `select indexname from pg_indexes where tablename = 'garden_cleaners_quotes';`

## 3. API Verification
- [x] Invalid payload returns 400/422:
    - Submit missing `address`, invalid `email`, or too-fast `startedAt`, expect validation error
- [x] Valid payload returns 200:
    - Submit all required fields, expect success
    - Use a clearly disposable email such as `garden-qa@example.com`
- [x] Missing-table behavior is documented:
    - In staging only, a missing table should return 500
    - Do not rename or drop the production table for this test
- [x] Check error messages are clear and do not leak secrets

## 4. Supabase Verification Queries
- [x] Newest quotes:
    - `select * from garden_cleaners_quotes order by created_at desc limit 20;` — QA row found for `hello+garden-qa-20260429@unalabs.cloud`
- [x] Quotes by status:
    - `select * from garden_cleaners_quotes where status = 'new';` — QA row present with status 'new'
- [x] Quotes by region:
    - `select * from garden_cleaners_quotes where region = 'Oshawa';` — QA row present for region 'Oshawa'
- [x] Update status from new to triaged:
    - `update garden_cleaners_quotes set status = 'triaged' where id = '<QA_ROW_ID>' and status = 'new';` — Confirmed works
- [x] Rollback/delete only test records:
    - `delete from garden_cleaners_quotes where email = 'hello+garden-qa-20260429@unalabs.cloud';` — QA row deleted after verification

## 5. Production Smoke Test Steps
- [x] Submit quote from Garden quote endpoint (https://gardencleaners.ca/garden-cleaners/quote)
- [x] Confirm new row appears in Supabase table (QA row for `hello+garden-qa-20260429@unalabs.cloud`)
- [x] Confirm webhook is not required for success
- [x] Confirm user-facing success message is shown

### QA Evidence (2026-04-29)
- **Negative cases:**
    - Invalid email: correctly rejected, error shown
    - Missing address/city: correctly rejected, error shown
    - Short message: correctly rejected, error shown
    - Fast-submit bot guard: correctly rejected, error shown
- **Positive case:**
    - Valid submit with all fields: accepted, Supabase row created
    - Row found in `garden_cleaners_quotes` with correct data
    - User-facing success message displayed
- **QA row:**
    - Created for `hello+garden-qa-20260429@unalabs.cloud`, then deleted after verification

## 6. Rollback Plan
- [ ] If deploy fails:
    - Revert deployment to previous stable version
- [ ] If migration fails:
    - Do not deploy the new API
    - Fix migration error in staging or apply a corrective migration
- [ ] If quote submits return 500:
    - Check migration, env vars, and Supabase connection
- [ ] To temporarily revert to webhook-only behavior:
    - Roll back the site deployment to the previous stable build
    - Keep `GARDEN_CLEANERS_QUOTE_WEBHOOK_URL` configured if webhook-only fallback is needed

## 7. Open Owner Actions
- [x] Apply migration to production Supabase
- [x] Confirm Supabase credentials in deployment environment
- [x] Confirm `hello@unalabs.cloud` can authenticate and is covered by the admin RLS policies
- [x] QA row for `hello+garden-qa-20260429@unalabs.cloud` deleted after test

---

**Risks/Notes:**
- Migration must be applied before deploying new API or Pages worker code
- Supabase credentials must match target environment
- RLS/admin policy must be correct or admin access will fail
- Rollback plan should be tested in staging before production
