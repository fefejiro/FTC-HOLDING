-- Phase 21 follow-up: allow authenticated role-scoped portal actions.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'garden_cleaners_jobs'
      and policyname = 'admin_insert_jobs'
  ) then
    create policy "admin_insert_jobs" on garden_cleaners_jobs
      for insert
      with check (
        exists (
          select 1
          from garden_cleaners_profiles p
          where p.email = auth.jwt() ->> 'email'
            and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'garden_cleaners_jobs'
      and policyname = 'staff_update_assigned_job_status'
  ) then
    create policy "staff_update_assigned_job_status" on garden_cleaners_jobs
      for update
      using (
        exists (
          select 1
          from garden_cleaners_job_assignments a
          join garden_cleaners_profiles p on a.staff_profile_id = p.id
          where a.job_id = garden_cleaners_jobs.id
            and p.email = auth.jwt() ->> 'email'
            and p.role = 'staff'
        )
      )
      with check (
        exists (
          select 1
          from garden_cleaners_job_assignments a
          join garden_cleaners_profiles p on a.staff_profile_id = p.id
          where a.job_id = garden_cleaners_jobs.id
            and p.email = auth.jwt() ->> 'email'
            and p.role = 'staff'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'garden_cleaners_job_assignments'
      and policyname = 'admin_insert_assignments'
  ) then
    create policy "admin_insert_assignments" on garden_cleaners_job_assignments
      for insert
      with check (
        exists (
          select 1
          from garden_cleaners_profiles p
          where p.email = auth.jwt() ->> 'email'
            and p.role = 'admin'
        )
      );
  end if;
end $$;
