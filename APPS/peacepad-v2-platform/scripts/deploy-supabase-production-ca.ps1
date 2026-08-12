[CmdletBinding()]
param(
  [string] $SupabaseCli = 'npx',
  [switch] $SkipDeploy
)

$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$projectRef = 'qzekqjewpugdotskrtni'
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
  Write-Output "SUPABASE_PRODUCTION_DEPLOY_PREFLIGHT_VERIFIED region=ca project=$projectRef writes=disabled"
  return
}

$visibleProjectDocument = Invoke-SupabaseCapture @('projects', 'list', '--output-format', 'json') | ConvertFrom-Json
$visibleProjects = if ($null -ne $visibleProjectDocument.projects) { @($visibleProjectDocument.projects) } else { @($visibleProjectDocument) }
$visibleProject = @($visibleProjects | Where-Object { $_.ref -eq $projectRef })
if ($visibleProject.Count -ne 1 -or $visibleProject[0].region -ne 'ca-central-1') {
  throw 'The authenticated CLI identity cannot verify the approved Canada production project. No mutation was attempted.'
}

$maintenanceSecret = [Environment]::GetEnvironmentVariable('PEACEPAD_MAINTENANCE_SECRET')
$idempotencySecret = [Environment]::GetEnvironmentVariable('PEACEPAD_IDEMPOTENCY_SECRET')
foreach ($value in @($maintenanceSecret, $idempotencySecret)) {
  if ([string]::IsNullOrWhiteSpace($value) -or $value.Length -lt 32) {
    throw 'Both production maintenance and idempotency secrets must be supplied through the process environment and contain at least 32 characters.'
  }
}

Invoke-Supabase @(
  'secrets', 'set',
  'PEACEPAD_RUNTIME_ENVIRONMENT=production',
  'PEACEPAD_PRODUCTION_WRITES_ENABLED=false',
  'PEACEPAD_REGION=ca',
  "PEACEPAD_PROJECT_REF=$projectRef",
  "PEACEPAD_FUNCTION_REGION=$functionRegion",
  'PEACEPAD_ALLOWED_ORIGINS=https://peacepad.ca,https://www.peacepad.ca',
  "PEACEPAD_MAINTENANCE_SECRET=$maintenanceSecret",
  "PEACEPAD_IDEMPOTENCY_SECRET=$idempotencySecret",
  '--project-ref', $projectRef,
  '--agent', 'no'
)

Invoke-Supabase @(
  'functions', 'deploy', 'peacepad-v2-api',
  '--project-ref', $projectRef,
  '--no-verify-jwt',
  '--use-api',
  '--agent', 'no',
  '--workdir', $platformRoot
)

Write-Output "SUPABASE_PRODUCTION_EDGE_DEPLOYED region=ca project=$projectRef functionRegion=$functionRegion writes=disabled"
