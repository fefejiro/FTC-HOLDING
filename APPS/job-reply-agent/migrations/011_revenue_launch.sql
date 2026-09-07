ALTER TABLE product_users
  ADD COLUMN IF NOT EXISTS registration_source text NOT NULL DEFAULT 'invitation'
    CHECK (registration_source IN ('invitation', 'public', 'pilot_import')),
  ADD COLUMN IF NOT EXISTS acquisition jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS billing_customers (
  user_id uuid PRIMARY KEY REFERENCES product_users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  livemode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  stripe_price_id text,
  plan_code text NOT NULL CHECK (plan_code IN (
    'free_preview', 'sprint_weekly', 'jobagent_monthly', 'jobagent_annual'
  )),
  status text NOT NULL CHECK (status IN (
    'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due',
    'canceled', 'unpaid', 'paused', 'suspended'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_subscriptions_user_status_idx
  ON billing_subscriptions(user_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS billing_events (
  stripe_event_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  stripe_object_id text,
  payload_digest text NOT NULL CHECK (payload_digest ~ '^[a-f0-9]{64}$'),
  livemode boolean NOT NULL DEFAULT false,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'failed')),
  normalized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_created_at timestamptz,
  processed_at timestamptz,
  failure_reason text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_user_received_idx
  ON billing_events(user_id, received_at DESC);

CREATE TABLE IF NOT EXISTS plan_entitlements (
  user_id uuid PRIMARY KEY REFERENCES product_users(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'free_preview' CHECK (plan_code IN (
    'free_preview', 'sprint_weekly', 'jobagent_monthly', 'jobagent_annual'
  )),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'suspended')),
  allowances jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'system'
    CHECK (source IN ('system', 'stripe', 'operator')),
  stripe_subscription_id text,
  period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end > period_start)
);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  usage_key text NOT NULL CHECK (usage_key IN (
    'fit_analysis', 'tailored_package', 'interview_prep', 'recruiter_draft',
    'assisted_application'
  )),
  quantity integer NOT NULL CHECK (quantity > 0),
  idempotency_key text NOT NULL,
  period_start timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS usage_ledger_user_period_idx
  ON usage_ledger(user_id, usage_key, period_start, occurred_at DESC);

CREATE TABLE IF NOT EXISTS product_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES product_users(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_name text NOT NULL CHECK (event_name IN (
    'signup', 'email_verified', 'onboarding_completed', 'first_value',
    'checkout_started', 'checkout_completed', 'subscription_activated',
    'subscription_canceled', 'account_deleted'
  )),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);

CREATE INDEX IF NOT EXISTS product_funnel_events_user_time_idx
  ON product_funnel_events(user_id, occurred_at DESC);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'billing_customers', 'billing_subscriptions', 'billing_events',
    'plan_entitlements', 'usage_ledger', 'product_funnel_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_policy ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_policy ON %I USING (user_id = app_current_user_id()) WITH CHECK (user_id = app_current_user_id())',
      table_name
    );
  END LOOP;
END
$$;
