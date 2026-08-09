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
  ca = @{ ProjectRef = 'ftdqnhlesqrkstnqgfxr'; DatabaseRegion = 'ca-central-1'; FunctionRegion = 'ca-central-1' }
  us = @{ ProjectRef = 'kgechdqdtryktfahyqez'; DatabaseRegion = 'us-east-2'; FunctionRegion = 'us-east-1' }
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
  if ($visibleProject[0].database.region -ne $expected.DatabaseRegion) {
    throw "The approved project is visible in an unexpected database region. No mutation was attempted."
  }
  $maintenanceSecret = [Environment]::GetEnvironmentVariable('PEACEPAD_MAINTENANCE_SECRET')
  if ([string]::IsNullOrWhiteSpace($maintenanceSecret) -or $maintenanceSecret.Length -lt 32) {
    throw 'PEACEPAD_MAINTENANCE_SECRET must be supplied through the process environment and contain at least 32 characters.'
  }
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
