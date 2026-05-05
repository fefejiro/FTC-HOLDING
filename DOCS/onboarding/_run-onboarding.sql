-- Generated onboarding run for Garden Cleaners + OG Trades.
-- Idempotent via onboard_client_project. Safe to re-run.

select * from public.onboard_client_project(
  p_intake_id         => 'gardencleaners-2026-04',
  p_email             => 'hello@unalabs.cloud',
  p_name              => 'Garden Cleaners',
  p_description       => 'Brand site, booking + lead intake, and ops portal for Garden Cleaners (Ottawa).',
  p_tier              => 'T1',
  p_billing           => 'etransfer',
  p_status            => 'active',
  p_milestone_titles  => array['Intake & Discovery','Scope & Pricing Approval','Brand & Site Build','Booking + Lead Intake Wiring','Ops Portal & Admin','Review & QA','Launch / Handover','Post-Launch Support (30 days)'],
  p_invoice_amount    => 1500.00,
  p_invoice_title     => 'Garden Cleaners - activation deposit (E-transfer)',
  p_payment_method    => 'etransfer',
  p_payment_reference => 'INTERAC-PLACEHOLDER-EDIT-ME',
  p_paid_at           => '2026-04-01T00:00:00Z'::timestamptz,
  p_recorded_by       => 'hello@unalabs.cloud'
);

select * from public.onboard_client_project(
  p_intake_id         => 'ogtradesacademy-2026-04',
  p_email             => 'hello@unalabs.cloud',
  p_name              => 'OG Trades Academy',
  p_description       => 'Trades education microsite, course intake, community page, and resources hub on ogtradesacademy.com.',
  p_tier              => 'T0',
  p_billing           => 'etransfer',
  p_status            => 'active',
  p_milestone_titles  => array['Intake & Discovery','Scope & Pricing Approval','Site Build & Branding','Course / Resources Pages','Community + Contact Wiring','Review & QA','Domain Cutover & Launch','Post-Launch Support (30 days)'],
  p_invoice_amount    => 0,
  p_invoice_title     => 'OG Trades Academy - activation deposit',
  p_payment_method    => 'etransfer',
  p_payment_reference => null,
  p_paid_at           => null,
  p_recorded_by       => 'hello@unalabs.cloud'
);
