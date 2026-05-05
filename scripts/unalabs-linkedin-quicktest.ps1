param(
  [switch]$NoTelegram
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }

function Resolve-RepoRoot {
  param([string]$StartPath)
  $candidate = (Resolve-Path $StartPath).Path
  while ($candidate -and -not (Test-Path (Join-Path $candidate "DOCS\\linkedin"))) {
    $parent = Split-Path -Parent $candidate
    if ($parent -eq $candidate) { $candidate = $null; break }
    $candidate = $parent
  }
  if (-not $candidate) { throw "Repo root not found (expected DOCS\\linkedin)." }
  return $candidate
}

if (-not $NoTelegram) {
  if (-not $env:TELEGRAM_BOT_TOKEN -or -not $env:TELEGRAM_CHAT_ID) {
    Write-Warn "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Run setup first."
    exit 1
  }
}

$RepoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot
$digestScript = Join-Path $RepoRoot "scripts\\unalabs-linkedin-digest.ps1"
$approvalsScript = Join-Path $RepoRoot "scripts\\unalabs-linkedin-approvals.ps1"

Write-Info "Running dry-run digest..."
& $digestScript -DryRun -NoTelegram:$NoTelegram -MaxSources 3 -TimeoutSec 6

Write-Info "Running approvals check..."
& $approvalsScript

Write-Info "Quick test complete."
