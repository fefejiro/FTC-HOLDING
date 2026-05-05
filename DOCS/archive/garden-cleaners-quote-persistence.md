# Garden Cleaners Quote Persistence Handoff & Runbook

**Final Live State (2026-04-29):**
- Garden Cleaners quote form is deployed to Cloudflare Pages and persists to Supabase (`garden_cleaners_quotes` table).
- Cloudflare Pages worker and API both use production Supabase secrets.
- Migration applied, QA test row verified in production Supabase.
- No further infra actions required; Railway is documentation-only for this service.
- See QA checklist for proof and rollback steps.

## Table Name
- `garden_cleaners_quotes`

## Fields
- id uuid primary key default gen_random_uuid()
- name text not null
- email text not null
- phone text
- address text
- city text
- region text
- postal_code text
- property_type text
- service_type text
- service_frequency text
- preferred_date text
- preferred_time text
- message text
- status text not null default 'new'
- source text not null default 'garden_cleaners_quote_form'
- raw_payload jsonb not null default '{}'::jsonb
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

## Indexes
- created_at desc
- status
- region
- email

## RLS Policies
- `anon` insert is allowed for quote form submissions.
- Authenticated admin `hello@unalabs.cloud` can read/update/delete.
- `updated_at` is maintained by a table trigger on update.

## Required Env Vars
- `NEXT_PUBLIC_SUPABASE_URL` (or VITE_SUPABASE_URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or VITE_SUPABASE_ANON_KEY)
- `GARDEN_CLEANERS_QUOTE_WEBHOOK_URL` (optional, for webhook forwarding)

For the live Cloudflare Pages project `gardencleaners`, the two Supabase values are configured as encrypted production secrets. The Garden Pages worker uses the same values because `/api/garden-cleaners-quote` is handled by `APPS/ftc-site/public/_worker.js` in production.

## Deployment State
Completed on 2026-04-29:

1. Applied `supabase/migrations/202604280001_garden_cleaners_quotes.sql` to linked Supabase project `aaaextkrfoqomzmjjkxe`.
2. Verified the table exists.
3. Set Cloudflare Pages production secrets on `gardencleaners`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Built Garden with `FTC_SITE_EDGE_WORKER=garden`.
5. Deployed to Cloudflare Pages:
   - `https://8b9d7406.gardencleaners.pages.dev`
6. Submitted one valid production quote test.
7. Confirmed the row appears in `garden_cleaners_quotes`.

Deploying the API or Pages worker before the migration is applied will cause valid quote submissions to return a persistence error because the table does not exist yet.

## Verification Query (Supabase SQL)
```
select * from garden_cleaners_quotes order by created_at desc limit 20;
```

## API Test Example
```
curl -X POST https://<your-site>/api/garden-cleaners-quote \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "123-456-7890",
    "address": "123 Main St",
    "city": "Oshawa",
    "region": "Oshawa",
    "postalCode": "A1A 1A1",
    "propertyType": "House",
    "serviceNeeded": "Deep Cleaning",
    "preferredDate": "2026-05-01",
    "preferredTime": "Morning",
    "frequency": "One-time",
    "message": "Please clean the kitchen and living room."
  }'
```

## Admin/Ops: How to Find New Quotes
- Log in to Supabase as admin (hello@unalabs.cloud)
- Run the verification query above
- Filter by status, region, or email as needed

## Build/Test
- Run targeted build/check for ftc-site:
  - From repo root: `npm --workspace=@ftc/ftc-site run build`
- Run `git diff --check` to ensure no whitespace or merge issues

## Validation
- Invalid quote payload returns 400
- Valid quote payload persists to Supabase
- Webhook remains optional (secondary notification)
- Admin can read/update/delete via Supabase

Latest production smoke test:

- URL: `https://gardencleaners.ca/api/garden-cleaners-quote`
- Test email: `hello+garden-qa-20260429@unalabs.cloud`
- Result: API returned success and Supabase row was created with `status = 'new'`, `region = 'Oshawa'`, and `service_type = 'Deep Cleaning'`.

## Anything Still Requiring Owner Access
- Admin login setup in Supabase must match policy (`hello@unalabs.cloud`) for dashboard/operator access.
- If RLS or admin policies need further setup, see Supabase dashboard > Auth > Policies.
