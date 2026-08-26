[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$approvalPath = Join-Path $root "config/staging-approval.example.json"
$approval = Get-Content -LiteralPath $approvalPath -Raw | ConvertFrom-Json

if ($approval.deploymentApproved -ne $false) {
  throw "The committed approval example must remain deployment-blocked."
}
if (@($approval.approvals.PSObject.Properties | Where-Object { $_.Value -ne $false }).Count -ne 0) {
  throw "Every committed approval flag must default to false."
}
if (@($approval.owners.PSObject.Properties | Where-Object { $null -ne $_.Value }).Count -ne 0) {
  throw "The committed approval example cannot name unconfirmed owners."
}

$backends = @(
  @{ Region = "ca-central-1"; Key = "peacepad-v2/staging/ca-central-1/terraform.tfstate" },
  @{ Region = "us-east-2"; Key = "peacepad-v2/staging/us-east-2/terraform.tfstate" }
)
$seenKeys = @{}
foreach ($backend in $backends) {
  $path = Join-Path $root "infra/terraform/environments/staging/$($backend.Region)/backend.hcl.example"
  $content = Get-Content -LiteralPath $path -Raw
  foreach ($required in @(
    "region       = `"$($backend.Region)`"",
    "key          = `"$($backend.Key)`"",
    "encrypt      = true",
    "use_lockfile = true",
    "replace-with-"
  )) {
    if (-not $content.Contains($required)) { throw "$path is missing required backend control: $required" }
  }
  if ($content -match '(?i)access_key|secret_key|session_token') {
    throw "$path must not contain credential fields."
  }
  if ($seenKeys.ContainsKey($backend.Key)) { throw "Remote-state keys must be unique." }
  $seenKeys[$backend.Key] = $true
}

foreach ($document in @(
  "docs/AWS_STAGING_PREREQUISITES.md",
  "docs/POSTGRES_RESTORATION_RUNBOOK.md",
  "verification/fictional-restoration-fixture.sql"
)) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $document))) {
    throw "Missing required prerequisite artifact: $document"
  }
}

Write-Host "PEACEPAD_V2_STAGING_PREREQUISITES_STATIC_PASS"
