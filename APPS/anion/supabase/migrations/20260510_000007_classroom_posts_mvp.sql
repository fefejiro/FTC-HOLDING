-- M4 learning collaboration: lightweight shared writing feed for students and tutors.

create table if not exists public.classroom_posts (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  author_role text not null check (author_role in ('student', 'tutor')),
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_classroom_posts_created_at on public.classroom_posts(created_at desc);
create index if not exists idx_classroom_posts_author_profile_id on public.classroom_posts(author_profile_id);

alter table if exists public.classroom_posts enable row level security;

-- Students and tutors can read the shared classroom feed.
drop policy if exists classroom_posts_select_student_tutor on public.classroom_posts;
create policy classroom_posts_select_student_tutor
  on public.classroom_posts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      join public.user_roles ur on ur.profile_id = p.id
      where p.auth_user_id = auth.uid()
        and ur.role in ('student', 'tutor')
    )
  );

-- Students and tutors can create posts only as themselves and with their own role.
drop policy if exists classroom_posts_insert_student_tutor_own on public.classroom_posts;
create policy classroom_posts_insert_student_tutor_own
  on public.classroom_posts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      join public.user_roles ur on ur.profile_id = p.id
      where p.id = classroom_posts.author_profile_id
        and p.auth_user_id = auth.uid()
        and ur.role = classroom_posts.author_role
        and ur.role in ('student', 'tutor')
    )
  );
