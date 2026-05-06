-- M1 hardening: enable RLS for profile and role lookups used by authenticated app routes.

alter table if exists public.profiles enable row level security;
alter table if exists public.user_roles enable row level security;

-- Authenticated users can read only their own profile row.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

-- Authenticated users can read role rows tied to their own profile.
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = user_roles.profile_id
        and p.auth_user_id = auth.uid()
    )
  );
