-- Anion Phase 0 Foundation Schema
-- Reference scaffold only. Review before applying to the shared Supabase project.

create table if not exists anion_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists anion_user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references anion_profiles(id) on delete cascade,
  role text not null check (role in ('tutor', 'student', 'parent', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists anion_students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references anion_profiles(id) on delete cascade,
  grade_level text,
  learning_goals text,
  created_at timestamptz not null default now()
);

create table if not exists anion_tutors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references anion_profiles(id) on delete cascade,
  headline text not null,
  bio text,
  subjects text[] not null default '{}',
  hourly_rate_cents integer,
  created_at timestamptz not null default now()
);

create table if not exists anion_parents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references anion_profiles(id) on delete cascade,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists anion_parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references anion_parents(id) on delete cascade,
  student_id uuid not null references anion_students(id) on delete cascade,
  relationship_label text,
  created_at timestamptz not null default now()
);

create table if not exists anion_student_tutor_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references anion_students(id) on delete cascade,
  tutor_id uuid not null references anion_tutors(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists anion_tutor_availability (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references anion_tutors(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_time text not null,
  end_time text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table if not exists anion_bookings (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references anion_tutors(id) on delete cascade,
  student_id uuid not null references anion_students(id) on delete cascade,
  parent_id uuid references anion_parents(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists anion_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references anion_bookings(id) on delete cascade,
  daily_room_name text,
  daily_meeting_token text,
  status text not null default 'scheduled',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists anion_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  stripe_price_id text,
  name text not null,
  billing_interval text not null,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

create table if not exists anion_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references anion_profiles(id) on delete cascade,
  plan_id uuid not null references anion_subscription_plans(id) on delete restrict,
  stripe_subscription_id text,
  status text not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists anion_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references anion_subscriptions(id) on delete set null,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists anion_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references anion_bookings(id) on delete cascade,
  student_id uuid not null references anion_students(id) on delete cascade,
  tutor_id uuid not null references anion_tutors(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now()
);

-- TODO: Add RLS policies after confirming shared-project ownership model.