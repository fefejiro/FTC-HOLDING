param(
  [switch]$RequireRemote
)

$ErrorActionPreference = "Stop"

function Test-CommandAvailable {
  param([string]$CommandName)
  return [bool](Get-Command $CommandName -ErrorAction SilentlyContinue)
}

function Get-TokenState {
  $tokenFile = Join-Path $HOME ".supabase\access-token"
  if ($env:SUPABASE_ACCESS_TOKEN) {
    return @{ Source = "env"; Present = $true }
  }
  if (Test-Path $tokenFile) {
    return @{ Source = $tokenFile; Present = $true }
  }
  return @{ Source = ""; Present = $false }
}

$databaseUrl = $env:ATEAM_DATABASE_URL
if (-not $databaseUrl) {
  $databaseUrl = $env:DATABASE_URL
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$supabaseCmd = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"

if (-not (Test-Path $supabaseCmd)) {
  throw "Supabase CLI is not installed in APPS/ATEAM. Run npm install first."
}

$tokenState = Get-TokenState
$dockerAvailable = Test-CommandAvailable "docker"
$dockerDaemonReachable = $false
if ($dockerAvailable) {
  try {
    docker info *> $null
    $dockerDaemonReachable = $true
  } catch {
    $dockerDaemonReachable = $false
  }
}

$summary = [ordered]@{
  projectRoot = $projectRoot
  supabaseCliVersion = (& $supabaseCmd --version)
  tokenConfigured = $tokenState.Present
  tokenSource = $tokenState.Source
  projectRefConfigured = [bool]($env:SUPABASE_PROJECT_REF)
  supabaseUrlConfigured = [bool]($env:SUPABASE_URL)
  supabaseServiceRoleKeyConfigured = [bool]($env:SUPABASE_SERVICE_ROLE_KEY)
  databaseUrlConfigured = [bool]$databaseUrl
  preferredManagedBackend = $(if ($databaseUrl) { "postgres" } elseif ($env:SUPABASE_URL -and $env:SUPABASE_SERVICE_ROLE_KEY) { "supabase" } else { "" })
  dockerAvailable = $dockerAvailable
  dockerDaemonReachable = $dockerDaemonReachable
}

$missing = @()
if ($RequireRemote) {
  $hasSupabaseRestPath = $summary.tokenConfigured -and $summary.projectRefConfigured -and $summary.supabaseUrlConfigured -and $summary.supabaseServiceRoleKeyConfigured
  $hasDirectDbPath = $summary.databaseUrlConfigured
  if (-not $hasSupabaseRestPath -and -not $hasDirectDbPath) {
    $missing += "Either ATEAM_DATABASE_URL|DATABASE_URL for direct Postgres, or the full Supabase REST path (SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
  }
}

$summary | ConvertTo-Json -Depth 4

if ($missing.Count -gt 0) {
  Write-Error ("Missing required remote cutover inputs: " + ($missing -join ", "))
}
