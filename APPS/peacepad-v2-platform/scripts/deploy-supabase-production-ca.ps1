[CmdletBinding()]
param(
  [string] $SupabaseCli = 'npx',
  [switch] $SkipDeploy,
  [switch] $EnableWrites,
  [string] $Confirmation = ''
)

$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$projectRef = 'rohvkyuxbnqzglaromms'
$functionRegion = 'ca-central-1'

function Invoke-Supabase([string[]] $Arguments) {
  if ($SupabaseCli -eq 'npx') {
    & npx supabase@latest @Arguments
  } elseif ($SupabaseCli.EndsWith('.js', [StringComparison]::OrdinalIgnoreCase)) {
    & node $SupabaseCli @Arguments
  } else {
    & $SupabaseCli @Arguments
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed with exit code $LASTEXITCODE."
  }
}

function Invoke-SupabaseCapture([string[]] $Arguments) {
  if ($SupabaseCli -eq 'npx') {
    $output = & npx supabase@latest @Arguments
  } elseif ($SupabaseCli.EndsWith('.js', [StringComparison]::OrdinalIgnoreCase)) {
    $output = & node $SupabaseCli @Arguments
  } else {
    $output = & $SupabaseCli @Arguments
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI read-only preflight failed with exit code $LASTEXITCODE."
  }
  return ($output -join "`n")
}

& (Join-Path $PSScriptRoot 'validate-supabase-production-edge.ps1')

if ($SkipDeploy) {
  Write-Output "SUPABASE_PRODUCTION_DEPLOY_PREFLIGHT_VERIFIED region=ca project=$projectRef writes=$($EnableWrites.IsPresent)"
  return
}

if (-not $EnableWrites -or $Confirmation -cne 'PROMOTE PEACEPAD CA TO PRODUCTION') {
  throw 'Production deployment requires -EnableWrites and the exact confirmation PROMOTE PEACEPAD CA TO PRODUCTION.'
}

$visibleProjectDocument = Invoke-SupabaseCapture @('projects', 'list', '--output-format', 'json') | ConvertFrom-Json
$visibleProjects = if ($null -ne $visibleProjectDocument.projects) { @($visibleProjectDocument.projects) } else { @($visibleProjectDocument) }
$visibleProject = @($visibleProjects | Where-Object { $_.ref -eq $projectRef })
if ($visibleProject.Count -ne 1 -or $visibleProject[0].region -ne 'ca-central-1') {
  throw 'The authenticated CLI identity cannot verify the approved Canada production project. No mutation was attempted.'
}

$maintenanceSecret = [Environment]::GetEnvironmentVariable('PEACEPAD_MAINTENANCE_SECRET')
$idempotencySecret = [Environment]::GetEnvironmentVariable('PEACEPAD_IDEMPOTENCY_SECRET')
$pushTokenSecret = [Environment]::GetEnvironmentVariable('PEACEPAD_PUSH_TOKEN_SECRET')
foreach ($value in @($maintenanceSecret, $idempotencySecret, $pushTokenSecret)) {
  if ([string]::IsNullOrWhiteSpace($value) -or $value.Length -lt 32) {
    throw 'Production maintenance, idempotency, and push-token secrets must be supplied through the process environment and contain at least 32 characters.'
  }
}

& (Join-Path $PSScriptRoot 'validate-protected-provider-config.ps1')
$cloudflareTurnKeyId = [Environment]::GetEnvironmentVariable('PEACEPAD_CLOUDFLARE_TURN_KEY_ID')
$cloudflareTurnApiToken = [Environment]::GetEnvironmentVariable('PEACEPAD_CLOUDFLARE_TURN_API_TOKEN')
$turnUrls = [Environment]::GetEnvironmentVariable('PEACEPAD_TURN_URLS')
$turnSharedSecret = [Environment]::GetEnvironmentVariable('PEACEPAD_TURN_SHARED_SECRET')
$supportDiscoveryUrl = [Environment]::GetEnvironmentVariable('PEACEPAD_SUPPORT_DISCOVERY_URL')
$supportDiscoveryToken = [Environment]::GetEnvironmentVariable('PEACEPAD_SUPPORT_DISCOVERY_TOKEN')
$coachTranscriptionUrl = [Environment]::GetEnvironmentVariable('PEACEPAD_COACH_TRANSCRIPTION_URL')
$coachTranscriptionToken = [Environment]::GetEnvironmentVariable('PEACEPAD_COACH_TRANSCRIPTION_TOKEN')
$geminiApiKey = [Environment]::GetEnvironmentVariable('PEACEPAD_GEMINI_API_KEY')
$coachConversationUrl = [Environment]::GetEnvironmentVariable('PEACEPAD_COACH_CONVERSATION_URL')
$coachConversationToken = [Environment]::GetEnvironmentVariable('PEACEPAD_COACH_CONVERSATION_TOKEN')

$secretArguments = @(
  'secrets', 'set',
  'PEACEPAD_RUNTIME_ENVIRONMENT=production',
  'PEACEPAD_PRODUCTION_WRITES_ENABLED=true',
  'PEACEPAD_REGION=ca',
  "PEACEPAD_PROJECT_REF=$projectRef",
  "PEACEPAD_FUNCTION_REGION=$functionRegion",
  'PEACEPAD_ALLOWED_ORIGINS=https://peacepad.ca,https://www.peacepad.ca',
  "PEACEPAD_MAINTENANCE_SECRET=$maintenanceSecret",
  "PEACEPAD_IDEMPOTENCY_SECRET=$idempotencySecret",
  "PEACEPAD_PUSH_TOKEN_SECRET=$pushTokenSecret"
)
if (-not [string]::IsNullOrWhiteSpace($cloudflareTurnKeyId)) {
  $secretArguments += "PEACEPAD_CLOUDFLARE_TURN_KEY_ID=$cloudflareTurnKeyId", "PEACEPAD_CLOUDFLARE_TURN_API_TOKEN=$cloudflareTurnApiToken"
} else {
  $secretArguments += "PEACEPAD_TURN_URLS=$turnUrls", "PEACEPAD_TURN_SHARED_SECRET=$turnSharedSecret"
}
if (-not [string]::IsNullOrWhiteSpace($geminiApiKey)) {
  $secretArguments += "PEACEPAD_GEMINI_API_KEY=$geminiApiKey"
} else {
  $secretArguments += "PEACEPAD_COACH_TRANSCRIPTION_URL=$coachTranscriptionUrl", "PEACEPAD_COACH_TRANSCRIPTION_TOKEN=$coachTranscriptionToken"
}
if (-not [string]::IsNullOrWhiteSpace($supportDiscoveryUrl)) {
  $secretArguments += "PEACEPAD_SUPPORT_DISCOVERY_URL=$supportDiscoveryUrl", "PEACEPAD_SUPPORT_DISCOVERY_TOKEN=$supportDiscoveryToken"
}
if (-not [string]::IsNullOrWhiteSpace($coachConversationUrl)) {
  $secretArguments += "PEACEPAD_COACH_CONVERSATION_URL=$coachConversationUrl", "PEACEPAD_COACH_CONVERSATION_TOKEN=$coachConversationToken"
}
$secretArguments += '--project-ref', $projectRef, '--agent', 'no'
Invoke-Supabase $secretArguments

Invoke-Supabase @(
  'functions', 'deploy', 'peacepad-v2-api',
  '--project-ref', $projectRef,
  '--no-verify-jwt',
  '--use-api',
  '--agent', 'no',
  '--workdir', $platformRoot
)

Write-Output "SUPABASE_PRODUCTION_EDGE_DEPLOYED region=ca project=$projectRef functionRegion=$functionRegion writes=enabled"
