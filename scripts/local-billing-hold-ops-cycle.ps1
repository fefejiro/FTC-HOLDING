[CmdletBinding()]
param(
  [ValidateSet("Health", "StatusSync", "AnionDeploy", "FtcSiteDeploy")]
  [string]$Mode = "Health"
)

$ErrorActionPreference = "Continue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$logDir = Join-Path $root "DOCS\health\local-ops"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$logPath = Join-Path $logDir "$stamp-$Mode.log"
$summaryPath = Join-Path $root "DOCS\health\LOCAL-BILLING-HOLD-OPS-LATEST.md"

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $logPath -Value $line
  Write-Host $line
}

function Invoke-LoggedCommand {
  param(
    [Parameter(Mandatory = $true)] [string]$Label,
    [Parameter(Mandatory = $true)] [string]$Command,
    [string]$WorkingDirectory = $root
  )

  Write-Log "START $Label"
  Push-Location $WorkingDirectory
  try {
    cmd.exe /d /c $Command 2>&1 | Tee-Object -FilePath $logPath -Append | Out-Null
    $code = $LASTEXITCODE
    Write-Log "END $Label exit=$code"
    return $code
  } finally {
    Pop-Location
  }
}

$failures = @()
Write-Log "FTC local product-health ops cycle mode=$Mode root=$root"

switch ($Mode) {
  "Health" {
    foreach ($check in @(
      @{ Label = "FTC product health audit"; Command = "npm run health:audit -- --no-fail --max-links 160" },
      @{ Label = "Core production verification"; Command = "powershell -ExecutionPolicy Bypass -File scripts\verify-prod.ps1" },
      @{ Label = "PeacePad production verification"; Command = "powershell -ExecutionPolicy Bypass -File scripts\verify-peacepad-prod.ps1 -TimeoutSec 20" },
      @{ Label = "SayWetin production verification"; Command = "powershell -ExecutionPolicy Bypass -File scripts\verify-saywetin-prod.ps1 -TimeoutSec 20" }
    )) {
      $code = Invoke-LoggedCommand -Label $check.Label -Command $check.Command
      if ($code -ne 0) { $failures += $check.Label }
    }
  }
  "StatusSync" {
    foreach ($check in @(
      @{ Label = "Una Labs status sync"; Command = "npm run status:unalabs:sync -- --no-fail" },
      @{ Label = "Anion status sync"; Command = "npm run status:anion:sync" },
      @{ Label = "SayWetin status sync"; Command = "npm run status:saywetin:sync" }
    )) {
      $code = Invoke-LoggedCommand -Label $check.Label -Command $check.Command
      if ($code -ne 0) { $failures += $check.Label }
    }
  }
  "AnionDeploy" {
    foreach ($check in @(
      @{ Label = "Anion build"; Command = "npm --prefix APPS\anion run build" },
      @{ Label = "Anion worker build"; Command = "npm --prefix APPS\anion run build:worker" },
      @{ Label = "Anion worker deploy"; Command = "npm --prefix APPS\anion run deploy:worker" },
      @{ Label = "Anion production verification"; Command = "npm --prefix APPS\anion run verify:prod -- --base-url https://anion.unalabs.cloud --check-daily-room" }
    )) {
      $code = Invoke-LoggedCommand -Label $check.Label -Command $check.Command
      if ($code -ne 0) { $failures += $check.Label; break }
    }
  }
  "FtcSiteDeploy" {
    foreach ($check in @(
      @{ Label = "FTC site build"; Command = "npm --prefix APPS\ftc-site run build" },
      @{ Label = "FTC site Pages deploy"; Command = "npx wrangler pages deploy APPS\ftc-site\.vercel\output\static --project-name=ftc-site-pages --branch=main" },
      @{ Label = "FTC site smoke"; Command = "npm --prefix APPS\ftc-site run smoke:prod" }
    )) {
      $code = Invoke-LoggedCommand -Label $check.Label -Command $check.Command
      if ($code -ne 0) { $failures += $check.Label; break }
    }
  }
}

$status = if ($failures.Count -eq 0) { "PASS" } else { "FAIL" }
$summary = @(
  "# FTC Local Product-Health Ops",
  "",
  "- Last run: $(Get-Date -Format o)",
  "- Mode: $Mode",
  "- Status: $status",
  "- Log: $logPath",
  "- GitHub hosted runners: bypassed while billing is on hold; product health remains the primary signal",
  "",
  "## Failures",
  "",
  $(if ($failures.Count -eq 0) { "- None" } else { ($failures | ForEach-Object { "- $_" }) -join "`n" })
) -join "`n"

Set-Content -Path $summaryPath -Value $summary -Encoding UTF8
Write-Log "SUMMARY status=$status failures=$($failures -join ', ')"

if ($failures.Count -gt 0) {
  exit 1
}

exit 0
