-- Post-deploy verification for Garden routing schema rollout.

-- 1) Confirm columns exist.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'projects'
  AND column_name IN ('service_region', 'assigned_owner')
ORDER BY column_name;

-- 2) Confirm check constraint exists.
SELECT conname AS constraint_name
FROM pg_constraint
WHERE conname = 'projects_service_region_check';

-- 3) Confirm there are no invalid persisted regions.
SELECT id, name, service_region
FROM projects
WHERE service_region IS NOT NULL
  AND service_region NOT IN ('Oshawa', 'Whitby', 'Ajax', 'Pickering', 'Courtice', 'Durham Region', 'Unspecified')
LIMIT 50;

-- 4) Region distribution snapshot.
SELECT COALESCE(service_region, '(null)') AS service_region, COUNT(*) AS project_count
FROM projects
GROUP BY COALESCE(service_region, '(null)')
ORDER BY project_count DESC;

-- 5) Ownership assignment snapshot.
SELECT COALESCE(assigned_owner, '(unassigned)') AS assigned_owner, COUNT(*) AS project_count
FROM projects
GROUP BY COALESCE(assigned_owner, '(unassigned)')
ORDER BY project_count DESC;
