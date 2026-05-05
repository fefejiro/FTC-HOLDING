# Client Onboarding Playbook (Una Labs)

This is the **single canonical process** for onboarding any paid client into the Una Labs admin / dashboard / client portal pipeline. It is auditable, idempotent, and works for E-transfer, Stripe, cash, cheque, and wire payments.

> Every paid client must be recorded through this path. No more ad-hoc inserts.

## Why
- Single source of truth in Supabase (`projects`, `milestones`, `invoices`, `payment_records`).
- Paper trail: every payment becomes a row in `payment_records` with method + reference + recorded_by.
- Idempotent: safe to re-run; no duplicates.
- Replicable: same recipe for Garden Cleaners, OG Trades Academy, PeacePad clients, etc.

## What gets created per client
1. `projects` row (status = `active`, billing = `etransfer` | `stripe` | …).
2. `milestones` rows (the standard intake → handover phases, customizable per client).
3. `invoices` row (status = `paid` if amount > 0, with `payment_method` + `payment_reference`).
4. `payment_records` row (append-only audit log of the actual money received).

## Schema dependencies
Migrations applied via `supabase db push --linked`:
- [202604260001_payment_audit.sql](../supabase/migrations/202604260001_payment_audit.sql) — adds payment audit columns + `payment_records` table.
- [202604260002_onboard_client_function.sql](../supabase/migrations/202604260002_onboard_client_function.sql) — the SQL function `public.onboard_client_project(...)`.

## Onboarding a new client (3 steps)

### 1. Pick / create a seed file
Copy a template:
```powershell
Copy-Item DOCS/onboarding/seed-garden-cleaners.sql DOCS/onboarding/seed-<slug>.sql
```

### 2. Fill in the placeholders
Replace every `REPLACE_…` with real values:
- `p_intake_id` — short slug + month (e.g. `gardencleaners-2026-04`). Must be unique forever per client engagement.
- `p_email` — client's primary contact email (this controls portal access).
- `p_name` — client business name.
- `p_description` — one-sentence scope.
- `p_tier` — one of: `starter`, `professional`, `agency`, `enterprise`, `simple_activation`, `standard_activation`, `complex_activation`, `founding_pilot_activation`.
- `p_billing` — `stripe` | `etransfer` | `cash` | `cheque` | `wire` | `manual`.
- `p_milestone_titles` — array of phase names. Customize per project; default is intake → handover.
- `p_invoice_amount` — CAD amount paid. **Use 0 if no payment yet** (no invoice is created).
- `p_payment_method` — must match one of `stripe`, `etransfer`, `cash`, `cheque`, `wire`, `manual`, `other`.
- `p_payment_reference` — E-transfer confirmation number, Stripe `pi_…`, cheque number, etc.
- `p_paid_at` — ISO timestamp the money cleared.
- `p_recorded_by` — your admin email.

### 3. Apply
**Option A — Supabase SQL editor (easiest):**
1. Open https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/sql.
2. Paste the contents of your filled-in `seed-<slug>.sql`.
3. Run.
4. Verify with the commented `select` queries at the bottom.

**Option B — psql / CLI:**
```powershell
$env:DATABASE_URL = "<linked db url from supabase>"
psql $env:DATABASE_URL -f DOCS/onboarding/seed-<slug>.sql
```

After it completes:
- The project appears in `/admin` on Una Labs.
- The client can log in at `/login` with their email and see milestones + invoice in `/dashboard`.
- The payment is logged forever in `payment_records`.

## Updating an existing client
Re-run the same seed file. The function:
- Updates `projects` core fields (name, description, tier, billing, status).
- Adds any new milestones missing from the project.
- Does **not** duplicate the invoice or payment_record (matched by `payment_reference`).

## Recording a follow-up payment (after onboarding)
Use a small SQL snippet (do not re-run the full seed):
```sql
insert into payment_records (project_id, invoice_id, amount_cad, method, reference, received_at, recorded_by, notes)
values (
  (select id from projects where intake_id = 'gardencleaners-2026-04'),
  null,                       -- or specific invoice id
  500.00,
  'etransfer',
  'CONF-XXXXXXXX',
  '2026-05-15T14:00:00Z',
  'hello@unalabs.cloud',
  'Phase 2 milestone payment'
);
```

## Generating a receipt / invoice document
The `invoices` row IS the invoice of record. To produce a PDF/HTML receipt for the client:
1. Open `/admin` and copy the invoice number + amount + payment_reference.
2. (Future automation) The Stripe Worker `workers/stripe-api` can be extended with a `/api/admin/invoices/:id/receipt` endpoint that renders a printable HTML page.

Until that endpoint exists, use the `invoices` + `payment_records` rows as the auditable source of truth, and produce a PDF manually via the admin UI when the email-receipt feature is needed.

## Hard rules (do not break)
- Never insert directly into `projects` / `invoices` / `payment_records`. Always go through `onboard_client_project()` for the initial onboarding.
- Always set `payment_reference` (no blanks). Even cash payments should record the cheque number, witness name, or email confirmation reference.
- Never delete `payment_records`. Reverse a payment by inserting a negative-amount record with `notes` explaining the reversal.

## Active clients seeded with this playbook
- Garden Cleaners — see [seed-garden-cleaners.sql](onboarding/seed-garden-cleaners.sql)
- OG Trades Academy — see [seed-og-trades.sql](onboarding/seed-og-trades.sql)

## Supabase project reference
- Ref: `aaaextkrfoqomzmjjkxe`
- Admin email (RLS gate): `hello@unalabs.cloud`
- Admin URL: https://unalabs.cloud/admin
