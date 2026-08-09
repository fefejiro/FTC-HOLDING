[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$functionPath = Join-Path $platformRoot 'supabase/functions/peacepad-v2-api/index.ts'
$migrationPath = Join-Path $platformRoot 'supabase/migrations/202608070002_v2_edge_function_boundary.sql'
$authorizationMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608070003_v2_identity_family_invitation.sql'
$transactionMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090001_v2_authorization_transactions.sql'
$invitationMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090002_v2_invitation_resolution.sql'
$configPath = Join-Path $platformRoot 'supabase/config.toml'

foreach ($path in @($functionPath, $migrationPath, $authorizationMigrationPath, $transactionMigrationPath, $invitationMigrationPath, $configPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required Supabase staging file is missing: $path"
  }
}

$function = Get-Content -LiteralPath $functionPath -Raw
$migration = Get-Content -LiteralPath $migrationPath -Raw
$authorizationMigration = Get-Content -LiteralPath $authorizationMigrationPath -Raw
$transactionMigration = Get-Content -LiteralPath $transactionMigrationPath -Raw
$invitationMigration = Get-Content -LiteralPath $invitationMigrationPath -Raw
$config = Get-Content -LiteralPath $configPath -Raw

$requiredFunctionPatterns = @(
  'admin.auth.getUser(token)',
  'PEACEPAD_PROJECT_REF',
  'PEACEPAD_FUNCTION_REGION',
  'x-peacepad-region',
  'peacepad_v2_ready',
  'peacepad_v2_get_region_binding',
  '/api/v2/session',
  '/api/v2/session/bootstrap',
  '/api/v2/consents',
  '/api/v2/families',
  '/api/v2/invitations',
  '/accept',
  'idempotency-key',
  'if-match',
  'x-peacepad-schema-version',
  'x-idempotency-key',
  'x-schema-version',
  'peacepad_v2_create_invitation',
  'peacepad_v2_resolve_invitation',
  'peacepad_v2_accept_invitation',
  'crypto.subtle.digest',
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
foreach ($table in @('identity', 'consent_record', 'family_circle', 'participant_grant', 'family_invitation')) {
  if ($authorizationMigration -notmatch "create table if not exists peacepad_v2\.$table") {
    throw "Authorization migration is missing table: $table"
  }
  if ($authorizationMigration -notmatch "alter table peacepad_v2\.$table enable row level security") {
    throw "Authorization migration is missing fail-closed RLS: $table"
  }
}
if ($authorizationMigration -match '(?i)\b(code|invitation_code)\s+text') {
  throw 'Invitation codes must never be persisted in plaintext.'
}
if ($authorizationMigration -notmatch 'code_hash bytea') {
  throw 'Invitation storage must use a hash.'
}
if ($authorizationMigration -match 'professional_read_only') {
  throw 'Persisted participant roles must match the public v2 professional role contract.'
}
foreach ($rpc in @(
  'peacepad_v2_bootstrap_identity',
  'peacepad_v2_record_consent',
  'peacepad_v2_create_family',
  'peacepad_v2_create_invitation'
)) {
  if ($transactionMigration -notmatch "create or replace function public\.$rpc") {
    throw "Transaction migration is missing RPC: $rpc"
  }
  if ($transactionMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Transaction RPC is not revoked from mobile roles: $rpc"
  }
}
if ($transactionMigration -notmatch 'prior_write_result') {
  throw 'Write transactions must support idempotent result replay.'
}
if ($transactionMigration -notmatch 'perform peacepad_v2\.record_write') {
  throw 'Write transactions must append an audit event atomically.'
}
foreach ($rpc in @('peacepad_v2_resolve_invitation', 'peacepad_v2_accept_invitation')) {
  if ($invitationMigration -notmatch "create or replace function public\.$rpc") {
    throw "Invitation migration is missing RPC: $rpc"
  }
  if ($invitationMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Invitation RPC is not revoked from mobile roles: $rpc"
  }
}
if ($invitationMigration -notmatch "recent_attempts >= 10") {
  throw 'Invitation resolution must be rate limited.'
}
if ($invitationMigration -notmatch 'for update') {
  throw 'Invitation acceptance must lock its single-use state.'
}
if ($invitationMigration -notmatch 'p_expected_version') {
  throw 'Invitation acceptance must enforce optimistic concurrency.'
}
if (
  $config -notmatch '\[functions\.peacepad-v2-api\]' -or
  $config -notmatch 'verify_jwt\s*=\s*false'
) {
  throw 'Function must allow public health checks and enforce protected JWTs in its handler.'
}

Write-Output 'SUPABASE_EDGE_BOUNDARY_LOCAL_VERIFIED'
