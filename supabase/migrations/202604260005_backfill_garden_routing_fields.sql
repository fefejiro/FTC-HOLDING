-- Phase 18: Backfill persisted Garden routing fields from legacy text data.

UPDATE projects
SET service_region = CASE
  WHEN lower(coalesce(name, '') || ' ' || coalesce(description, '')) LIKE '%oshawa%' THEN 'Oshawa'
  WHEN lower(coalesce(name, '') || ' ' || coalesce(description, '')) LIKE '%whitby%' THEN 'Whitby'
  WHEN lower(coalesce(name, '') || ' ' || coalesce(description, '')) LIKE '%ajax%' THEN 'Ajax'
  WHEN lower(coalesce(name, '') || ' ' || coalesce(description, '')) LIKE '%pickering%' THEN 'Pickering'
  WHEN lower(coalesce(name, '') || ' ' || coalesce(description, '')) LIKE '%courtice%' THEN 'Courtice'
  WHEN lower(coalesce(name, '') || ' ' || coalesce(description, '')) LIKE '%durham%' THEN 'Durham Region'
  ELSE 'Unspecified'
END
WHERE service_region IS NULL;

UPDATE projects
SET assigned_owner = trim((regexp_match(description, '(?:owner|assignee|assigned to)\s*[:\-]\s*([a-z0-9 ._@-]{3,80})', 'i'))[1])
WHERE assigned_owner IS NULL
  AND description IS NOT NULL
  AND regexp_match(description, '(?:owner|assignee|assigned to)\s*[:\-]\s*([a-z0-9 ._@-]{3,80})', 'i') IS NOT NULL;
