-- Anion Phase 1 RLS Smoke Test
-- Run after applying migration 202604230003_anion_phase1_rls.sql.
-- Purpose: verify owner-scoped visibility and booking insert controls for parent/student/tutor/admin.
--
-- Usage example:
--   supabase db reset
--   psql "$SUPABASE_DB_URL" -f supabase/tests/anion_phase1_rls_smoke.sql

begin;

-- -----------------------------------------------------------------------------
-- 1) Seed test users in auth.users so auth.uid() can resolve inside policies.
-- -----------------------------------------------------------------------------
insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at
)
values
  ('11111111-1111-1111-1111-111111111111', 'anion.parent@example.com', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'anion.student@example.com', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'anion.tutor@example.com', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'anion.admin@example.com', crypt('password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, 'authenticated', 'authenticated', now(), now())
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2) Seed profile graph used by Anion selectors.
-- -----------------------------------------------------------------------------
insert into anion_profiles (id, auth_user_id, display_name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'Anion Parent'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 'Anion Student'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '33333333-3333-3333-3333-333333333333', 'Anion Tutor'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '44444444-4444-4444-4444-444444444444', 'Anion Admin')
on conflict (id) do nothing;

insert into anion_user_roles (id, profile_id, role)
values
  (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'parent'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'student'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'tutor'),
  (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'admin')
on conflict do nothing;

insert into anion_students (id, profile_id, grade_level)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Grade 8')
on conflict (id) do nothing;

insert into anion_parents (id, profile_id, phone)
values ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '+16135550111')
on conflict (id) do nothing;

insert into anion_tutors (id, profile_id, headline, bio, subjects, hourly_rate_cents)
values (
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  'Math Coach',
  'Focused on middle school math outcomes.',
  array['Mathematics'],
  3500
)
on conflict (id) do nothing;

insert into anion_parent_student_links (id, parent_id, student_id, relationship_label)
values (
  gen_random_uuid(),
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'guardian'
)
on conflict do nothing;

insert into anion_bookings (id, tutor_id, student_id, parent_id, starts_at, ends_at, status, notes)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  now() + interval '1 day',
  now() + interval '1 day' + interval '1 hour',
  'pending',
  'RLS smoke booking'
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3) Policy checks by role. These are read-first smoke checks.
-- -----------------------------------------------------------------------------

-- Parent can see tutor directory and linked student booking.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select 'parent_visible_tutors' as check_name, count(*) as count_expected_ge_1 from anion_tutors;
select 'parent_visible_bookings' as check_name, count(*) as count_expected_ge_1 from anion_bookings;

-- Parent can insert booking for linked student.
insert into anion_bookings (tutor_id, student_id, parent_id, starts_at, ends_at, status, notes)
values (
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  now() + interval '2 days',
  now() + interval '2 days' + interval '1 hour',
  'pending',
  'Parent-created booking (RLS smoke)'
);

-- Student can see own booking and tutor directory.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select 'student_visible_tutors' as check_name, count(*) as count_expected_ge_1 from anion_tutors;
select 'student_visible_bookings' as check_name, count(*) as count_expected_ge_1 from anion_bookings;

-- Student can insert booking for self (parent_id null).
insert into anion_bookings (tutor_id, student_id, parent_id, starts_at, ends_at, status, notes)
values (
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  null,
  now() + interval '3 days',
  now() + interval '3 days' + interval '1 hour',
  'pending',
  'Student-created booking (RLS smoke)'
);

-- Tutor can see bookings assigned to them.
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select 'tutor_visible_bookings' as check_name, count(*) as count_expected_ge_1 from anion_bookings;

-- Admin can see broad data.
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select 'admin_visible_profiles' as check_name, count(*) as count_expected_ge_4 from anion_profiles;
select 'admin_visible_bookings' as check_name, count(*) as count_expected_ge_3 from anion_bookings;

rollback;
