[CmdletBinding()]
param(
  [string]$DatabaseName = "saywetin",
  [string]$PostgresService = "Postgres",
  [string]$SayWetinService = "saywetin-api",
  [switch]$SkipDeploy
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$saywetinPath = Join-Path $root "APPS\saywetin"

Write-Host "Creating/verifying Railway Postgres database '$DatabaseName' on service '$PostgresService'..."
railway run --service $PostgresService -- node scripts/railway-postgres-admin.mjs create --db $DatabaseName

$publicUrl = railway run --service $PostgresService -- node scripts/railway-postgres-admin.mjs emit-url --db $DatabaseName
if ([string]::IsNullOrWhiteSpace($publicUrl)) {
  throw "Could not resolve public database URL for migration."
}

Write-Host "Running SayWetin schema push against isolated Railway database..."
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $publicUrl.Trim()
  Push-Location $saywetinPath
  try {
    npx drizzle-kit push --force
  } finally {
    Pop-Location
  }
} finally {
  $env:DATABASE_URL = $previousDatabaseUrl
}

$privateUrl = railway run --service $PostgresService -- node scripts/railway-postgres-admin.mjs emit-url --db $DatabaseName --private
if ([string]::IsNullOrWhiteSpace($privateUrl)) {
  throw "Could not resolve private database URL for Railway runtime."
}

Write-Host "Updating SayWetin DATABASE_URL without printing the secret..."
if ($SkipDeploy) {
  $privateUrl.Trim() | railway variable set DATABASE_URL --stdin --service $SayWetinService --skip-deploys
} else {
  $privateUrl.Trim() | railway variable set DATABASE_URL --stdin --service $SayWetinService
}

if (-not $SkipDeploy) {
  Write-Host "Redeploying SayWetin API..."
  railway deployment redeploy --service $SayWetinService --yes
}

Write-Host "Done. Re-run scripts\verify-saywetin-prod.ps1 after the deployment is live."
