param(
  [switch]$VisibleBrowser
)

# Scheduled Job Discovery Run
# Default mode is quiet/background: refreshes premium queues and prepares trusted
# resume/cover packages without taking over the user's visible browser.
# Use -VisibleBrowser, or JOB_AGENT_VISIBLE_DISCOVERY=1, for explicit browser scraping.
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
  $pausedSourcesRaw = if ($env:JOB_AGENT_PAUSED_SOURCES) { $env:JOB_AGENT_PAUSED_SOURCES } else { "dice,indeed,monster" }
  $pausedSources = @($pausedSourcesRaw -split "," | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
  function Test-SourcePaused($source) {
    return $pausedSources -contains $source.ToLowerInvariant()
  }
  "Paused sources: $($pausedSources -join ', ')" | Tee-Object -FilePath $log -Append
  $allowVisibleBrowser = $VisibleBrowser -or $env:JOB_AGENT_VISIBLE_DISCOVERY -in @("1", "true", "TRUE", "yes", "YES", "on", "ON")
  if ($allowVisibleBrowser) {
    "Visible browser discovery is ENABLED for this run. LinkedIn discovery may use browser automation; Dice/Indeed/Monster remain paused unless explicitly unpaused." | Tee-Object -FilePath $log -Append
  } else {
    "Visible browser discovery is disabled for scheduled/background mode. Chrome focus will not be changed." | Tee-Object -FilePath $log -Append
  }

  Remove-Item Env:\JOB_AGENT_CDP_URL -ErrorAction SilentlyContinue
  Remove-Item Env:\JOB_AGENT_REQUIRE_CDP -ErrorAction SilentlyContinue

  $visibleFejiroReady = $false
  if ($allowVisibleBrowser) {
    $statusExit = Run-Step "0. Fejiro Chrome status" "npm run browser:fejiro-status"
    $visibleFejiroReady = ($statusExit -eq 0)
    if ($visibleFejiroReady) {
      "Auth doctor intentionally skipped for scheduled discovery. The visible Fejiro profile is present; avoiding auth:doctor prevents Playwright from launching or using a separate Chrome profile when CDP is unavailable." | Tee-Object -FilePath $log -Append
    } else {
      "Auth doctor skipped because the visible Fejiro Chrome profile was not found. This avoids launching or using another Chrome profile." | Tee-Object -FilePath $log -Append
      "Visible Fejiro browser/auth is not ready. Browser scraping will be skipped; package prep, queues, and trust reports will still run from saved data. No submissions will be attempted." | Tee-Object -FilePath $log -Append
    }
  } else {
    "Fejiro Chrome status check skipped in background mode to avoid touching the active browser." | Tee-Object -FilePath $log -Append
  }

  $existingCdp = $false
  if ($allowVisibleBrowser) {
    try {
      $ready = Invoke-WebRequest -Uri "http://127.0.0.1:9333/json/version" -UseBasicParsing -TimeoutSec 2
      $existingCdp = $ready.StatusCode -eq 200
    } catch {
      $existingCdp = $false
    }
  }

  if ($existingCdp) {
    $env:JOB_AGENT_CDP_URL = "http://127.0.0.1:9333"
    $env:JOB_AGENT_REQUIRE_CDP = "true"
    $env:JOB_AGENT_SCRAPER_TIMEOUT_MS = "30000"
  } elseif ($allowVisibleBrowser -and $visibleFejiroReady) {
    "No Chrome CDP session is available on 127.0.0.1:9333. Continuing with visible Fejiro Chrome discovery only; no submissions will be attempted." | Tee-Object -FilePath $log -Append
  }

  if ($allowVisibleBrowser -and $visibleFejiroReady) {
    $linkedinDiscoveryExit = Run-Step "2. LinkedIn discovery" "npm run hunt:scrape-linkedin"
    $diceExit = 0
    if (Test-SourcePaused "indeed") {
      "=== 3. Visible Indeed discovery skipped: source paused ===" | Tee-Object -FilePath $log -Append
      $indeedExit = 0
    } else {
      $indeedExit = Run-Step "3. Visible Indeed discovery" "npm run hunt:scrape-indeed:visible -- -Limit 20"
    }
    if (Test-SourcePaused "monster") {
      "=== 4. Visible Monster discovery skipped: source paused ===" | Tee-Object -FilePath $log -Append
      $monsterExit = 0
    } else {
      $monsterExit = Run-Step "4. Visible Monster discovery" "npm run hunt:scrape-monster:visible -- -Limit 20"
    }

    if ($linkedinDiscoveryExit -ne 0) { "LinkedIn discovery exited with $linkedinDiscoveryExit; continuing to saved LinkedIn queues." | Tee-Object -FilePath $log -Append }
    if ($indeedExit -ne 0) { "Indeed discovery exited with $indeedExit; continuing to queues." | Tee-Object -FilePath $log -Append }
    if ($monsterExit -ne 0) { "Monster discovery exited with $monsterExit; continuing to queues." | Tee-Object -FilePath $log -Append }
  } elseif ($allowVisibleBrowser) {
    "=== 2-4. Visible site discovery skipped: Fejiro Chrome is not visible/auth-ready ===" | Tee-Object -FilePath $log -Append
  } else {
    "=== 2-4. Visible site discovery skipped: quiet background mode ===" | Tee-Object -FilePath $log -Append
  }

  $queueLinkedInExit = Run-Step "5. Premium LinkedIn queue" "npm run hunt:premium-queue -- --source=linkedin --limit=20"
  if (Test-SourcePaused "indeed") {
    "=== 6. Premium Indeed queue skipped: source paused ===" | Tee-Object -FilePath $log -Append
    $queueIndeedExit = 0
  } else {
    $queueIndeedExit = Run-Step "6. Premium Indeed queue" "npm run hunt:premium-queue -- --source=indeed --limit=20"
  }
  if (Test-SourcePaused "monster") {
    "=== 7. Premium Monster queue skipped: source paused ===" | Tee-Object -FilePath $log -Append
    $queueMonsterExit = 0
  } else {
    $queueMonsterExit = Run-Step "7. Premium Monster queue" "npm run hunt:premium-queue -- --source=monster --limit=20"
  }
  $prepLinkedInExit = Run-Step "8. Prepare LinkedIn packages" "npm run hunt:prepare-artifacts -- --source=linkedin --limit=4"
  if (Test-SourcePaused "indeed") {
    "=== 9. Prepare Indeed packages skipped: source paused ===" | Tee-Object -FilePath $log -Append
    $prepIndeedExit = 0
  } else {
    $prepIndeedExit = Run-Step "9. Prepare Indeed packages" "npm run hunt:prepare-artifacts -- --source=indeed --limit=4"
  }
  if (Test-SourcePaused "monster") {
    "=== 10. Prepare Monster packages skipped: source paused ===" | Tee-Object -FilePath $log -Append
    $prepMonsterExit = 0
  } else {
    $prepMonsterExit = Run-Step "10. Prepare Monster packages" "npm run hunt:prepare-artifacts -- --source=monster --limit=4"
  }
  $trustExit = Run-Step "11. Trust report" "npm run hunt:trust-report -- --limit=25"
  $statusSnapshotExit = Run-Step "12. Status snapshot" "npm run hunt:status"

  if ($queueLinkedInExit -ne 0) { exit $queueLinkedInExit }
  if ($queueIndeedExit -ne 0) { exit $queueIndeedExit }
  if ($queueMonsterExit -ne 0) { exit $queueMonsterExit }
  if ($prepLinkedInExit -ne 0) { "LinkedIn package prep exited with $prepLinkedInExit; continuing to trust report." | Tee-Object -FilePath $log -Append }
  if ($prepIndeedExit -ne 0) { "Indeed package prep exited with $prepIndeedExit; continuing to trust report." | Tee-Object -FilePath $log -Append }
  if ($prepMonsterExit -ne 0) { "Monster package prep exited with $prepMonsterExit; continuing to trust report." | Tee-Object -FilePath $log -Append }
  if ($trustExit -ne 0) { exit $trustExit }
  if ($statusSnapshotExit -ne 0) { exit $statusSnapshotExit }

  "=== Success $(Get-Date -Format 'HH:mm:ss'): discovery/package-prep mode completed; no submissions attempted ===" | Tee-Object -FilePath $log -Append
} finally {
  Remove-Item -Path $lock -Force -ErrorAction SilentlyContinue
}
