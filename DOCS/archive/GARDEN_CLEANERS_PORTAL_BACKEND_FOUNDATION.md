# Garden Cleaners Portal Backend/Data Foundation (MVP)

## Environment Variables
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-side only, never exposed to frontend)
- GARDEN_CLEANERS_QUOTE_WEBHOOK_URL (optional, for notifications)

## Verification Steps
1. Apply all migrations in `supabase/migrations/` to your Supabase project.
2. Create at least one admin, staff, and customer profile in `garden_cleaners_profiles`.
3. Submit a quote via the public form and verify it appears in `garden_cleaners_quotes`.
4. As admin, convert a quote to a job in `garden_cleaners_jobs`.
5. Assign a staff member to a job using `garden_cleaners_job_assignments`.
6. As staff, verify you can see and update only your assigned jobs.
7. As customer, verify you can see only your own jobs/requests.
8. Attempt unauthorized access and confirm API rejects it.

## Security Notes
- All RLS policies are enforced at the database level.
- No secrets or service_role keys are present in the repo or sent to the frontend.
- All credentials must be managed securely in deployment.

## Migration File
- `supabase/migrations/202604290001_garden_cleaners_portal_mvp.sql` (profiles, jobs, assignments, RLS, triggers)

---

**MVP enables: quote → job → staff assignment → status update → customer/admin visibility.**

**Key rotation is deferred for now but remains a final pre-handoff security gate.**
