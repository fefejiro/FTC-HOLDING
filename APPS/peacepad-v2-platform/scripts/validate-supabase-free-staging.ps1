[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "..\config\supabase-free-staging.example.json"),
  [string]$ManagedRestoreScriptPath = (Join-Path $PSScriptRoot "verify-managed-logical-restoration.sh")
)

$ErrorActionPreference = "Stop"
$resolved = (Resolve-Path -LiteralPath $ConfigPath).Path
$config = Get-Content -LiteralPath $resolved -Raw | ConvertFrom-Json

if ($config.schemaVersion -ne 1) { throw "Unsupported Supabase staging schemaVersion." }
if ($config.deploymentApproved -ne $false) { throw "Example/config must remain unapproved until the release gate is signed." }
if ($config.fictionalDataOnly -ne $true) { throw "Supabase free staging must be fictional-data-only." }
if ($config.productionApiWritesEnabled -ne $false) { throw "Production API writes must remain disabled." }

$ca = $config.regions.ca
if (-not $ca) { throw "Canadian staging is required." }
if (@($config.regions.PSObject.Properties).Count -ne 1) { throw "Exactly one Canadian staging region is allowed." }
if ($ca.supabaseRegion -ne "ca-central-1") { throw "Canadian staging must be pinned to ca-central-1." }

foreach ($region in @($ca)) {
  if ($region.projectRef -match "[./:]" -or $region.projectRef -match "\s") {
    throw "Store only the public project reference in configuration, never a URL or secret."
  }
  if ($region.apiBaseUrl -notmatch '^https://') { throw "Staging API base URLs must use HTTPS." }
  if ($region.apiBaseUrl -match 'api\.peacepad\.ca') { throw "Production PeacePad API targets are forbidden." }
}

$raw = Get-Content -LiteralPath $resolved -Raw
if ($raw -match '(?i)(service_role|service-role|secret[_-]?key|postgres(?:ql)?://|password\s*[=:])') {
  throw "Supabase configuration contains a forbidden secret or database connection string."
}

$restoreScript = Get-Content -LiteralPath (Resolve-Path -LiteralPath $ManagedRestoreScriptPath).Path -Raw
$requiredRestorePatterns = @(
  'rohvkyuxbnqzglaromms',
  'begin read only',
  'pg_dump.+--data-only.+--schema=peacepad_v2',
  'pg_restore.+--data-only.+--disable-triggers.+--single-transaction.+--exit-on-error',
  'source_fingerprint.+restored_fingerprint',
  'rm -f -- "\$dump_path"',
  'dumpRetained: false',
  'productionContacted: false'
)
foreach ($pattern in $requiredRestorePatterns) {
  if ($restoreScript -notmatch $pattern) {
    throw "Managed logical restoration is missing required safety contract: $pattern"
  }
}
if ($restoreScript -match 'pg_restore[^\r\n]+--dbname="\$DATABASE_URL"') {
  throw "Managed restoration must never restore into the managed source database."
}

Write-Output "SUPABASE_FREE_STAGING_CONFIG_PASS"
