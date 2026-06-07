# Scheduled Job Discovery Run
# Scrapes visible signed-in job sites and refreshes premium queues without submitting.
$ErrorActionPreference = "Continue"
$root = "C:\FTC HOLDING\APPS\job-reply-agent"
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd"
$log = Join-Path $logDir "discovery-scheduler-$stamp.log"
$lock = Join-Path $logDir "discovery-scheduler.lock"

if (Test-Path $lock) {
  try {
    $lockInfo = Get-Content $lock -Raw | ConvertFrom-Json
    $lockPid = [int]$lockInfo.pid
    $lockAgeMinutes = ((Get-Date) - [datetime]$lockInfo.startedAt).TotalMinutes
    if ($lockPid -gt 0 -and (Get-Process -Id $lockPid -ErrorAction SilentlyContinue) -and $lockAgeMinutes -lt 60) {
      "=== Skipped $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): discovery scheduler already running as PID $lockPid ===" | Tee-Object -FilePath $log -Append
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

  "=== Discovery scheduler start $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
  "Working dir: $root" | Tee-Object -FilePath $log -Append

  $statusExit = Run-Step "0. Fejiro Chrome status" "npm run browser:fejiro-status"
  $authExit = Run-Step "1. Auth doctor" "npm run auth:doctor"
  if ($statusExit -ne 0) { exit $statusExit }
  if ($authExit -ne 0) { exit $authExit }

  $existingCdp = $false
  try {
    $ready = Invoke-WebRequest -Uri "http://127.0.0.1:9333/json/version" -UseBasicParsing -TimeoutSec 2
    $existingCdp = $ready.StatusCode -eq 200
  } catch {
    $existingCdp = $false
  }

  if ($existingCdp) {
    $env:JOB_AGENT_CDP_URL = "http://127.0.0.1:9333"
    $env:JOB_AGENT_REQUIRE_CDP = "true"
    $env:JOB_AGENT_SCRAPER_TIMEOUT_MS = "30000"

    $diceExit = Run-Step "2. Visible Dice discovery" "npm run hunt:scrape-dice:visible -- -Limit 20"
    $indeedExit = Run-Step "3. Visible Indeed discovery" "npm run hunt:scrape-indeed:visible -- -Limit 20"
    $monsterExit = Run-Step "4. Visible Monster discovery" "npm run hunt:scrape-monster:visible -- -Limit 20"

    if ($diceExit -ne 0) { "Dice discovery exited with $diceExit; continuing to queues." | Tee-Object -FilePath $log -Append }
    if ($indeedExit -ne 0) { "Indeed discovery exited with $indeedExit; continuing to queues." | Tee-Object -FilePath $log -Append }
    if ($monsterExit -ne 0) { "Monster discovery exited with $monsterExit; continuing to queues." | Tee-Object -FilePath $log -Append }
  } else {
    "No Chrome CDP session is available on 127.0.0.1:9333. Discovery scheduler will not launch Chrome or submit applications." | Tee-Object -FilePath $log -Append
    $statusOnlyExit = Run-Step "2. Status snapshot" "npm run hunt:status"
    if ($statusOnlyExit -ne 0) { exit $statusOnlyExit }
  }

  $queueDiceExit = Run-Step "5. Premium Dice queue" "npm run hunt:premium-queue -- --source=dice --limit=20"
  $queueIndeedExit = Run-Step "6. Premium Indeed queue" "npm run hunt:premium-queue -- --source=indeed --limit=20"
  $queueMonsterExit = Run-Step "7. Premium Monster queue" "npm run hunt:premium-queue -- --source=monster --limit=20"
  $trustExit = Run-Step "8. Trust report" "npm run hunt:trust-report -- --limit=20"

  if ($queueDiceExit -ne 0) { exit $queueDiceExit }
  if ($queueIndeedExit -ne 0) { exit $queueIndeedExit }
  if ($queueMonsterExit -ne 0) { exit $queueMonsterExit }
  if ($trustExit -ne 0) { exit $trustExit }

  "=== Success $(Get-Date -Format 'HH:mm:ss'): discovery-only mode completed; no submissions attempted ===" | Tee-Object -FilePath $log -Append
} finally {
  Remove-Item -Path $lock -Force -ErrorAction SilentlyContinue
}
