-- Phase 14: Stripe Connect foundation for per-project agency onboarding
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS connect_account_id text,
  ADD COLUMN IF NOT EXISTS connect_onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connect_details_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connect_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connect_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connect_last_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS projects_connect_account_id_idx
  ON projects(connect_account_id)
  WHERE connect_account_id IS NOT NULL;

COMMENT ON COLUMN projects.connect_account_id IS
  'Stripe Connect account ID associated with this agency/project owner.';
COMMENT ON COLUMN projects.connect_onboarding_complete IS
  'True when Stripe Connect onboarding has been completed for the account.';
COMMENT ON COLUMN projects.connect_details_submitted IS
  'Mirror of Stripe account details_submitted field for onboarding diagnostics.';
COMMENT ON COLUMN projects.connect_charges_enabled IS
  'Mirror of Stripe account charges_enabled field.';
COMMENT ON COLUMN projects.connect_payouts_enabled IS
  'Mirror of Stripe account payouts_enabled field.';
COMMENT ON COLUMN projects.connect_last_synced_at IS
  'Timestamp of last Stripe Connect account status sync.';
