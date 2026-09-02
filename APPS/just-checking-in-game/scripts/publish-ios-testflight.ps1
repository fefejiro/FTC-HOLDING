[CmdletBinding()]
param(
    [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$UnityProject = Join-Path $Root 'unity'
$ExpectedVersion = '1.2.0'
$ExpectedBuild = '5'
$ExpectedBundle = 'com.ftcholding.justcheckingin'

function Stop-Jci([string]$Message) { throw "[JCI][FAIL] $Message" }

if (-not (Test-Path -LiteralPath $UnityProject)) { Stop-Jci "Unity project missing: $UnityProject" }
$settings = Get-Content -Raw (Join-Path $UnityProject 'ProjectSettings/ProjectSettings.asset')
if ($settings -notmatch "bundleVersion: $ExpectedVersion") { Stop-Jci "ProjectSettings is not version $ExpectedVersion" }
if ($settings -notmatch "iPhone: $ExpectedBuild") { Stop-Jci "ProjectSettings is not iOS build $ExpectedBuild" }
if ($settings -notmatch "iPhone: $ExpectedBundle") { Stop-Jci "Bundle ID mismatch" }

if (-not $IsMacOS) {
    Write-Host '[JCI] Windows preflight passed for source/version metadata.'
    Write-Host '[JCI] The archive/upload stages require the real macOS Unity/Xcode session.'
    if (-not $PreflightOnly) { Stop-Jci 'Run publish-ios-testflight.sh on macOS; this PowerShell host is not macOS.' }
    exit 0
}

$sh = Join-Path $PSScriptRoot 'publish-ios-testflight.sh'
if (-not (Test-Path -LiteralPath $sh)) { Stop-Jci "Missing Mac wrapper: $sh" }
& bash $sh
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
