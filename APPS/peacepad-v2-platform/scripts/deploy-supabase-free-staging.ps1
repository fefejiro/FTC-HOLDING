[CmdletBinding()]
param(
  [Parameter(Mandatory)] [ValidateSet('ca', 'us')] [string] $Region,
  [Parameter(Mandatory)] [string] $ProjectRef,
  [Parameter(Mandatory)] [string] $FunctionRegion,
  [string] $SupabaseCli = 'supabase',
  [switch] $SkipDeploy
)

$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$expectedProjects = @{
  ca = @{ ProjectRef = 'rohvkyuxbnqzglaromms'; DatabaseRegion = 'ca-central-1'; FunctionRegion = 'ca-central-1' }
  us = @{ ProjectRef = 'spmpndalcvwmygznihec'; DatabaseRegion = 'us-east-2'; FunctionRegion = 'us-east-1' }
}

function Invoke-Supabase([string[]] $Arguments) {
  if ($SupabaseCli.EndsWith('.js', [StringComparison]::OrdinalIgnoreCase)) {
    & node $SupabaseCli @Arguments
  } else {
    & $SupabaseCli @Arguments
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed with exit code $LASTEXITCODE."
  }
}

function Invoke-SupabaseCapture([string[]] $Arguments) {
  if ($SupabaseCli.EndsWith('.js', [StringComparison]::OrdinalIgnoreCase)) {
    $output = & node $SupabaseCli @Arguments
  } else {
    $output = & $SupabaseCli @Arguments
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI read-only preflight failed with exit code $LASTEXITCODE."
  }
  return ($output -join "`n")
}

& (Join-Path $PSScriptRoot 'validate-supabase-edge-function.ps1')

$expected = $expectedProjects[$Region]
if ($ProjectRef -ne $expected.ProjectRef) {
  throw "Project ref does not match the approved $Region fictional-staging project."
}
if ($FunctionRegion -ne $expected.FunctionRegion) {
  throw "Function region does not match the approved $Region staging invocation region."
}

if (-not $SkipDeploy) {
  $visibleProjects = Invoke-SupabaseCapture @('projects', 'list', '--output', 'json') | ConvertFrom-Json
  $visibleProject = @($visibleProjects | Where-Object { $_.ref -eq $ProjectRef })
  if ($visibleProject.Count -ne 1) {
    throw "The authenticated Supabase CLI identity cannot see the approved $Region project. No mutation was attempted."
  }
  if ($visibleProject[0].region -ne $expected.DatabaseRegion) {
    throw "The approved project is visible in an unexpected database region. No mutation was attempted."
  }
  $maintenanceSecret = [Environment]::GetEnvironmentVariable('PEACEPAD_MAINTENANCE_SECRET')
  if ([string]::IsNullOrWhiteSpace($maintenanceSecret) -or $maintenanceSecret.Length -lt 32) {
    throw 'PEACEPAD_MAINTENANCE_SECRET must be supplied through the process environment and contain at least 32 characters.'
  }
  $idempotencySecret = [Environment]::GetEnvironmentVariable('PEACEPAD_IDEMPOTENCY_SECRET')
  if ([string]::IsNullOrWhiteSpace($idempotencySecret) -or $idempotencySecret.Length -lt 32) {
    throw 'PEACEPAD_IDEMPOTENCY_SECRET must be supplied through the process environment and contain at least 32 characters.'
  }
  & (Join-Path $PSScriptRoot 'validate-protected-provider-config.ps1')
  $pushTokenSecret = [Environment]::GetEnvironmentVariable('PEACEPAD_PUSH_TOKEN_SECRET')
  $turnUrls = [Environment]::GetEnvironmentVariable('PEACEPAD_TURN_URLS')
  $turnSharedSecret = [Environment]::GetEnvironmentVariable('PEACEPAD_TURN_SHARED_SECRET')
  $supportDiscoveryUrl = [Environment]::GetEnvironmentVariable('PEACEPAD_SUPPORT_DISCOVERY_URL')
  $supportDiscoveryToken = [Environment]::GetEnvironmentVariable('PEACEPAD_SUPPORT_DISCOVERY_TOKEN')
  $coachTranscriptionUrl = [Environment]::GetEnvironmentVariable('PEACEPAD_COACH_TRANSCRIPTION_URL')
  $coachTranscriptionToken = [Environment]::GetEnvironmentVariable('PEACEPAD_COACH_TRANSCRIPTION_TOKEN')
  $coachConversationUrl = [Environment]::GetEnvironmentVariable('PEACEPAD_COACH_CONVERSATION_URL')
  $coachConversationToken = [Environment]::GetEnvironmentVariable('PEACEPAD_COACH_CONVERSATION_TOKEN')
}

if ($SkipDeploy) {
  Write-Output "SUPABASE_DEPLOY_PREFLIGHT_VERIFIED region=$Region project=$ProjectRef"
  return
}

Invoke-Supabase @(
  'secrets', 'set',
  "PEACEPAD_REGION=$Region",
  "PEACEPAD_PROJECT_REF=$ProjectRef",
  "PEACEPAD_FUNCTION_REGION=$FunctionRegion",
  "PEACEPAD_MAINTENANCE_SECRET=$maintenanceSecret",
  "PEACEPAD_IDEMPOTENCY_SECRET=$idempotencySecret",
  "PEACEPAD_PUSH_TOKEN_SECRET=$pushTokenSecret",
  "PEACEPAD_TURN_URLS=$turnUrls",
  "PEACEPAD_TURN_SHARED_SECRET=$turnSharedSecret",
  "PEACEPAD_SUPPORT_DISCOVERY_URL=$supportDiscoveryUrl",
  "PEACEPAD_SUPPORT_DISCOVERY_TOKEN=$supportDiscoveryToken",
  "PEACEPAD_COACH_TRANSCRIPTION_URL=$coachTranscriptionUrl",
  "PEACEPAD_COACH_TRANSCRIPTION_TOKEN=$coachTranscriptionToken",
  "PEACEPAD_COACH_CONVERSATION_URL=$coachConversationUrl",
  "PEACEPAD_COACH_CONVERSATION_TOKEN=$coachConversationToken",
  '--project-ref', $ProjectRef,
  '--agent', 'no'
)

Invoke-Supabase @(
  'functions', 'deploy', 'peacepad-v2-api',
  '--project-ref', $ProjectRef,
  '--no-verify-jwt',
  '--use-api',
  '--agent', 'no',
  '--workdir', $platformRoot
)

Write-Output "SUPABASE_EDGE_DEPLOYED region=$Region project=$ProjectRef functionRegion=$FunctionRegion"
