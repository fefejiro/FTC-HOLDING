-- ATEAM Live Document Operations Layer
-- Phase D1: Minimal document lifecycle tracking and generation

create table if not exists public.ateam_documents (
  id text primary key,
  run_id text not null,
  created_ts timestamptz not null,
  updated_ts timestamptz not null,
  doc_type text not null,
  status text not null default 'draft',
  title text not null default '',
  summary text not null default '',
  structured_fields_json jsonb not null default '{}',
  rendered_output text not null default '',
  version integer not null default 1,
  metadata_json jsonb not null default '{}'
);

create index if not exists idx_ateam_documents_run_id
  on public.ateam_documents (run_id, updated_ts desc);

create index if not exists idx_ateam_documents_status
  on public.ateam_documents (status, created_ts desc);

create index if not exists idx_ateam_documents_doc_type
  on public.ateam_documents (doc_type, updated_ts desc);
