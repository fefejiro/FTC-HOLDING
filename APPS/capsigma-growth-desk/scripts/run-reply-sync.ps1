param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$logDir = Join-Path $ProjectDir '.local\reply-sync-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$reportDir = Join-Path $ProjectDir '.local\reply-sync-reports'
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

$stamp = Get-Date -Format 'yyyy-MM-ddTHH-mm-ss'
$logPath = Join-Path $logDir "reply-sync-$stamp.log"

Push-Location $ProjectDir
try {
  "[$(Get-Date -Format o)] Starting CapSigma reply sync" | Out-File -FilePath $logPath -Encoding utf8
  $env:CAPSIGMA_SYNC_REPORT_DIR = $reportDir
  $output = npm run prod:sync-replies 2>&1 | Out-String
  $output | Out-File -FilePath $logPath -Append -Encoding utf8
  "[$(Get-Date -Format o)] Reply sync complete" | Out-File -FilePath $logPath -Append -Encoding utf8
} catch {
  "[$(Get-Date -Format o)] Reply sync failed: $($_.Exception.Message)" | Out-File -FilePath $logPath -Append -Encoding utf8
  throw
} finally {
  Remove-Item Env:\CAPSIGMA_SYNC_REPORT_DIR -ErrorAction SilentlyContinue
  Pop-Location
}
