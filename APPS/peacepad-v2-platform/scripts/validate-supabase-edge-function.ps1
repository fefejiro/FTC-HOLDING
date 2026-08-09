[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$functionPath = Join-Path $platformRoot 'supabase/functions/peacepad-v2-api/index.ts'
$migrationPath = Join-Path $platformRoot 'supabase/migrations/202608070002_v2_edge_function_boundary.sql'
$authorizationMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608070003_v2_identity_family_invitation.sql'
$transactionMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090001_v2_authorization_transactions.sql'
$invitationMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090002_v2_invitation_resolution.sql'
$accountDeletionMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090003_v2_account_deletion.sql'
$messagingMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090004_v2_persistent_messaging.sql'
$calendarMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090005_v2_persistent_calendar.sql'
$messageCheckMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090006_v2_message_check.sql'
$sessionMembershipMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090007_v2_session_memberships.sql'
$sessionIdentityVersionMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090008_v2_session_identity_version.sql'
$configPath = Join-Path $platformRoot 'supabase/config.toml'

foreach ($path in @($functionPath, $migrationPath, $authorizationMigrationPath, $transactionMigrationPath, $invitationMigrationPath, $accountDeletionMigrationPath, $messagingMigrationPath, $calendarMigrationPath, $messageCheckMigrationPath, $sessionMembershipMigrationPath, $sessionIdentityVersionMigrationPath, $configPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Required Supabase staging file is missing: $path"
  }
}

$function = Get-Content -LiteralPath $functionPath -Raw
$migration = Get-Content -LiteralPath $migrationPath -Raw
$authorizationMigration = Get-Content -LiteralPath $authorizationMigrationPath -Raw
$transactionMigration = Get-Content -LiteralPath $transactionMigrationPath -Raw
$invitationMigration = Get-Content -LiteralPath $invitationMigrationPath -Raw
$accountDeletionMigration = Get-Content -LiteralPath $accountDeletionMigrationPath -Raw
$messagingMigration = Get-Content -LiteralPath $messagingMigrationPath -Raw
$calendarMigration = Get-Content -LiteralPath $calendarMigrationPath -Raw
$messageCheckMigration = Get-Content -LiteralPath $messageCheckMigrationPath -Raw
$sessionMembershipMigration = Get-Content -LiteralPath $sessionMembershipMigrationPath -Raw
$sessionIdentityVersionMigration = Get-Content -LiteralPath $sessionIdentityVersionMigrationPath -Raw
$config = Get-Content -LiteralPath $configPath -Raw

$requiredFunctionPatterns = @(
  'admin.auth.getUser(token)',
  'PEACEPAD_PROJECT_REF',
  'PEACEPAD_FUNCTION_REGION',
  'x-peacepad-region',
  'peacepad_v2_ready',
  'peacepad_v2_get_session_binding',
  '/api/v2/session',
  '/api/v2/session/bootstrap',
  '/api/v2/consents',
  '/api/v2/families',
  '/api/v2/invitations',
  '(accept|decline)',
  'peacepad_v2_decline_invitation',
  'peacepad_v2_revoke_invitation',
  '/api/v2/account',
  'peacepad_v2_delete_account',
  '/api/v2/conversations',
  'peacepad_v2_send_message',
  '/api/v2/calendar-layers',
  '/api/v2/schedule-events',
  'peacepad_v2_create_calendar_layer',
  'peacepad_v2_create_schedule_event',
  '/api/v2/message-previews',
  'message-check',
  'peacepad_v2_get_message_check',
  'peacepad_v2_set_message_check',
  'peacepad_v2_authorize_message_preview',
  'auth.admin.signOut',
  'auth.admin.deleteUser',
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
foreach ($pattern in @(
  'create or replace function public\.peacepad_v2_get_session_binding',
  'identity\.version',
  'identity\.deleted_at is null',
  'revoke all on function public\.peacepad_v2_get_session_binding',
  'grant execute on function public\.peacepad_v2_get_session_binding\(uuid\) to service_role'
)) {
  if ($sessionIdentityVersionMigration -notmatch $pattern) {
    throw "Session identity-version migration is missing required boundary: $pattern"
  }
}
if ($function -notmatch 'version: binding\.identity_version') {
  throw 'Authenticated session response must expose the active identity concurrency version.'
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
foreach ($rpc in @(
  'peacepad_v2_resolve_invitation',
  'peacepad_v2_accept_invitation',
  'peacepad_v2_decline_invitation',
  'peacepad_v2_revoke_invitation'
)) {
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
if ($invitationMigration -notmatch "attempted_at > now\(\) - interval '30 minutes'") {
  throw 'Invitation decline must require a recent successful preview attempt.'
}
if ($invitationMigration -notmatch "message = 'FAMILY_ACCESS_DENIED'") {
  throw 'Invitation revocation must enforce family management authorization.'
}
foreach ($pattern in @(
  'create or replace function public\.peacepad_v2_delete_account',
  'identity\.deleted_at is null',
  'account\.deleted',
  "status = 'revoked'",
  'revoked_at',
  'CONCURRENCY_CONFLICT'
)) {
  if ($accountDeletionMigration -notmatch $pattern) {
    throw "Account deletion migration is missing required boundary: $pattern"
  }
}
foreach ($rpc in @(
  'peacepad_v2_create_conversation',
  'peacepad_v2_send_message',
  'peacepad_v2_record_message_event',
  'peacepad_v2_correct_message',
  'peacepad_v2_search_messages'
)) {
  if ($messagingMigration -notmatch "create or replace function public\.$rpc") {
    throw "Messaging migration is missing RPC: $rpc"
  }
  if ($messagingMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Messaging RPC is not revoked from mobile roles: $rpc"
  }
}
if ($messagingMigration -notmatch 'message_event_append_only') {
  throw 'Message events must be append-only.'
}
if ($messageCheckMigration -notmatch 'create table if not exists peacepad_v2\.message_check_preference') {
  throw 'Message Check migration is missing its persisted preference table.'
}
if ($messageCheckMigration -notmatch 'alter table peacepad_v2\.message_check_preference enable row level security') {
  throw 'Message Check preferences must use fail-closed RLS.'
}
foreach ($rpc in @(
  'peacepad_v2_get_message_check',
  'peacepad_v2_set_message_check',
  'peacepad_v2_authorize_message_preview'
)) {
  if ($messageCheckMigration -notmatch "create or replace function public\.$rpc") {
    throw "Message Check migration is missing RPC: $rpc"
  }
  if ($messageCheckMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Message Check RPC is not revoked from mobile roles: $rpc"
  }
}
foreach ($pattern in @(
  'enabled boolean not null default false',
  'ai_assistance_enabled boolean not null default false check',
  'AI_CONSENT_REQUIRED',
  'CONCURRENCY_CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'pg_advisory_xact_lock',
  'identity_message_check_cleanup',
  'perform peacepad_v2\.record_write',
  "'message_check.updated'"
)) {
  if ($messageCheckMigration -notmatch $pattern) {
    throw "Message Check migration is missing required boundary: $pattern"
  }
}
foreach ($table in @('calendar_layer', 'schedule_event')) {
  if ($calendarMigration -notmatch "create table if not exists peacepad_v2\.$table") {
    throw "Calendar migration is missing table: $table"
  }
  if ($calendarMigration -notmatch "alter table peacepad_v2\.$table enable row level security") {
    throw "Calendar migration is missing fail-closed RLS: $table"
  }
}
foreach ($rpc in @(
  'peacepad_v2_list_calendar_layers',
  'peacepad_v2_create_calendar_layer',
  'peacepad_v2_update_calendar_layer',
  'peacepad_v2_delete_calendar_layer',
  'peacepad_v2_list_schedule_events',
  'peacepad_v2_create_schedule_event',
  'peacepad_v2_update_schedule_event',
  'peacepad_v2_delete_schedule_event'
)) {
  if ($calendarMigration -notmatch "create or replace function public\.$rpc") {
    throw "Calendar migration is missing RPC: $rpc"
  }
  if ($calendarMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Calendar RPC is not revoked from mobile roles: $rpc"
  }
}
foreach ($pattern in @(
  'visibility_valid',
  'visibility_allows',
  'event_visibility_valid',
  'CONCURRENCY_CONFLICT',
  "'calendar_layer.created'",
  "'schedule_event.created'"
)) {
  if ($calendarMigration -notmatch $pattern) {
    throw "Calendar migration is missing required boundary: $pattern"
  }
}
if (
  $config -notmatch '\[functions\.peacepad-v2-api\]' -or
  $config -notmatch 'verify_jwt\s*=\s*false'
) {
  throw 'Function must allow public health checks and enforce protected JWTs in its handler.'
}

Write-Output 'SUPABASE_EDGE_BOUNDARY_LOCAL_VERIFIED'
