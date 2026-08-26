[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root "config/production-cutover.example.json"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json

function Assert-Contract {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "PEACEPAD_V2_PRODUCTION_CUTOVER_CONTRACT_BLOCKED: $Message" }
}

Assert-Contract ($manifest.schemaVersion -eq 2) "Unknown production-cutover contract version."
Assert-Contract ($manifest.cutoverApproved -eq $false) "Committed contract must not approve production cutover."
Assert-Contract ($manifest.source.system -eq "legacy-peacepad-express-postgresql") "Legacy source system changed without review."
Assert-Contract ($manifest.source.identityProvider -eq "legacy-replit-auth") "Legacy identity source changed without review."
Assert-Contract ($manifest.target.system -eq "peacepad-native-v2-supabase") "V2 target system changed without review."
Assert-Contract ($manifest.target.identityProvider -eq "supabase-auth") "V2 identity target changed without review."
Assert-Contract ($manifest.target.region -eq "unset") "Committed contract must not name an unverified production region."
Assert-Contract ($manifest.identityStrategy -eq "claim-after-supabase-auth") "Identity migration must not silently recreate legacy sessions."
Assert-Contract ($manifest.scopeReconciliation.sourceEvidenceRequired -eq $true) "Scope reconciliation must require read-only source evidence."
Assert-Contract ($manifest.scopeReconciliation.safelyScopedRows -eq "import-only-after-exact-source-inventory-reconciliation") "Safely scoped rows must be reconciled before import."
Assert-Contract ($manifest.scopeReconciliation.unscopedRows -eq "retain-in-read-only-v1-quarantine-until-verified-user-claim") "Unscoped rows must remain quarantined until a verified user claim."
Assert-Contract ($manifest.scopeReconciliation.ambiguousRows -eq "block-cutover-and-require-human-review") "Ambiguous source ownership must block cutover."
Assert-Contract ($manifest.scopeReconciliation.silentDropAllowed -eq $false) "Unscoped source rows must not be silently dropped."
Assert-Contract ($manifest.scopeReconciliation.automaticReassignmentAllowed -eq $false) "Unscoped source rows must not be automatically reassigned."

$requiredMappings = @{
  "users" = "identity"
  "users consent fields" = "consent_record"
  "partnerships" = "family_circle + participant_grant"
  "conversations + conversation_members" = "conversation"
  "messages" = "message_event"
  "events" = "calendar_layer + schedule_event"
  "notes + child updates" = "legacy_record_archive"
  "tasks" = "legacy_task_archive"
  "expenses + participants + settlements" = "legacy_expense_archive"
  "supported message, receipt, and record attachments" = "private storage + legacy_attachment_manifest"
}
foreach ($source in $requiredMappings.Keys) {
  $matches = @($manifest.mappings | Where-Object { $_.source -eq $source -and $_.target -eq $requiredMappings[$source] -and $_.required -eq $true })
  Assert-Contract ($matches.Count -eq 1) "Required mapping '$source' is missing or ambiguous."
}

$requiredImportControls = @(
  "supabase-auth-user-exists-for-every-verified-email-claim",
  "explicit-partnership-scope-for-every-conversation-and-event",
  "exact-safely-scoped-and-unscoped-count-reconciliation",
  "unscoped-rows-retained-in-read-only-v1-quarantine-until-verified-user-claim",
  "no-silent-drop-or-automatic-reassignment-of-unscoped-data",
  "text-only-message-import-with-media-and-deleted-content-quarantined",
  "timestamped-consent-ledger-or-user-reconsent",
  "fresh-target-or-reviewed-reconciliation-plan",
  "no-raw-password-or-password-hash-import-without-isolated-supabase-compatibility-proof",
  "no-legacy-call-recording-or-transcript-import",
  "attachment-count-byte-length-and-sha256-reconciliation-before-write-enable"
)
foreach ($item in $requiredImportControls) {
  Assert-Contract (@($manifest.requiredImportControls) -contains $item) "Required import control '$item' is missing."
}

$requiredUnmapped = @(
  "children-profiles",
  "call-recordings-and-transcripts",
  "ai-profiles-and-interventions",
  "push-subscriptions"
)
foreach ($item in $requiredUnmapped) {
  Assert-Contract (@($manifest.unmappedLegacyData) -contains $item) "Unmapped legacy data '$item' must remain visible to release reviewers."
}

$requiredEvidence = @(
  "provider-backup-or-pitr",
  "read-only-source-inventory",
  "disposable-full-migration-rehearsal",
  "row-count-and-content-fingerprint-comparison",
  "two-account-claim-and-rollback-journey",
  "approved-retention-plan-for-unmapped-data",
  "product-privacy-security-qa-release-signoff"
)
foreach ($item in $requiredEvidence) {
  Assert-Contract (@($manifest.requiredEvidence) -contains $item) "Required production evidence '$item' is missing."
}

Assert-Contract ($manifest.rollback.legacyReadWriteRemainsAuthoritativeUntil -eq "post-cutover-acceptance") "Legacy rollback authority must remain explicit."
Assert-Contract ($manifest.rollback.nativeV2ProductionWritesEnabled -eq $false) "Committed contract must keep Native V2 production writes disabled."
Assert-Contract ($null -eq $manifest.rollback.rollbackOwner) "Committed contract must not fabricate a rollback owner."

Write-Host "PEACEPAD_V2_PRODUCTION_CUTOVER_CONTRACT_STATIC_PASS"
Write-Host "Production cutover remains blocked until the listed external evidence and approvals exist."
