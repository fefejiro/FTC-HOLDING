[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $LegacyDatabaseUrl,
  [Parameter(Mandatory)] [string] $OutputPath,
  [string] $Psql = 'psql'
)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'inventory-legacy-cutover-source.sql'

if ($LegacyDatabaseUrl -notmatch '^postgres(ql)?://') {
  throw 'LegacyDatabaseUrl must be a PostgreSQL connection URL.'
}
if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
  throw 'The read-only source inventory SQL script is missing.'
}
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
if (Test-Path -LiteralPath $resolvedOutput) {
  throw 'OutputPath already exists. Choose a new evidence path; inventory output is never overwritten.'
}

$outputDirectory = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
  throw 'OutputPath directory does not exist.'
}

$priorPgOptions = $env:PGOPTIONS
$env:PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=5000'
try {
  & $Psql $LegacyDatabaseUrl --no-password -X -v ON_ERROR_STOP=1 -v "inventory_output=$resolvedOutput" -f $scriptPath
  if ($LASTEXITCODE -ne 0) { throw "psql exited with code $LASTEXITCODE." }
} finally {
  $env:PGOPTIONS = $priorPgOptions
}

if (-not (Test-Path -LiteralPath $resolvedOutput -PathType Leaf)) {
  throw 'The legacy inventory did not produce an evidence file.'
}
$report = Get-Content -LiteralPath $resolvedOutput -Raw | ConvertFrom-Json
if ($report.schemaVersion -ne 1 -or $report.mode -ne 'read-only-source-inventory' -or $report.containsUserContent -ne $false) {
  throw 'The legacy inventory report does not match the approved content-free contract.'
}
if ($null -eq $report.tableCounts.users -or $null -eq $report.sourceSchemaFingerprint) {
  throw 'The legacy inventory report is incomplete.'
}

Write-Output "LEGACY_SOURCE_INVENTORY_VERIFIED schema=$($report.sourceSchema) content=none evidence=$resolvedOutput"
