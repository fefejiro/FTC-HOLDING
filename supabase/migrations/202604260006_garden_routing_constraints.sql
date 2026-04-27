-- Phase 19: Enforce canonical values for persisted Garden routing fields.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_service_region_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_service_region_check
      CHECK (
        service_region IS NULL
        OR service_region IN ('Oshawa', 'Whitby', 'Ajax', 'Pickering', 'Courtice', 'Durham Region', 'Unspecified')
      );
  END IF;
END$$;

COMMENT ON CONSTRAINT projects_service_region_check ON projects IS
  'Allows only canonical Garden routing regions or NULL when not yet assigned.';
