# Scheduled Job Discovery Run
# Scrapes visible signed-in job sites, refreshes premium queues, and prepares
# trusted resume/cover packages without submitting.
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

  Remove-Item Env:\JOB_AGENT_CDP_URL -ErrorAction SilentlyContinue
  Remove-Item Env:\JOB_AGENT_REQUIRE_CDP -ErrorAction SilentlyContinue

  $statusExit = Run-Step "0. Fejiro Chrome status" "npm run browser:fejiro-status"
  $visibleFejiroReady = ($statusExit -eq 0)
  if ($visibleFejiroReady) {
    "Auth doctor intentionally skipped for scheduled discovery. The visible Fejiro profile is present; avoiding auth:doctor prevents Playwright from launching or using a separate Chrome profile when CDP is unavailable." | Tee-Object -FilePath $log -Append
  } else {
    "Auth doctor skipped because the visible Fejiro Chrome profile was not found. This avoids launching or using another Chrome profile." | Tee-Object -FilePath $log -Append
  }
  if (-not $visibleFejiroReady) {
    "Visible Fejiro browser/auth is not ready. Browser scraping will be skipped; package prep, queues, and trust reports will still run from saved data. No submissions will be attempted." | Tee-Object -FilePath $log -Append
  }

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
  } elseif ($visibleFejiroReady) {
    "No Chrome CDP session is available on 127.0.0.1:9333. Continuing with visible Fejiro Chrome discovery only; no submissions will be attempted." | Tee-Object -FilePath $log -Append
  }

  if ($visibleFejiroReady) {
    $diceExit = Run-Step "2. Visible Dice discovery" "npm run hunt:scrape-dice:visible -- -Limit 20"
    $indeedExit = Run-Step "3. Visible Indeed discovery" "npm run hunt:scrape-indeed:visible -- -Limit 20"
    $monsterExit = Run-Step "4. Visible Monster discovery" "npm run hunt:scrape-monster:visible -- -Limit 20"

    if ($diceExit -ne 0) { "Dice discovery exited with $diceExit; continuing to queues." | Tee-Object -FilePath $log -Append }
    if ($indeedExit -ne 0) { "Indeed discovery exited with $indeedExit; continuing to queues." | Tee-Object -FilePath $log -Append }
    if ($monsterExit -ne 0) { "Monster discovery exited with $monsterExit; continuing to queues." | Tee-Object -FilePath $log -Append }
  } else {
    "=== 2-4. Visible site discovery skipped: Fejiro Chrome is not visible/auth-ready ===" | Tee-Object -FilePath $log -Append
  }

  $queueDiceExit = Run-Step "5. Premium Dice queue" "npm run hunt:premium-queue -- --source=dice --limit=20"
  $queueIndeedExit = Run-Step "6. Premium Indeed queue" "npm run hunt:premium-queue -- --source=indeed --limit=20"
  $queueMonsterExit = Run-Step "7. Premium Monster queue" "npm run hunt:premium-queue -- --source=monster --limit=20"
  $prepDiceExit = Run-Step "8. Prepare Dice packages" "npm run hunt:prepare-artifacts -- --source=dice --limit=4"
  $prepIndeedExit = Run-Step "9. Prepare Indeed packages" "npm run hunt:prepare-artifacts -- --source=indeed --limit=4"
  $prepMonsterExit = Run-Step "10. Prepare Monster packages" "npm run hunt:prepare-artifacts -- --source=monster --limit=4"
  $trustExit = Run-Step "11. Trust report" "npm run hunt:trust-report -- --limit=25"
  $statusSnapshotExit = Run-Step "12. Status snapshot" "npm run hunt:status"

  if ($queueDiceExit -ne 0) { exit $queueDiceExit }
  if ($queueIndeedExit -ne 0) { exit $queueIndeedExit }
  if ($queueMonsterExit -ne 0) { exit $queueMonsterExit }
  if ($prepDiceExit -ne 0) { "Dice package prep exited with $prepDiceExit; continuing to trust report." | Tee-Object -FilePath $log -Append }
  if ($prepIndeedExit -ne 0) { "Indeed package prep exited with $prepIndeedExit; continuing to trust report." | Tee-Object -FilePath $log -Append }
  if ($prepMonsterExit -ne 0) { "Monster package prep exited with $prepMonsterExit; continuing to trust report." | Tee-Object -FilePath $log -Append }
  if ($trustExit -ne 0) { exit $trustExit }
  if ($statusSnapshotExit -ne 0) { exit $statusSnapshotExit }

  "=== Success $(Get-Date -Format 'HH:mm:ss'): discovery/package-prep mode completed; no submissions attempted ===" | Tee-Object -FilePath $log -Append
} finally {
  Remove-Item -Path $lock -Force -ErrorAction SilentlyContinue
}
