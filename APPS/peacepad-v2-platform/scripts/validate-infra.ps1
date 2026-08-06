[CmdletBinding()]
param(
  [string]$TerraformPath = "terraform"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$terraformRoot = Join-Path $root "infra/terraform"
$module = Join-Path $terraformRoot "modules/regional-data-plane"
$environments = @(
  (Join-Path $terraformRoot "environments/staging/ca-central-1"),
  (Join-Path $terraformRoot "environments/staging/us-east-2")
)
$secretScan = Join-Path $PSScriptRoot "check-secrets.ps1"

function Invoke-Terraform {
  param([string]$WorkingDirectory, [string[]]$Arguments)

  Write-Host "terraform $($Arguments -join ' ') [$WorkingDirectory]"
  & $TerraformPath "-chdir=$WorkingDirectory" @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Terraform failed with exit code $LASTEXITCODE."
  }
}

& $secretScan
if (-not $?) {
  throw "Infrastructure secret scan failed."
}

Invoke-Terraform -WorkingDirectory $terraformRoot -Arguments @("fmt", "-check", "-recursive")
Invoke-Terraform -WorkingDirectory $module -Arguments @("init", "-backend=false", "-input=false")
Invoke-Terraform -WorkingDirectory $module -Arguments @("validate")
Invoke-Terraform -WorkingDirectory $module -Arguments @("test", "-no-color")

foreach ($environment in $environments) {
  Invoke-Terraform -WorkingDirectory $environment -Arguments @("init", "-backend=false", "-input=false")
  Invoke-Terraform -WorkingDirectory $environment -Arguments @("validate")
}

Write-Host "PEACEPAD_V2_INFRA_STATIC_GATES_PASS"
