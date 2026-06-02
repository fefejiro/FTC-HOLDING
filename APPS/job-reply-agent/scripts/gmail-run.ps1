# Scheduled Gmail Job Agent Run
# Scans recruiter email, drafts safe replies, and sends only approved Gmail drafts.
$ErrorActionPreference = "Continue"
$root = "C:\FTC HOLDING\APPS\job-reply-agent"
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd"
$log = Join-Path $logDir "gmail-scheduler-$stamp.log"
$lock = Join-Path $logDir "gmail-scheduler.lock"

if (Test-Path $lock) {
  try {
    $lockInfo = Get-Content $lock -Raw | ConvertFrom-Json
    $lockPid = [int]$lockInfo.pid
    $lockAgeMinutes = ((Get-Date) - [datetime]$lockInfo.startedAt).TotalMinutes
    if ($lockPid -gt 0 -and (Get-Process -Id $lockPid -ErrorAction SilentlyContinue) -and $lockAgeMinutes -lt 30) {
      "=== Skipped $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): Gmail scheduler already running as PID $lockPid ===" | Tee-Object -FilePath $log -Append
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

  "=== Gmail scheduler start $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
  "Working dir: $root" | Tee-Object -FilePath $log -Append

  $statusExit = Run-Step "0. Gmail auth status" "npm run gmail:status"
  if ($statusExit -ne 0) {
    "=== FAILED Gmail auth status with exit code $statusExit at $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
    exit $statusExit
  }

  $processExit = Run-Step "1. Process recruiter Gmail" "npm run process:gmail"
  if ($processExit -ne 0) {
    "=== FAILED process:gmail with exit code $processExit at $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
    exit $processExit
  }

  $sendExit = Run-Step "2. Send approved Gmail drafts" "npm run send:approved:gmail"
  if ($sendExit -ne 0) {
    "=== FAILED send:approved:gmail with exit code $sendExit at $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
    exit $sendExit
  }

  "=== Success $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
} finally {
  Remove-Item -Path $lock -Force -ErrorAction SilentlyContinue
}
