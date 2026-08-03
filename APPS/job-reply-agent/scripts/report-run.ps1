param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern("^[a-z0-9][a-z0-9_-]{1,31}$")]
  [string]$InstanceId,
  [string]$ProjectRoot = "",
  [string]$StateRoot = ""
)

$ErrorActionPreference = "Stop"
if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $StateRoot) { $StateRoot = $ProjectRoot }
$root = (Resolve-Path -LiteralPath $ProjectRoot).Path
$statePath = (Resolve-Path -LiteralPath $StateRoot).Path
$env:JOB_AGENT_INSTANCE_ID = $InstanceId
$env:JOB_AGENT_STATE_ROOT = $statePath

Push-Location $root
try {
  & npm run report -- --instance=$InstanceId
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
