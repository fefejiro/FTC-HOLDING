-- Garden Cleaners private job-photo storage.
-- Apply after 001_schema_and_rls.sql.
--
-- The portal worker uploads files with the Supabase service role and stores
-- private object paths in garden_cleaners_audit_log. Direct browser uploads
-- are intentionally not enabled here.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'garden-cleaners-job-attachments',
  'garden-cleaners-job-attachments',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists gc_job_attachments_admin_select on storage.objects;
create policy gc_job_attachments_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'garden-cleaners-job-attachments'
  and public.gc_is_admin()
);
