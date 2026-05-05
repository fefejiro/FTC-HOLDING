-- Phase 17: Persisted Garden queue routing fields
-- Adds first-class columns for region routing and owner assignment.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS service_region text,
  ADD COLUMN IF NOT EXISTS assigned_owner text;

CREATE INDEX IF NOT EXISTS projects_service_region_idx
  ON projects(service_region)
  WHERE service_region IS NOT NULL;

CREATE INDEX IF NOT EXISTS projects_assigned_owner_idx
  ON projects(assigned_owner)
  WHERE assigned_owner IS NOT NULL;

COMMENT ON COLUMN projects.service_region IS
  'Operational service region for queue routing (e.g. Oshawa, Whitby, Ajax, Pickering, Courtice, Durham Region).';

COMMENT ON COLUMN projects.assigned_owner IS
  'Assigned staff owner for queue accountability (typically email address).';
