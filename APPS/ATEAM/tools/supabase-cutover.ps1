param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
  [ValidateSet("postgres", "supabase")]
  [string]$Backend = "postgres",
  [switch]$MigrateFromHttp,
  [string]$SourceDb
)

$ErrorActionPreference = "Stop"

function Get-SupabaseCommand {
  param([string]$ProjectRoot)
  $cmd = Join-Path $ProjectRoot "node_modules\.bin\supabase.cmd"
  if (-not (Test-Path $cmd)) {
    throw "Supabase CLI is not installed in APPS/ATEAM. Run npm install first."
  }
  return $cmd
}

function Assert-Configured {
  param(
    [string]$ProjectRefValue,
    [string]$BackendName
  )

  if ($BackendName -eq "postgres") {
    if (-not $env:ATEAM_DATABASE_URL -and -not $env:DATABASE_URL) {
      throw "ATEAM_DATABASE_URL or DATABASE_URL is required for the postgres cutover path."
    }
    return
  }

  $tokenFile = Join-Path $HOME ".supabase\access-token"
  if (-not $env:SUPABASE_ACCESS_TOKEN -and -not (Test-Path $tokenFile)) {
    throw "Supabase auth is not configured. Set SUPABASE_ACCESS_TOKEN or run 'supabase login --token <token>' in a normal terminal first."
  }
  if (-not $ProjectRefValue) {
    throw "SUPABASE_PROJECT_REF is required."
  }
  if (-not $env:SUPABASE_URL) {
    throw "SUPABASE_URL is required."
  }
  if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    throw "SUPABASE_SERVICE_ROLE_KEY is required."
  }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$supabaseCmd = Get-SupabaseCommand -ProjectRoot $projectRoot

Assert-Configured -ProjectRefValue $ProjectRef -BackendName $Backend

if ($Backend -eq "postgres") {
  if ($MigrateFromHttp) {
    Write-Host "Migrating existing workflow data into managed Postgres ..."
    Push-Location $projectRoot
    try {
      npm.cmd run migrate:workflow:postgres -- --source-http
    } finally {
      Pop-Location
    }
  }

  if ($SourceDb) {
    Write-Host "Migrating existing workflow data from SQLite into managed Postgres ..."
    Push-Location $projectRoot
    try {
      npm.cmd run migrate:workflow:postgres -- --source-db $SourceDb
    } finally {
      Pop-Location
    }
  }

  Write-Host "Managed Postgres cutover steps completed."
  exit 0
}

Write-Host "Linking Supabase project $ProjectRef ..."
& $supabaseCmd link --project-ref $ProjectRef --workdir $projectRoot

Write-Host "Pushing tracked Supabase migrations ..."
& $supabaseCmd db push --workdir $projectRoot

if ($MigrateFromHttp) {
  Write-Host "Migrating existing workflow data from live ATEAM surfaces ..."
  Push-Location $projectRoot
  try {
    npm.cmd run migrate:workflow:supabase -- --source-http
  } finally {
    Pop-Location
  }
}

if ($SourceDb) {
  Write-Host "Migrating existing workflow data from SQLite source db ..."
  Push-Location $projectRoot
  try {
    npm.cmd run migrate:workflow:supabase -- --source-db $SourceDb
  } finally {
    Pop-Location
  }
}

Write-Host "Supabase cutover steps completed."
