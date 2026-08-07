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

& (Join-Path $PSScriptRoot 'validate-supabase-edge-function.ps1')

if ($SkipDeploy) {
  Write-Output "SUPABASE_DEPLOY_PREFLIGHT_VERIFIED region=$Region project=$ProjectRef"
  return
}

Invoke-Supabase @(
  'secrets', 'set',
  "PEACEPAD_REGION=$Region",
  "PEACEPAD_PROJECT_REF=$ProjectRef",
  "PEACEPAD_FUNCTION_REGION=$FunctionRegion",
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
