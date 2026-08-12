[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$functionPath = Join-Path $platformRoot 'supabase/functions/peacepad-v2-api/index.ts'
$deployPath = Join-Path $PSScriptRoot 'deploy-supabase-production-ca.ps1'
$hardeningPath = Join-Path $platformRoot 'supabase/migrations/202608120001_v2_production_search_path_hardening.sql'

foreach ($path in @($functionPath, $deployPath, $hardeningPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required production-boundary file is missing: $path" }
}

$function = Get-Content -LiteralPath $functionPath -Raw
$deploy = Get-Content -LiteralPath $deployPath -Raw
$hardening = Get-Content -LiteralPath $hardeningPath -Raw

foreach ($required in @(
  'PEACEPAD_RUNTIME_ENVIRONMENT',
  'PEACEPAD_PRODUCTION_WRITES_ENABLED',
  'PRODUCTION_WRITES_DISABLED',
  'environment === "production" && productionWritesSetting === "true"',
  'Production writes are not enabled.'
)) {
  if (-not $function.Contains($required)) { throw "Production Edge runtime boundary is missing: $required" }
}
if ($function -match 'productionWritesEnabled:\s*true') { throw 'Production writes must not default to enabled.' }
foreach ($required in @(
  "`$projectRef = 'qzekqjewpugdotskrtni'",
  "`$functionRegion = 'ca-central-1'",
  'PEACEPAD_RUNTIME_ENVIRONMENT=production',
  'PEACEPAD_PRODUCTION_WRITES_ENABLED=false',
  'PEACEPAD_ALLOWED_ORIGINS=https://peacepad.ca,https://www.peacepad.ca',
  'SUPABASE_PRODUCTION_EDGE_DEPLOYED'
)) {
  if (-not $deploy.Contains($required)) { throw "Production deploy guard is missing: $required" }
}
if ($deploy -match 'productionWritesEnabled=true|PEACEPAD_PRODUCTION_WRITES_ENABLED=true') { throw 'Production deploy runner must be write-disabled.' }
foreach ($functionName in @('prevent_audit_mutation', 'prevent_consent_mutation', 'recurrence_valid', 'prevent_message_mutation', 'message_check_json')) {
  if ($hardening -notmatch "alter function peacepad_v2\.$functionName") { throw "Search-path hardening is missing for $functionName" }
}
Write-Output 'SUPABASE_PRODUCTION_EDGE_STATIC_BOUNDARY_VERIFIED'
