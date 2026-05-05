-- Seed: OG Trades Academy onboarding.
-- Project: aaaextkrfoqomzmjjkxe (Una Labs Supabase)
--
-- HOW TO USE:
--   1. Update placeholders ("REPLACE_") with the real values.
--   2. Run in Supabase SQL editor or psql.
--   3. Idempotent.
--
-- If OG Trades has not paid yet, leave p_invoice_amount = 0 — no invoice/payment is recorded.
-- If they have paid (E-transfer / Stripe / cash / cheque / wire), set the amount + method + reference.

select * from public.onboard_client_project(
  p_intake_id         => 'ogtradesacademy-2026-04',
  p_email             => 'REPLACE_ogtrades_owner_email@example.com',
  p_name              => 'OG Trades Academy',
  p_description       => 'Trades education microsite, course intake, community page, and resources hub on ogtradesacademy.com. Linked from FTC site /og-trades-academy.',
  p_tier              => 'standard_activation',
  p_billing           => 'etransfer',                          -- or 'stripe' if applicable
  p_status            => 'active',
  p_milestone_titles  => array[
                          'Intake & Discovery',
                          'Scope & Pricing Approval',
                          'Site Build & Branding',
                          'Course / Resources Pages',
                          'Community + Contact Wiring',
                          'Review & QA',
                          'Domain Cutover & Launch',
                          'Post-Launch Support (30 days)'
                         ],
  p_invoice_amount    => 0.00,                                 -- REPLACE with paid CAD amount, or leave 0 if unpaid
  p_invoice_title     => 'OG Trades Academy — activation deposit',
  p_payment_method    => 'etransfer',                          -- ignored if amount is 0
  p_payment_reference => 'REPLACE_etransfer_confirmation_or_none',
  p_paid_at           => 'REPLACE_2026-04-01T00:00:00Z'::timestamptz,
  p_recorded_by       => 'hello@unalabs.cloud'
);

-- Verify.
-- select id, name, status, billing from projects where intake_id = 'ogtradesacademy-2026-04';
-- select title, status from milestones where project_id = (select id from projects where intake_id = 'ogtradesacademy-2026-04') order by created_at;
-- select invoice_number, amount_cad, status, payment_method, payment_reference, paid_at from invoices where project_id = (select id from projects where intake_id = 'ogtradesacademy-2026-04');
