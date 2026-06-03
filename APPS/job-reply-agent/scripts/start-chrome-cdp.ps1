param(
  [int]$Port = 9333,
  [string]$UserDataDir = "$Env:LocalAppData\Google\Chrome\User Data",
  [string]$ProfileDirectory = "Profile 5",
  [string]$StartUrl = "https://www.dice.com/dashboard"
)

# Launch a human-owned Chrome with --remote-debugging-port so the job-reply-agent
# can attach over CDP via JOB_AGENT_CDP_URL=http://127.0.0.1:<Port>.
#
# Why: launchPersistentContext creates a separate automation profile. CDP lets the
# agent use the real Chrome profile where Dice is already signed in.
#
# Usage:
#   pwsh scripts/start-chrome-cdp.ps1 -ProfileDirectory "Profile 5"
#   # sign in to Dice/Indeed manually in the opened Fejiro window once
#   $env:JOB_AGENT_CDP_URL = "http://127.0.0.1:9333"
#   $env:JOB_AGENT_REQUIRE_CDP = "true"
#   npm run hunt:dice-preflight

$candidates = @(
  "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$Env:ProgramFiles (x86)\Google\Chrome\Application\chrome.exe",
  "$Env:LocalAppData\Google\Chrome\Application\chrome.exe"
)
$chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
  Write-Error "Chrome not found in standard install paths."
  exit 1
}

New-Item -ItemType Directory -Force -Path $UserDataDir | Out-Null
$UserDataDir = (Resolve-Path -LiteralPath $UserDataDir).Path

$defaultChromeUserDataDir = Join-Path $Env:LocalAppData "Google\Chrome\User Data"
$usingDefaultChromeProfile = $UserDataDir -ieq (Resolve-Path -LiteralPath $defaultChromeUserDataDir -ErrorAction SilentlyContinue).Path
if ($usingDefaultChromeProfile) {
  $projectLocalChromePattern = [regex]::Escape("APPS\job-reply-agent\.local\chrome-")
  $runningChrome = Get-CimInstance Win32_Process -Filter "name = 'chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -notmatch $projectLocalChromePattern }
  if ($runningChrome) {
    Write-Error "Chrome is already running. Close all Fejiro/Profile 5 Chrome windows first, then run this again so the real profile starts with --remote-debugging-port=$Port."
    exit 2
  }
}

# Verify port is free; if a Chrome is already debugging here, just print the hint.
try {
  $existing = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/json/version" -UseBasicParsing -TimeoutSec 2
  if ($existing.StatusCode -eq 200) {
    Write-Host "Chrome CDP already listening on port $Port." -ForegroundColor Yellow
    Write-Host "Set: `$env:JOB_AGENT_CDP_URL = `"http://127.0.0.1:$Port`""
    Write-Host "Set: `$env:JOB_AGENT_REQUIRE_CDP = `"true`""
    exit 0
  }
} catch {
  # Port is free; continue to launch.
}

Write-Host "Launching Chrome with --remote-debugging-port=$Port" -ForegroundColor Cyan
Write-Host "User data: $UserDataDir"
Write-Host "Profile: $ProfileDirectory (Fejiro profile is usually Profile 5)"
Write-Host "If Chrome was already running, close all Chrome windows first and run this again so remote debugging attaches to the real profile."
Write-Host "After it opens, sign in to Dice once, then in your other terminal run:"
Write-Host "  `$env:JOB_AGENT_CDP_URL = `"http://127.0.0.1:$Port`""
Write-Host "  `$env:JOB_AGENT_REQUIRE_CDP = `"true`""

function Quote-Arg([string]$Value) {
  if ($Value -match '[\s"]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }
  return $Value
}

$argsList = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$UserDataDir",
  "--profile-directory=$ProfileDirectory",
  "--no-first-run",
  "--no-default-browser-check",
  $StartUrl
) | ForEach-Object { Quote-Arg $_ }

Start-Process -FilePath $chrome -ArgumentList ($argsList -join " ")

[Environment]::SetEnvironmentVariable("JOB_AGENT_CDP_URL", "http://127.0.0.1:$Port", "User")
[Environment]::SetEnvironmentVariable("JOB_AGENT_REQUIRE_CDP", "true", "User")
Write-Host "Persisted user env vars for future terminals." -ForegroundColor Green

$deadline = (Get-Date).AddSeconds(8)
while ((Get-Date) -lt $deadline) {
  try {
    $ready = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/json/version" -UseBasicParsing -TimeoutSec 1
    if ($ready.StatusCode -eq 200) {
      Write-Host "Chrome CDP is ready on http://127.0.0.1:$Port" -ForegroundColor Green
      exit 0
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

Write-Error "Chrome did not open CDP on port $Port. Close all Chrome windows first, then run this command again so the real profile starts with remote debugging."
exit 2
