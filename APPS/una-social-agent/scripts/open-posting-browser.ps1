param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$StartUrl = 'https://www.instagram.com/',
  [int]$RemoteDebuggingPort = 0,
  [switch]$UseChromeProfile,
  [string]$ChromeUserDataDir = "$env:LOCALAPPDATA\Google\Chrome\User Data",
  [string]$ChromeProfileDirectory = 'Profile 5'
)

$ErrorActionPreference = 'Stop'

$profileDir = if ($UseChromeProfile) {
  $ChromeUserDataDir
} elseif ($env:UNA_SOCIAL_BROWSER_PROFILE_DIR) {
  $env:UNA_SOCIAL_BROWSER_PROFILE_DIR
} else {
  Join-Path $ProjectDir '.browser-profile'
}

New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

if ($UseChromeProfile) {
  $profilePath = Join-Path $ChromeUserDataDir $ChromeProfileDirectory
  if (-not (Test-Path -LiteralPath $profilePath)) {
    throw "Chrome profile directory was not found: $profilePath"
  }
}

$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $chrome) {
  throw 'Google Chrome was not found.'
}

$profileDirectory = if ($UseChromeProfile) { $ChromeProfileDirectory } else { 'Default' }

$arguments = @(
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-search-engine-choice-screen',
  "--user-data-dir=`"$profileDir`"",
  "--profile-directory=`"$profileDirectory`"",
  $StartUrl
)

if ($RemoteDebuggingPort -gt 0) {
  $arguments = @("--remote-debugging-port=$RemoteDebuggingPort") + $arguments
}

Start-Process -FilePath $chrome -ArgumentList $arguments -WindowStyle Normal

Write-Host "Opened Una posting browser profile: $profileDir"
if ($UseChromeProfile) {
  Write-Host "Chrome profile directory: $profileDirectory"
}
if ($RemoteDebuggingPort -gt 0) {
  Write-Host "CDP URL: http://127.0.0.1:$RemoteDebuggingPort"
}
