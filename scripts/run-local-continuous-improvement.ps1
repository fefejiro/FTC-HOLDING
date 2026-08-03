param(
  [string]$RepoRoot = 'C:\FTC HOLDING',
  [int]$IssueLimit = 3,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$repo = [System.IO.Path]::GetFullPath($RepoRoot)
if (!(Test-Path -LiteralPath (Join-Path $repo '.git'))) {
  throw "Not a Git repository: $repo"
}

$logDir = Join-Path $env:LOCALAPPDATA 'FTC\logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logPath = Join-Path $logDir 'portfolio-continuous-improvement.log'
$scanner = Join-Path $PSScriptRoot 'seed-continuous-improvement.mjs'

Push-Location $repo
try {
  $stamp = Get-Date -Format o
  "[$stamp] Starting local portfolio audit." | Add-Content -LiteralPath $logPath
  $unpushed = git rev-list --count --all --not --remotes
  "[$stamp] Local commits absent from remotes: $unpushed" | Add-Content -LiteralPath $logPath
  if (!$DryRun) { $env:CREATE_ISSUES = '1' }
  $env:CI_SEED_LIMIT = [string]$IssueLimit
  node $scanner 2>&1 | Tee-Object -FilePath $logPath -Append
  if ($LASTEXITCODE -ne 0) { throw "Portfolio scanner exited $LASTEXITCODE" }
} finally {
  Remove-Item Env:CREATE_ISSUES -ErrorAction SilentlyContinue
  Remove-Item Env:CI_SEED_LIMIT -ErrorAction SilentlyContinue
  Pop-Location
}
