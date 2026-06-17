param(
  [switch]$BrowserCycle
)

# Scheduled Job Agent Run
# Default mode is quiet/background: status, premium queues, and trust reports only.
# Use -BrowserCycle, or JOB_AGENT_BROWSER_CYCLE=1, for explicit laptop browser proof runs.
$ErrorActionPreference = "Continue"
$root = "C:\FTC HOLDING\APPS\job-reply-agent"
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd"
$log = Join-Path $logDir "scheduler-$stamp.log"
$lock = Join-Path $logDir "scheduler.lock"

if (Test-Path $lock) {
  try {
    $lockInfo = Get-Content $lock -Raw | ConvertFrom-Json
    $lockPid = [int]$lockInfo.pid
    $lockAgeMinutes = ((Get-Date) - [datetime]$lockInfo.startedAt).TotalMinutes
    if ($lockPid -gt 0 -and (Get-Process -Id $lockPid -ErrorAction SilentlyContinue) -and $lockAgeMinutes -lt 45) {
      "=== Skipped $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): scheduler already running as PID $lockPid ===" | Tee-Object -FilePath $log -Append
      exit 0
    }
  } catch {
    # Broken/stale lock; replace it below.
  }
}

@{ pid = $PID; startedAt = (Get-Date).ToString("o") } | ConvertTo-Json | Set-Content -Path $lock -Encoding UTF8

try {

function Run-Step($label, $cmd) {
  $header = "=== $label ($(Get-Date -Format 'HH:mm:ss')) ==="
  $header | Tee-Object -FilePath $log -Append | Out-Host
  Push-Location $root
  try {
    $output = & cmd /c "$cmd 2>&1"
    $exitCode = $LASTEXITCODE
    if ($null -ne $output) {
      $output | Tee-Object -FilePath $log -Append | Out-Host
    }
    return $exitCode
  } finally {
    Pop-Location
  }
}

"=== Scheduler start $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
"Working dir: $root" | Tee-Object -FilePath $log -Append
$allowBrowserCycle = $BrowserCycle -or $env:JOB_AGENT_BROWSER_CYCLE -in @("1", "true", "TRUE", "yes", "YES", "on", "ON")

if (-not $allowBrowserCycle) {
  "Browser cycle is disabled for scheduled/background mode. Chrome/CDP will not be checked or controlled." | Tee-Object -FilePath $log -Append
  $statusExit = Run-Step "1. Status snapshot" "npm run hunt:status"
  $queueExit = Run-Step "2. Premium Dice queue snapshot" "npm run hunt:premium-queue -- --source=dice --limit=10"
  $indeedQueueExit = Run-Step "3. Premium Indeed queue snapshot" "npm run hunt:premium-queue -- --source=indeed --limit=10"
  $monsterQueueExit = Run-Step "4. Premium Monster queue snapshot" "npm run hunt:premium-queue -- --source=monster --limit=10"
  $trustExit = Run-Step "5. Trust report snapshot" "npm run hunt:trust-report -- --limit=15"
  if ($statusExit -ne 0) { exit $statusExit }
  if ($queueExit -ne 0) { exit $queueExit }
  if ($indeedQueueExit -ne 0) { exit $indeedQueueExit }
  if ($monsterQueueExit -ne 0) { exit $monsterQueueExit }
  if ($trustExit -ne 0) { exit $trustExit }
  "=== Success $(Get-Date -Format 'HH:mm:ss'): quiet status/queue-only mode ===" | Tee-Object -FilePath $log -Append
  exit 0
}

$existingCdp = $false
try {
  $ready = Invoke-WebRequest -Uri "http://127.0.0.1:9333/json/version" -UseBasicParsing -TimeoutSec 2
  $existingCdp = $ready.StatusCode -eq 200
} catch {
  $existingCdp = $false
}

if (-not $existingCdp) {
  "No Chrome CDP session is already available on 127.0.0.1:9333. Not launching a new Chrome/profile; keeping Fejiro's existing Chrome window untouched." | Tee-Object -FilePath $log -Append
  $statusExit = Run-Step "1. Status snapshot" "npm run hunt:status"
  $queueExit = Run-Step "2. Premium Dice queue snapshot" "npm run hunt:premium-queue -- --source=dice --limit=10"
  $indeedQueueExit = Run-Step "3. Premium Indeed queue snapshot" "npm run hunt:premium-queue -- --source=indeed --limit=10"
  $monsterQueueExit = Run-Step "4. Premium Monster queue snapshot" "npm run hunt:premium-queue -- --source=monster --limit=10"
  $trustExit = Run-Step "5. Trust report snapshot" "npm run hunt:trust-report -- --limit=15"
  if ($statusExit -ne 0) { exit $statusExit }
  if ($queueExit -ne 0) { exit $queueExit }
  if ($indeedQueueExit -ne 0) { exit $indeedQueueExit }
  if ($monsterQueueExit -ne 0) { exit $monsterQueueExit }
  if ($trustExit -ne 0) { exit $trustExit }
  "=== Success $(Get-Date -Format 'HH:mm:ss'): no-launch status/queue-only mode ===" | Tee-Object -FilePath $log -Append
  exit 0
}

$env:JOB_AGENT_CDP_URL = "http://127.0.0.1:9333"
$env:JOB_AGENT_REQUIRE_CDP = "true"
$env:JOB_AGENT_SCRAPER_TIMEOUT_MS = "20000"

$exitCode = Run-Step "1. Laptop Dice/proof cycle" "npm run run:laptop-cycle"

if ($exitCode -ne 0) {
  "=== FAILED with exit code $exitCode at $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
  exit $exitCode
}

"=== Success $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
} finally {
  Remove-Item -Path $lock -Force -ErrorAction SilentlyContinue
}
