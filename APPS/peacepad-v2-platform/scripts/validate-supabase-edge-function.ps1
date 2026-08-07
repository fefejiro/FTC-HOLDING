[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$functionPath = Join-Path $platformRoot 'supabase/functions/peacepad-v2-api/index.ts'
$migrationPath = Join-Path $platformRoot 'supabase/migrations/202608070002_v2_edge_function_boundary.sql'
$configPath = Join-Path $platformRoot 'supabase/config.toml'

foreach ($path in @($functionPath, $migrationPath, $configPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required Supabase staging file is missing: $path"
  }
}

$function = Get-Content -LiteralPath $functionPath -Raw
$migration = Get-Content -LiteralPath $migrationPath -Raw
$config = Get-Content -LiteralPath $configPath -Raw

$requiredFunctionPatterns = @(
  'admin.auth.getUser(token)',
  'PEACEPAD_PROJECT_REF',
  'PEACEPAD_FUNCTION_REGION',
  'x-peacepad-region',
  'peacepad_v2_ready',
  'peacepad_v2_get_region_binding',
  '/api/v2/session',
  'crypto.randomUUID()',
  'fictional-staging'
)
foreach ($pattern in $requiredFunctionPatterns) {
  if (-not $function.Contains($pattern)) {
    throw "Edge Function contract is missing required boundary: $pattern"
  }
}

if ($function -match 'console\.(log|debug|info|warn|error)') {
  throw 'Edge Function must not log identity or family content.'
}
if ($function -match 'requestBody\.(identity|identityId|userId)') {
  throw 'Identity must be derived from a verified JWT, never a request body.'
}
if ($function -match 'ca\.peacepad\.family') {
  throw 'Production bundle identity is forbidden in the staging Edge Function.'
}

foreach ($rpc in @('peacepad_v2_ready', 'peacepad_v2_get_region_binding')) {
  if ($migration -notmatch "create or replace function public\.$rpc") {
    throw "Migration is missing RPC: $rpc"
  }
}
if ($migration -notmatch 'grant execute on function public\.peacepad_v2_ready\(\) to service_role') {
  throw 'Readiness RPC is not restricted to service_role.'
}
if ($migration -notmatch 'revoke all on function public\.peacepad_v2_get_region_binding') {
  throw 'Region-binding RPC lacks an explicit public revoke.'
}
if (
  $config -notmatch '\[functions\.peacepad-v2-api\]' -or
  $config -notmatch 'verify_jwt\s*=\s*false'
) {
  throw 'Function must allow public health checks and enforce protected JWTs in its handler.'
}

Write-Output 'SUPABASE_EDGE_BOUNDARY_LOCAL_VERIFIED'
