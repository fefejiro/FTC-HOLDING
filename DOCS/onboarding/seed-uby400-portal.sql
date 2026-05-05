-- Seed: UBY Portal Service onboarding
-- Project: aaaextkrfoqomzmjjkxe (Una Labs Supabase)
--
-- PURPOSE
--   Records an initial CAD 400 commitment payment and creates a second unpaid
--   CAD 400 balance invoice due on or before 2026-05-01.
--
-- HOW TO USE
--   1) Replace REPLACE_* placeholders.
--   2) Run in Supabase SQL editor.
--   3) Re-running is safe (idempotent by intake_id and payment references).

-- Step 1: Onboard project + initial commitment payment.
-- If the initial commitment has NOT yet been received, set p_invoice_amount => 0
-- and set p_payment_method/reference/paid_at to null.
select * from public.onboard_client_project(
  p_intake_id          => 'uby400-portal-2026-04',
  p_email              => 'uby400@gmail.com',
  p_name               => 'UBY Portal Service',
  p_description        => 'Portal delivery engagement with payment plan: CAD 400 initial commitment and CAD 400 final balance due on or before 2026-05-01.',
  p_tier               => 'standard_activation',
  p_billing            => 'etransfer',
  p_status             => 'active',
  p_milestone_titles   => array[
                            'Intake & Discovery',
                            'Scope & Pricing Approval',
                            'Portal Build & Workflow Wiring',
                            'Admin/Client Access + QA',
                            'Delivery & Handover'
                          ],
  p_invoice_amount     => 400.00,
  p_invoice_title      => 'UBY Portal Service - initial commitment',
  p_payment_method     => 'etransfer',
  p_payment_reference  => 'REPLACE_UBY400_INITIAL_REFERENCE',
  p_paid_at            => 'REPLACE_2026-04-26T00:00:00Z'::timestamptz,
  p_recorded_by        => 'hello@unalabs.cloud'
);

-- Step 2: Ensure the final balance invoice exists (unpaid).
with target_project as (
  select id, email
  from projects
  where intake_id = 'uby400-portal-2026-04'
  limit 1
)
insert into invoices (
  project_id,
  milestone_id,
  invoice_number,
  title,
  amount_cad,
  paid_amount_cad,
  status,
  due_date,
  paid_at,
  client_email,
  payment_method,
  payment_reference,
  notes
)
select
  tp.id,
  null,
  'INV-20260426-UBY400-BAL',
  'UBY Portal Service - final balance due by delivery (on or before 2026-05-01)',
  400.00,
  0.00,
  'unpaid',
  '2026-05-01'::date,
  null,
  tp.email,
  'manual',
  'BALANCE-DUE-2026-05-01',
  'Final CAD 400 balance due on or before 2026-05-01 delivery date.'
from target_project tp
where not exists (
  select 1
  from invoices i
  where i.project_id = tp.id
    and i.payment_reference = 'BALANCE-DUE-2026-05-01'
);

-- Verification queries
-- select id, intake_id, email, name, status, billing, tier from projects where intake_id = 'uby400-portal-2026-04';
-- select title, status from milestones where project_id = (select id from projects where intake_id = 'uby400-portal-2026-04') order by created_at;
-- select invoice_number, title, amount_cad, paid_amount_cad, status, due_date, payment_method, payment_reference from invoices where project_id = (select id from projects where intake_id = 'uby400-portal-2026-04') order by created_at;
-- select amount_cad, method, reference, received_at from payment_records where project_id = (select id from projects where intake_id = 'uby400-portal-2026-04') order by created_at;
