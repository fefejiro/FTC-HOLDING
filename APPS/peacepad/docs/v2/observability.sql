-- PeacePad v2 observability query pack
-- Default time window: last 24 hours.

-- 0) Table presence check
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('pp_v2_module_runs', 'pp_v2_launcher_state')
order by table_name;

-- 1) Module usage counts (24h)
select module_id, count(*) as runs
from pp_v2_module_runs
where started_at >= now() - interval '24 hours'
group by module_id
order by runs desc;

-- 2) Conflict level distribution (24h, successful runs)
select conflict_level, count(*) as runs
from pp_v2_module_runs
where started_at >= now() - interval '24 hours'
  and status = 'success'
group by conflict_level
order by conflict_level;

-- 3) Safety flag frequency (24h)
select flag, count(*) as occurrences
from pp_v2_module_runs,
lateral jsonb_array_elements_text(safety_flags) as flag
where started_at >= now() - interval '24 hours'
group by flag
order by occurrences desc;

-- 4) Error rate by module (24h)
select
  module_id,
  count(*) as total_runs,
  count(*) filter (where status = 'error') as error_runs,
  round(
    (count(*) filter (where status = 'error')::numeric / nullif(count(*), 0)) * 100,
    2
  ) as error_rate_pct
from pp_v2_module_runs
where started_at >= now() - interval '24 hours'
group by module_id
order by error_rate_pct desc, total_runs desc;

-- 5) Recent failures with quick triage fields
select
  started_at,
  finished_at,
  module_id,
  status,
  error_code,
  conflict_level,
  safety_flags
from pp_v2_module_runs
where started_at >= now() - interval '24 hours'
  and status = 'error'
order by started_at desc
limit 100;
