-- M3 billing: Stripe subscription state sync.
-- Tracks subscription status per parent profile so app can gate
-- premium features without live Stripe API calls on every request.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  plan_id text not null default 'free' check (plan_id in ('free', 'starter', 'growth', 'unlimited')),
  status text not null default 'inactive' check (status in ('active', 'inactive', 'past_due', 'canceled', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id),
  unique (stripe_subscription_id)
);

create index if not exists idx_subscriptions_parent_id on public.subscriptions(parent_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

alter table if exists public.subscriptions enable row level security;

-- Parent can read only their own subscription.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.parents pr
      join public.profiles p on p.id = pr.profile_id
      where pr.id = subscriptions.parent_id
        and p.auth_user_id = auth.uid()
    )
  );
