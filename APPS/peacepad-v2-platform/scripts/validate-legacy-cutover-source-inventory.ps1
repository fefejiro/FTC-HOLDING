[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$platformRoot = Split-Path -Parent $PSScriptRoot
$sqlPath = Join-Path $PSScriptRoot 'inventory-legacy-cutover-source.sql'
$runnerPath = Join-Path $PSScriptRoot 'run-legacy-cutover-source-inventory.ps1'

foreach ($path in @($sqlPath, $runnerPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required legacy inventory file is missing: $path" }
}
$sql = Get-Content -LiteralPath $sqlPath -Raw
$runner = Get-Content -LiteralPath $runnerPath -Raw

foreach ($required in @(
  'begin transaction read only;',
  'LEGACY_SOURCE_INVENTORY_REQUIRED_TABLE_MISSING',
  "'mode', 'read-only-source-inventory'",
  "'containsUserContent', false",
  "'eventsPartnershipScopeAvailable'",
  "'migrationScopes'",
  "'availableOptionalTables'",
  "'sourceSchemaFingerprint'",
  "'sourceSchema', 'public'",
  "'users', (select count(*) from public.users)",
  "'messages', (select count(*) from public.messages)"
)) {
  if (-not $sql.Contains($required)) { throw "Legacy inventory SQL is missing required boundary: $required" }
}
if ($sql -match '(?im)^\s*(insert|update|delete|alter|create|drop|truncate)\b') {
  throw 'Legacy source inventory SQL must not contain a mutating statement.'
}
foreach ($prohibited in @('email', 'display_name', 'content', 'title', 'description', 'id')) {
  if ($sql -match "jsonb_build_object\([\s\S]*'$prohibited'\s*,\s*public\.") {
    throw "Legacy source inventory must not emit source content field: $prohibited"
  }
}
foreach ($required in @(
  'OutputPath already exists',
  'default_transaction_read_only=on',
  'containsUserContent -ne $false',
  'LEGACY_SOURCE_INVENTORY_VERIFIED'
)) {
  if (-not $runner.Contains($required)) { throw "Legacy inventory runner is missing required boundary: $required" }
}
Write-Output 'LEGACY_SOURCE_INVENTORY_STATIC_BOUNDARY_VERIFIED'
