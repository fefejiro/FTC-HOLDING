[CmdletBinding()]
param(
  [string]$AdminUrl = "postgresql://peacepad_local_admin@127.0.0.1:55432/postgres",
  [string]$PostgresBin = "C:\Program Files\PostgreSQL\18\bin",
  [string]$EvidenceDirectory = "D:\FTC-HOLDING-cache\peacepad-v2-postgres\restoration-evidence"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$fixture = Join-Path $root "verification/fictional-restoration-fixture.sql"
$uri = [Uri]$AdminUrl
if ($uri.Scheme -notin @("postgres", "postgresql")) { throw "AdminUrl must use PostgreSQL." }
if ($uri.Host -notin @("localhost", "127.0.0.1", "::1")) { throw "Restoration verification is loopback-only." }

$userInfo = $uri.UserInfo.Split(':', 2)
$username = [Uri]::UnescapeDataString($userInfo[0])
if ($userInfo.Count -eq 2) { $env:PGPASSWORD = [Uri]::UnescapeDataString($userInfo[1]) }
$port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$suffix = "{0}-{1}" -f (Get-Date -Format "yyyyMMddHHmmss"), $PID
$sourceDatabase = "peacepad_v2_restore_source_$($suffix.Replace('-', '_'))"
$restoredDatabase = "peacepad_v2_restore_target_$($suffix.Replace('-', '_'))"
New-Item -ItemType Directory -Force -Path $EvidenceDirectory | Out-Null
$dumpPath = Join-Path $EvidenceDirectory "$suffix.dump"
$resultPath = Join-Path $EvidenceDirectory "$suffix.json"

function Invoke-PgTool {
  param([string]$Tool, [string[]]$Arguments)
  & (Join-Path $PostgresBin $Tool) @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Tool failed with exit code $LASTEXITCODE." }
}

try {
  Invoke-PgTool "createdb.exe" @("-h", $uri.Host, "-p", "$port", "-U", $username, $sourceDatabase)
  Invoke-PgTool "psql.exe" @("-h", $uri.Host, "-p", "$port", "-U", $username, "-d", $sourceDatabase, "-f", $fixture)
  Invoke-PgTool "pg_dump.exe" @("-h", $uri.Host, "-p", "$port", "-U", $username, "-d", $sourceDatabase, "-Fc", "-f", $dumpPath)
  Invoke-PgTool "createdb.exe" @("-h", $uri.Host, "-p", "$port", "-U", $username, $restoredDatabase)
  Invoke-PgTool "pg_restore.exe" @("-h", $uri.Host, "-p", "$port", "-U", $username, "-d", $restoredDatabase, "--exit-on-error", $dumpPath)

  $probeCount = & (Join-Path $PostgresBin "psql.exe") -h $uri.Host -p $port -U $username -d $restoredDatabase -Atc "SELECT count(*) FROM staging_restore_probe"
  $migrationCount = & (Join-Path $PostgresBin "psql.exe") -h $uri.Host -p $port -U $username -d $restoredDatabase -Atc "SELECT count(*) FROM staging_schema_migrations WHERE checksum ~ '^[a-f0-9]{64}$'"
  $regions = & (Join-Path $PostgresBin "psql.exe") -h $uri.Host -p $port -U $username -d $restoredDatabase -Atc "SELECT string_agg(data_region, ',' ORDER BY data_region) FROM staging_restore_probe"
  if ($probeCount -ne "2" -or $migrationCount -ne "2" -or $regions -ne "ca,us") {
    throw "Restored verification values did not match the fictional source."
  }

  $evidence = [ordered]@{
    result = "POSTGRES_RESTORATION_VERIFIED"
    timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
    host = $uri.Host
    port = $port
    postgresVersion = (& (Join-Path $PostgresBin "psql.exe") --version)
    dumpSha256 = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
    restoredProbeRecords = [int]$probeCount
    restoredMigrationChecksums = [int]$migrationCount
    restoredRegions = @("ca", "us")
    dataClassification = "fictional-only"
  }
  $evidence | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding utf8
  Write-Host "PEACEPAD_V2_POSTGRES_RESTORATION_PASS evidence=$resultPath"
} finally {
  foreach ($database in @($restoredDatabase, $sourceDatabase)) {
    & (Join-Path $PostgresBin "dropdb.exe") -h $uri.Host -p $port -U $username --if-exists $database 2>$null
  }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
