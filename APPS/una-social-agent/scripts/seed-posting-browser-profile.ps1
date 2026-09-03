param(
  [string]$ChromeUserDataDir = "$env:LOCALAPPDATA\Google\Chrome\User Data",
  [string]$ChromeProfileDirectory = 'Profile 5',
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$sourceProfile = Join-Path $ChromeUserDataDir $ChromeProfileDirectory
$sourceLocalState = Join-Path $ChromeUserDataDir 'Local State'
$targetUserDataDir = if ($env:UNA_SOCIAL_BROWSER_PROFILE_DIR) {
  $env:UNA_SOCIAL_BROWSER_PROFILE_DIR
} else {
  Join-Path $ProjectDir '.browser-profile'
}
$targetDefault = Join-Path $targetUserDataDir 'Default'

if (-not (Test-Path -LiteralPath $sourceProfile)) {
  throw "Source Chrome profile was not found: $sourceProfile"
}

$projectResolved = (Resolve-Path -LiteralPath $ProjectDir).Path
New-Item -ItemType Directory -Force -Path $targetUserDataDir | Out-Null
$targetResolved = (Resolve-Path -LiteralPath $targetUserDataDir).Path
if (-not $targetResolved.StartsWith($projectResolved, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to seed outside the project directory: $targetResolved"
}

if ((Test-Path -LiteralPath $targetDefault) -and -not $Force) {
  $existing = Get-ChildItem -LiteralPath $targetDefault -Force -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($existing) {
    throw "Target profile already has data: $targetDefault. Re-run with -Force to refresh it."
  }
}

if ((Test-Path -LiteralPath $targetDefault) -and $Force) {
  $archive = Join-Path $targetUserDataDir ("Default.backup-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
  Move-Item -LiteralPath $targetDefault -Destination $archive
  Write-Host "Archived existing posting profile: $archive"
}

New-Item -ItemType Directory -Force -Path $targetDefault | Out-Null

$excludedDirs = @(
  'Cache',
  'Code Cache',
  'GPUCache',
  'GrShaderCache',
  'ShaderCache',
  'DawnGraphiteCache',
  'DawnWebGPUCache',
  'Service Worker\CacheStorage',
  'optimization_guide_model_store'
)
$excludedFiles = @(
  'SingletonCookie',
  'SingletonLock',
  'SingletonSocket',
  'LOCK',
  '*.tmp'
)

$robocopyArgs = @(
  $sourceProfile,
  $targetDefault,
  '/E',
  '/R:1',
  '/W:1',
  '/NFL',
  '/NDL',
  '/NP',
  '/NJH',
  '/NJS'
)

if ($excludedDirs.Count) {
  $robocopyArgs += '/XD'
  $robocopyArgs += $excludedDirs
}

if ($excludedFiles.Count) {
  $robocopyArgs += '/XF'
  $robocopyArgs += $excludedFiles
}

& robocopy @robocopyArgs | Out-Null
$copyExit = $LASTEXITCODE
if ($copyExit -gt 7) {
  Write-Warning "Robocopy reported locked or skipped files with exit code $copyExit. Continuing because active Chrome profiles often lock non-critical files."
}

if (Test-Path -LiteralPath $sourceLocalState) {
  Copy-Item -LiteralPath $sourceLocalState -Destination (Join-Path $targetUserDataDir 'Local State') -Force
}

Write-Host "Seeded Una posting browser profile."
Write-Host "Source: $sourceProfile"
Write-Host "Target: $targetDefault"
Write-Host "Next: npm run publish:browser:dry-run"
