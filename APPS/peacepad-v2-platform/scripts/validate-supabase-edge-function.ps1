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
$parentingTasksMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608270001_v2_parenting_tasks.sql'
$messageCheckMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090006_v2_message_check.sql'
$sessionMembershipMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090007_v2_session_memberships.sql'
$sessionIdentityVersionMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090008_v2_session_identity_version.sql'
$authCleanupMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090009_v2_auth_cleanup_outbox.sql'
$deletionMinimizationMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090010_v2_account_deletion_minimization.sql'
$atomicInvitationMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090011_v2_accept_invitation_conversation.sql'
$idempotencyReceiptMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090012_v2_idempotency_receipts.sql'
$privateRecordsMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608090013_v2_private_case_binders.sql'
$privateAttachmentsMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608140001_v2_private_record_attachments.sql'
$devicePushMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608140003_v2_device_push_registrations.sql'
$devicePushProofPath = Join-Path $platformRoot 'scripts/verify-device-push-registrations.sql'
$familyExitMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608140004_v2_family_exit.sql'
$familyExitProofPath = Join-Path $platformRoot 'scripts/verify-family-exit.sql'
$profileUpdateMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608140005_v2_profile_updates.sql'
$profileUpdateProofPath = Join-Path $platformRoot 'scripts/verify-profile-updates.sql'
$privateTimelineMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608100001_v2_private_source_timeline.sql'
$audioCallMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608100002_v2_foreground_audio_calls.sql'
$audioCallProofPath = Join-Path $platformRoot 'scripts/verify-audio-call-lifecycle.sql'
$audioCallSignalingMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608100003_v2_private_call_signaling.sql'
$audioCallSignalingProofPath = Join-Path $platformRoot 'scripts/verify-audio-call-signaling.sql'
$audioCallSignalValidatorPath = Join-Path $platformRoot 'supabase/functions/peacepad-v2-api/signaling.ts'
$audioCallSignalTestPath = Join-Path $platformRoot 'supabase/functions/peacepad-v2-api/signaling_test.ts'
$audioCallTurnMigrationPath = Join-Path $platformRoot 'supabase/migrations/202608100004_v2_short_lived_turn_authorization.sql'
$audioCallTurnProofPath = Join-Path $platformRoot 'scripts/verify-audio-call-turn-authorization.sql'
$audioCallTurnIssuerPath = Join-Path $platformRoot 'supabase/functions/peacepad-v2-api/turn.ts'
$audioCallTurnTestPath = Join-Path $platformRoot 'supabase/functions/peacepad-v2-api/turn_test.ts'
$authCleanupRunnerPath = Join-Path $platformRoot 'scripts/run-auth-cleanup.ps1'
$deployRunnerPath = Join-Path $platformRoot 'scripts/deploy-supabase-free-staging.ps1'
$configPath = Join-Path $platformRoot 'supabase/config.toml'

foreach ($path in @($functionPath, $migrationPath, $authorizationMigrationPath, $transactionMigrationPath, $invitationMigrationPath, $accountDeletionMigrationPath, $messagingMigrationPath, $calendarMigrationPath, $parentingTasksMigrationPath, $messageCheckMigrationPath, $sessionMembershipMigrationPath, $sessionIdentityVersionMigrationPath, $authCleanupMigrationPath, $deletionMinimizationMigrationPath, $atomicInvitationMigrationPath, $idempotencyReceiptMigrationPath, $privateRecordsMigrationPath, $privateAttachmentsMigrationPath, $devicePushMigrationPath, $devicePushProofPath, $familyExitMigrationPath, $familyExitProofPath, $profileUpdateMigrationPath, $profileUpdateProofPath, $privateTimelineMigrationPath, $audioCallMigrationPath, $audioCallProofPath, $audioCallSignalingMigrationPath, $audioCallSignalingProofPath, $audioCallSignalValidatorPath, $audioCallSignalTestPath, $audioCallTurnMigrationPath, $audioCallTurnProofPath, $audioCallTurnIssuerPath, $audioCallTurnTestPath, $authCleanupRunnerPath, $deployRunnerPath, $configPath)) {
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
$parentingTasksMigration = Get-Content -LiteralPath $parentingTasksMigrationPath -Raw
$messageCheckMigration = Get-Content -LiteralPath $messageCheckMigrationPath -Raw
$sessionMembershipMigration = Get-Content -LiteralPath $sessionMembershipMigrationPath -Raw
$sessionIdentityVersionMigration = Get-Content -LiteralPath $sessionIdentityVersionMigrationPath -Raw
$authCleanupMigration = Get-Content -LiteralPath $authCleanupMigrationPath -Raw
$deletionMinimizationMigration = Get-Content -LiteralPath $deletionMinimizationMigrationPath -Raw
$atomicInvitationMigration = Get-Content -LiteralPath $atomicInvitationMigrationPath -Raw
$idempotencyReceiptMigration = Get-Content -LiteralPath $idempotencyReceiptMigrationPath -Raw
$privateRecordsMigration = Get-Content -LiteralPath $privateRecordsMigrationPath -Raw
$privateAttachmentsMigration = Get-Content -LiteralPath $privateAttachmentsMigrationPath -Raw
$devicePushMigration = Get-Content -LiteralPath $devicePushMigrationPath -Raw
$devicePushProof = Get-Content -LiteralPath $devicePushProofPath -Raw
$familyExitMigration = Get-Content -LiteralPath $familyExitMigrationPath -Raw
$familyExitProof = Get-Content -LiteralPath $familyExitProofPath -Raw
$profileUpdateMigration = Get-Content -LiteralPath $profileUpdateMigrationPath -Raw
$profileUpdateProof = Get-Content -LiteralPath $profileUpdateProofPath -Raw
$privateTimelineMigration = Get-Content -LiteralPath $privateTimelineMigrationPath -Raw
$audioCallMigration = Get-Content -LiteralPath $audioCallMigrationPath -Raw
$audioCallProof = Get-Content -LiteralPath $audioCallProofPath -Raw
$audioCallSignalingMigration = Get-Content -LiteralPath $audioCallSignalingMigrationPath -Raw
$audioCallSignalingProof = Get-Content -LiteralPath $audioCallSignalingProofPath -Raw
$audioCallSignalValidator = Get-Content -LiteralPath $audioCallSignalValidatorPath -Raw
$audioCallSignalTest = Get-Content -LiteralPath $audioCallSignalTestPath -Raw
$audioCallTurnMigration = Get-Content -LiteralPath $audioCallTurnMigrationPath -Raw
$audioCallTurnProof = Get-Content -LiteralPath $audioCallTurnProofPath -Raw
$audioCallTurnIssuer = Get-Content -LiteralPath $audioCallTurnIssuerPath -Raw
$audioCallTurnTest = Get-Content -LiteralPath $audioCallTurnTestPath -Raw
$authCleanupRunner = Get-Content -LiteralPath $authCleanupRunnerPath -Raw
$deployRunner = Get-Content -LiteralPath $deployRunnerPath -Raw
$config = Get-Content -LiteralPath $configPath -Raw

$requiredFunctionPatterns = @(
  'admin.auth.getUser(token)',
  'PEACEPAD_PROJECT_REF',
  'PEACEPAD_FUNCTION_REGION',
  'x-region',
  'x-peacepad-region',
  'peacepad_v2_ready',
  'peacepad_v2_get_session_binding',
  '/api/v2/session',
  '/api/v2/session/bootstrap',
  '/api/v2/consents',
  '/api/v2/families',
  '/membership',
  'peacepad_v2_leave_family',
  '/api/v2/account/profile',
  'peacepad_v2_update_profile',
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
  '/api/v2/parenting-tasks',
  'peacepad_v2_create_calendar_layer',
  'peacepad_v2_create_schedule_event',
  '/api/v2/message-previews',
  'message-check',
  'peacepad_v2_get_message_check',
  'peacepad_v2_set_message_check',
  'peacepad_v2_authorize_message_preview',
  'auth.admin.signOut',
  'auth.admin.deleteUser',
  '/internal/v2/auth-cleanup/run',
  'PEACEPAD_MAINTENANCE_SECRET',
  'PEACEPAD_IDEMPOTENCY_SECRET',
  'PEACEPAD_PUSH_TOKEN_SECRET',
  'constantTimeEqual',
  'failedToFinalize',
  'peacepad_v2_claim_auth_cleanup',
  'peacepad_v2_finish_auth_cleanup',
  'peacepad_v2_expire_write_receipts',
  'idempotency-key',
  'if-match',
  'x-peacepad-schema-version',
  'x-idempotency-key',
  'x-schema-version',
  'peacepad_v2_create_invitation',
  'peacepad_v2_resolve_invitation',
  'peacepad_v2_accept_invitation',
  '/api/v2/calls',
  '/api/v2/calls/current',
  'peacepad_v2_create_audio_call',
  'peacepad_v2_accept_audio_call',
  'peacepad_v2_decline_audio_call',
  'peacepad_v2_end_audio_call',
  'peacepad_v2_get_current_audio_call',
  '/api/v2/calls/',
  '/signals',
  'peacepad_v2_authorize_audio_call_signal',
  '/turn-credentials',
  'peacepad_v2_authorize_audio_call_turn',
  'PEACEPAD_TURN_URLS',
  'PEACEPAD_TURN_SHARED_SECRET',
  'createTurnCredential',
  '/realtime/v1/api/broadcast/',
  'private=true',
  'validateAudioCallSignal',
  'p_identity_id: authenticated.user.id',
  'key !== "conversationId"',
  'Object.keys(body).length !== 0',
  'peacepadnextlab',
  'crypto.subtle.digest',
  'crypto.subtle.sign',
  'databaseIdempotencyToken',
  'canonicalize',
  'crypto.randomUUID()',
  'fictional-staging',
  '/api/v2/devices/push',
  'peacepad_v2_register_device_push',
  'peacepad_v2_revoke_device_push',
  'DEVICE_PUSH_ACCESS_DENIED'
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
if ($function -notmatch 'config\.environment === "production"\s*\?\s*"peacepad"\s*:\s*"peacepadnextlab"') {
  throw 'Invitation deep links must select the production or lab scheme from the verified runtime environment.'
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
foreach ($table in @('parenting_task')) {
  if ($parentingTasksMigration -notmatch "create table if not exists peacepad_v2\.$table") {
    throw "Parenting Tasks migration is missing table: $table"
  }
  if ($parentingTasksMigration -notmatch "alter table peacepad_v2\.$table enable row level security") {
    throw "Parenting Tasks migration is missing fail-closed RLS: $table"
  }
}
foreach ($rpc in @(
  'peacepad_v2_list_parenting_tasks',
  'peacepad_v2_create_parenting_task',
  'peacepad_v2_update_parenting_task',
  'peacepad_v2_delete_parenting_task'
)) {
  if ($parentingTasksMigration -notmatch "create or replace function public\.$rpc") {
    throw "Parenting Tasks migration is missing RPC: $rpc"
  }
  if ($parentingTasksMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Parenting Tasks RPC is not revoked from mobile roles: $rpc"
  }
}
foreach ($pattern in @(
  'task_visibility_allows',
  'visibility_valid',
  'PARENTING_TASK_ACCESS_DENIED',
  'PARENTING_TASK_OWNER_REQUIRED',
  'CONCURRENCY_CONFLICT',
  "'parenting_task.created'",
  "'parenting_task.updated'",
  "'parenting_task.deleted'"
)) {
  if ($parentingTasksMigration -notmatch $pattern) {
    throw "Parenting Tasks migration is missing required boundary: $pattern"
  }
}
foreach ($pattern in @(
  'drop constraint if exists identity_identity_id_fkey',
  'auth_principal_deleted_at',
  'create table if not exists peacepad_v2\.auth_cleanup_outbox',
  'alter table peacepad_v2\.auth_cleanup_outbox enable row level security',
  'revoke all on table peacepad_v2\.auth_cleanup_outbox from public, anon, authenticated',
  'identity_auth_cleanup_queue',
  'for update skip locked',
  'lease_token',
  'lease_expires_at',
  'peacepad_v2_claim_auth_cleanup',
  'peacepad_v2_finish_auth_cleanup',
  'peacepad_v2_ack_auth_cleanup'
)) {
  if ($authCleanupMigration -notmatch $pattern) {
    throw "Auth cleanup migration is missing required boundary: $pattern"
  }
}
if ($authCleanupMigration -match '(?i)(email|message_body|access_token|refresh_token|provider_error)') {
  throw 'Auth cleanup outbox must not retain identity content, tokens, or provider error text.'
}
foreach ($pattern in @(
  'create or replace function public\.peacepad_v2_delete_account',
  'code_hash = uuid_send\(gen_random_uuid\(\)\) \|\| uuid_send\(gen_random_uuid\(\)\)',
  'delete from peacepad_v2\.invitation_attempt',
  'delete from peacepad_v2\.region_binding',
  "family_name = 'Deleted family'",
  "display_name = 'Deleted account'"
)) {
  if ($deletionMinimizationMigration -notmatch $pattern) {
    throw "Deletion minimization migration is missing required boundary: $pattern"
  }
}
if ($deletionMinimizationMigration -match "code_hash\s*=\s*p_") {
  throw 'Account deletion must not retain or reuse caller-provided invitation code material.'
}
if ($function -match 'candidate\.status\s*===\s*404') {
  throw 'A generic HTTP 404 must not be treated as proof that an Auth principal is absent.'
}
foreach ($pattern in @('MAINTENANCE_SECRET', 'internal/v2/auth-cleanup/run', 'TimeoutSec 30')) {
  if ($authCleanupRunner -notmatch $pattern) {
    throw "Auth cleanup operator is missing required boundary: $pattern"
  }
}
foreach ($pattern in @(
  'rohvkyuxbnqzglaromms',
  'spmpndalcvwmygznihec',
  "FunctionRegion = 'ca-central-1'",
  "FunctionRegion = 'us-east-1'",
  "DatabaseRegion = 'us-east-2'",
  "'projects', 'list', '--output', 'json'",
  '\$visibleProject\[0\]\.region',
  'cannot see the approved',
  "GetEnvironmentVariable\('PEACEPAD_MAINTENANCE_SECRET'\)",
  'PEACEPAD_MAINTENANCE_SECRET=\$maintenanceSecret',
  "GetEnvironmentVariable\('PEACEPAD_IDEMPOTENCY_SECRET'\)",
  'PEACEPAD_IDEMPOTENCY_SECRET=\$idempotencySecret'
)) {
  if ($deployRunner -notmatch $pattern) {
    throw "Supabase deployment runner is missing a fail-closed boundary: $pattern"
  }
}
if ($deployRunner -match '\$visibleProject\[0\]\.database\.region') {
  throw 'Supabase deployment runner still reads the obsolete nested CLI project region field.'
}
foreach ($historicalRef in @('ftdqnhlesqrkstnqgfxr', 'kgechdqdtryktfahyqez')) {
  if ($deployRunner -match $historicalRef) {
    throw "Active deployment runner still references paused historical project: $historicalRef"
  }
}
if ($function -notmatch 'allowedPermissions\s*=\s*new Set\(\["messages",\s*"calendar",\s*"shared-records",\s*"calls"\]\)') {
  throw 'Family invitations must be able to grant the bounded call permission required by the deployed call lifecycle.'
}
foreach ($pattern in @(
  'create table if not exists peacepad_v2\.write_receipt',
  'alter table peacepad_v2\.write_receipt enable row level security',
  'revoke all on table peacepad_v2\.write_receipt from public, anon, authenticated',
  'client_key_hash text not null',
  'request_fingerprint text not null',
  'encrypted_response bytea',
  'pg_advisory_xact_lock',
  'pgp_sym_encrypt',
  'pgp_sym_decrypt',
  'STAGING_AUDIT_RESET_REQUIRED',
  'alter table peacepad_v2\.audit_event drop column if exists result',
  'peacepad_v2_expire_write_receipts'
)) {
  if ($idempotencyReceiptMigration -notmatch $pattern) {
    throw "Idempotency receipt migration is missing required boundary: $pattern"
  }
}
if ($idempotencyReceiptMigration -match '(?i)(message_body|invitation_code|family_name|child_label|file_name|access_token|refresh_token)') {
  throw 'Write receipts must not define columns for identity, family, message, invitation, or file content.'
}
if ($function -match 'p_idempotency_key:\s*context\.idempotencyKey') {
  throw 'Database writes must receive the request-bound HMAC token, never the raw client idempotency key.'
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
foreach ($pattern in @(
  'conversation_direct_participants_unique_idx',
  'peacepad_v2\.can_message\(invitation\.created_by',
  "'grant', jsonb_build_object",
  "'conversation', peacepad_v2\.conversation_json",
  'on conflict \(family_id, participant_identity_ids\)'
)) {
  if ($atomicInvitationMigration -notmatch $pattern) {
    throw "Atomic invitation acceptance is missing required boundary: $pattern"
  }
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
foreach ($table in @('case_binder', 'attachment_upload_intent')) {
  if ($privateRecordsMigration -notmatch "create table if not exists peacepad_v2\.$table") {
    throw "Private Records migration is missing table: $table"
  }
  if ($privateRecordsMigration -notmatch "alter table peacepad_v2\.$table enable row level security") {
    throw "Private Records migration is missing fail-closed RLS: $table"
  }
}
foreach ($rpc in @(
  'peacepad_v2_list_case_binders',
  'peacepad_v2_create_case_binder',
  'peacepad_v2_archive_case_binder',
  'peacepad_v2_prepare_attachment_intent'
)) {
  if ($privateRecordsMigration -notmatch "create or replace function public\.$rpc") {
    throw "Private Records migration is missing RPC: $rpc"
  }
  if ($privateRecordsMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Private Records RPC is not revoked from mobile roles: $rpc"
  }
}
foreach ($pattern in @(
  "upload_transport text not null default 'disabled'",
  'upload_url text check \(upload_url is null\)',
  "status text not null default 'metadata-prepared'",
  "now\(\)\+interval '15 minutes'",
  'peacepad_v2_delete_private_records',
  "'case_binder.created'",
  "'attachment_intent.prepared'"
)) {
  if ($privateRecordsMigration -notmatch $pattern) {
    throw "Private Records migration is missing required boundary: $pattern"
  }
}
foreach ($route in @('/api/v2/case-binders', '/api/v2/attachment-upload-intents')) {
  if ($function -notmatch [regex]::Escape($route)) {
    throw "Edge Function is missing Private Records route: $route"
  }
}

foreach ($pattern in @(
  'create table if not exists peacepad_v2\.device_push_registration',
  'encrypted_token bytea not null',
  'token_digest bytea not null',
  'alter table peacepad_v2\.device_push_registration enable row level security',
  'revoke all on table peacepad_v2\.device_push_registration from public, anon, authenticated',
  'extensions\.pgp_sym_encrypt',
  'extensions\.hmac',
  'peacepad_v2\.remove_deleted_identity_push_registrations',
  'grant execute on function public\.peacepad_v2_register_device_push.*to service_role',
  'grant execute on function public\.peacepad_v2_revoke_device_push.*to service_role'
)) {
  if ($devicePushMigration -notmatch $pattern) {
    throw "Device push migration is missing required boundary: $pattern"
  }
}
if ($devicePushMigration -match '(?i)(token\s+text\s+not\s+null|audit_event.*token|jsonb_build_object\([^)]*token)') {
  throw 'Device push tokens must not be stored in plaintext or returned in receipts.'
}
foreach ($pattern in @(
  'DEVICE_PUSH_REGISTRATION_POSTGRES_VERIFIED',
  'has_table_privilege',
  'pgp_sym_decrypt',
  'Provider token was persisted in plaintext',
  'Account deletion retained a device push token'
)) {
  if ($devicePushProof -notmatch $pattern) {
    throw "Device push PostgreSQL proof is missing required boundary: $pattern"
  }
}
foreach ($pattern in @(
  'create or replace function public\.peacepad_v2_leave_family',
  'security definer',
  'for update',
  'FAMILY_ACCESS_DENIED',
  'CONCURRENCY_CONFLICT',
  "status = 'revoked'",
  'code_hash = uuid_send\(gen_random_uuid\(\)\)',
  'participant_grant_id = grant_row\.participant_grant_id',
  "'family.left'",
  'revoke all on function public\.peacepad_v2_leave_family',
  'to service_role'
)) {
  if ($familyExitMigration -notmatch $pattern) {
    throw "Family-exit migration is missing required boundary: $pattern"
  }
}
foreach ($pattern in @(
  'FAMILY_EXIT_POSTGRES_VERIFIED',
  'Direct authenticated-role family exit was not denied',
  'An outsider left another family',
  'A cross-region family exit was accepted',
  'A stale family-grant version was accepted',
  'Family exit removed the remaining member or shared family history',
  'A departing member retained a usable pending invitation',
  'one content-free audit event'
)) {
  if ($familyExitProof -notmatch $pattern) {
    throw "Family-exit PostgreSQL proof is missing required boundary: $pattern"
  }
}
foreach ($pattern in @(
  'create or replace function public\.peacepad_v2_update_profile',
  'security definer',
  'for update',
  'DISPLAY_NAME_INVALID',
  'REGION_MISMATCH',
  'CONCURRENCY_CONFLICT',
  "'profile.updated'",
  'revoke all on function public\.peacepad_v2_update_profile',
  'to service_role'
)) {
  if ($profileUpdateMigration -notmatch $pattern) {
    throw "Profile-update migration is missing required boundary: $pattern"
  }
}
foreach ($pattern in @(
  'PROFILE_UPDATE_POSTGRES_VERIFIED',
  'Direct authenticated-role profile update was not denied',
  'A cross-region profile update was accepted',
  'A stale profile update was accepted',
  'A control-character display name was accepted',
  'Profile update was not persisted exactly once',
  'Display name entered profile audit content'
)) {
  if ($profileUpdateProof -notmatch $pattern) {
    throw "Profile-update PostgreSQL proof is missing required boundary: $pattern"
  }
}
foreach ($table in @('private_attachment', 'private_storage_cleanup_outbox')) {
  if ($privateAttachmentsMigration -notmatch "create table if not exists peacepad_v2\.$table") {
    throw "Private attachment migration is missing table: $table"
  }
  if ($privateAttachmentsMigration -notmatch "alter table peacepad_v2\.$table enable row level security") {
    throw "Private attachment migration is missing fail-closed RLS: $table"
  }
}
foreach ($rpc in @(
  'peacepad_v2_get_attachment_intent_for_completion',
  'peacepad_v2_complete_private_attachment',
  'peacepad_v2_list_private_attachments',
  'peacepad_v2_authorize_private_attachment',
  'peacepad_v2_list_private_storage_paths_for_account',
  'peacepad_v2_ack_private_storage_cleanup',
  'peacepad_v2_claim_private_storage_cleanup',
  'peacepad_v2_finish_private_storage_cleanup'
)) {
  if ($privateAttachmentsMigration -notmatch "create or replace function public\.$rpc") {
    throw "Private attachment migration is missing RPC: $rpc"
  }
  if ($privateAttachmentsMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Private attachment RPC is not revoked from mobile roles: $rpc"
  }
}
foreach ($pattern in @(
  "'supabase-signed'",
  "'awaiting-upload'",
  'peacepad-private-records',
  'attachment\.uploaded',
  'private_storage_cleanup_outbox'
)) {
  if ($privateAttachmentsMigration -notmatch $pattern) {
    throw "Private attachment migration is missing required boundary: $pattern"
  }
}
foreach ($route in @('/api/v2/attachments', '/complete', '/download')) {
  if ($function -notmatch [regex]::Escape($route)) {
    throw "Edge Function is missing Private Attachment route: $route"
  }
}
if ($privateTimelineMigration -notmatch 'create table if not exists peacepad_v2\.private_timeline_entry') {
  throw 'Private timeline migration is missing its owner-private table.'
}
if ($privateTimelineMigration -notmatch 'alter table peacepad_v2\.private_timeline_entry enable row level security') {
  throw 'Private timeline migration is missing fail-closed RLS.'
}
foreach ($rpc in @('peacepad_v2_list_private_timeline', 'peacepad_v2_link_timeline_source')) {
  if ($privateTimelineMigration -notmatch "create or replace function public\.$rpc") {
    throw "Private timeline migration is missing RPC: $rpc"
  }
  if ($privateTimelineMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Private timeline RPC is not revoked from mobile roles: $rpc"
  }
}
foreach ($pattern in @(
  "source_kind in \('message-event',\s*'schedule-event'\)",
  "source_event_type in \('sent',\s*'correction',\s*'parenting-time',\s*'appointment',\s*'holiday',\s*'change-request'\)",
  'peacepad_v2\.authorized_conversation',
  'peacepad_v2\.visibility_allows',
  "'timeline_entry.linked'"
)) {
  if ($privateTimelineMigration -notmatch $pattern) {
    throw "Private timeline migration is missing required boundary: $pattern"
  }
}
foreach ($prohibited in @('upload_url', 'source_artifact', 'export_package', 'description text', 'title text')) {
  if ($privateTimelineMigration -match $prohibited) {
    throw "Private timeline migration contains prohibited capability or content: $prohibited"
  }
}
if ($function -notmatch [regex]::Escape('/api/v2/timeline-entries')) {
  throw 'Edge Function is missing the private timeline route.'
}
foreach ($pattern in @(
  'create table if not exists peacepad_v2\.audio_call_session',
  'alter table peacepad_v2\.audio_call_session enable row level security',
  'revoke all on table peacepad_v2\.audio_call_session from public, anon, authenticated',
  'audio_call_one_live_conversation_idx',
  'cardinality\(conversation_row\.participant_identity_ids\) <> 2',
  'peacepad_v2\.can_call',
  'peacepad_v2\.authorized_audio_call_conversation',
  'peacepad_v2\.expire_audio_calls',
  'p_expected_version',
  'participant_grant_close_audio_calls',
  'conversation_archive_close_audio_calls',
  "'call\.created'",
  "'call\.accepted'",
  "'call\.declined'",
  "'call\.ended'",
  "'call\.expired'"
)) {
  if ($audioCallMigration -notmatch $pattern) {
    throw "Audio-call migration is missing required boundary: $pattern"
  }
}
foreach ($rpc in @(
  'peacepad_v2_create_audio_call',
  'peacepad_v2_accept_audio_call',
  'peacepad_v2_decline_audio_call',
  'peacepad_v2_end_audio_call',
  'peacepad_v2_get_current_audio_call'
)) {
  if ($audioCallMigration -notmatch "create or replace function public\.$rpc") {
    throw "Audio-call migration is missing RPC: $rpc"
  }
  if ($audioCallMigration -notmatch "revoke all on function public\.$rpc") {
    throw "Audio-call RPC is not revoked from mobile roles: $rpc"
  }
}
foreach ($pattern in @(
  'CALL_ACCESS_DENIED',
  'CALL_ALREADY_ACTIVE',
  'CALL_STATE_INVALID',
  'CONCURRENCY_CONFLICT',
  'IDEMPOTENCY_CONFLICT'
)) {
  if ($audioCallProof -notmatch $pattern) {
    throw "Audio-call PostgreSQL proof is missing assertion coverage: $pattern"
  }
}
if ($audioCallMigration -match '(?im)^\s*(session_code|join_code|sdp|ice_candidate|recording_url|transcript)\s+') {
  throw 'Audio-call persistence must not add public join, signaling, recording, or transcription columns.'
}
foreach ($pattern in @(
  'create table if not exists peacepad_v2\.audio_call_signal_window',
  'revoke all on table peacepad_v2\.audio_call_signal_window from public, anon, authenticated',
  'peacepad_v2\.can_subscribe_audio_call_topic',
  'peacepad_v2_authorize_audio_call_signal',
  'for update',
  'p_expected_version',
  "call_row\.status <> 'active'",
  "interval '10 seconds'",
  'current_count > 30',
  "interval '15 seconds'",
  'peacepad_call_private_listen',
  'peacepad_call_no_client_send',
  'as restrictive',
  'audio_call_clear_signal_window'
)) {
  if ($audioCallSignalingMigration -notmatch $pattern) {
    throw "Private call-signaling migration is missing required boundary: $pattern"
  }
}
if ($audioCallSignalingMigration -match '(?im)^\s*(payload|sdp|candidate|ice)\s+(json|jsonb|text|bytea)') {
  throw 'Private call-signaling persistence must not contain SDP, ICE, or payload columns.'
}
foreach ($pattern in @(
  'SIGNAL_RATE_LIMITED',
  'CALL_STATE_INVALID',
  'CONCURRENCY_CONFLICT',
  'set local role authenticated',
  'Revocation retained private subscription authorization',
  'Signal payload or audit content entered PostgreSQL'
)) {
  if ($audioCallSignalingProof -notmatch $pattern) {
    throw "Private call-signaling proof is missing assertion coverage: $pattern"
  }
}
foreach ($pattern in @(
  'AUDIO_CALL_SIGNAL_BODY_BYTES',
  'AUDIO_CALL_SDP_BYTES',
  'AUDIO_CALL_ICE_CANDIDATE_BYTES',
  'exactKeys',
  'targetIdentityId',
  'oversized SDP',
  'oversized ICE'
)) {
  if (($audioCallSignalValidator + $audioCallSignalTest) -notmatch $pattern) {
    throw "Private call-signaling Edge validation is missing boundary: $pattern"
  }
}
if ($function -match 'realtime\.send\(' -or $function -match 'broadcast_changes') {
  throw 'Call signaling must not use database-origin Broadcast or replay.'
}
foreach ($pattern in @(
  'peacepad_v2_authorize_audio_call_turn',
  'security definer',
  'for update',
  'p_expected_version',
  "call_row.status <> 'active'",
  'authorized_audio_call_conversation',
  'revoke all on function',
  'grant execute on function',
  'to service_role'
)) {
  if ($audioCallTurnMigration -notmatch $pattern) {
    throw "TURN authorization migration is missing required boundary: $pattern"
  }
}
if ($audioCallTurnMigration -match '(?im)^\s*(turn_url|turn_secret|credential|username|password)\s+') {
  throw 'TURN configuration or credentials must not be persisted in PostgreSQL.'
}
foreach ($pattern in @(
  'CALL_ACCESS_DENIED',
  'CALL_STATE_INVALID',
  'CONCURRENCY_CONFLICT',
  'Revoked peer grant',
  'set local role authenticated',
  'unexpectedly wrote audit content'
)) {
  if ($audioCallTurnProof -notmatch $pattern) {
    throw "TURN authorization proof is missing assertion coverage: $pattern"
  }
}
foreach ($pattern in @(
  'HMAC',
  'SHA-1',
  'SHA-256',
  '5 \* 60 \* 1000',
  'config.sharedSecret.length < 32',
  'parseTurnUrls',
  'not deterministic',
  'credential leaks identifiers',
  'weak TURN secret accepted'
)) {
  if (($audioCallTurnIssuer + $audioCallTurnTest) -notmatch $pattern) {
    throw "TURN credential issuer validation is missing boundary: $pattern"
  }
}
if (
  $config -notmatch '\[functions\.peacepad-v2-api\]' -or
  $config -notmatch 'verify_jwt\s*=\s*false'
) {
  throw 'Function must allow public health checks and enforce protected JWTs in its handler.'
}

Write-Output 'SUPABASE_EDGE_BOUNDARY_LOCAL_VERIFIED'
