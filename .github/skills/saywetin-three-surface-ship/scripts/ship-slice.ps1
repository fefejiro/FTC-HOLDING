# ship-slice.ps1 — Steps 4-7 of the SayWetin three-surface ship.
# Assumes: backend already shipped + smoked, native + web client code committed locally.
# Usage (Windows PowerShell 5.1 — pwsh is NOT installed on the dev box):
#   powershell -ExecutionPolicy Bypass -File .github/skills/saywetin-three-surface-ship/scripts/ship-slice.ps1 -SliceName "slice-3-x"

param(
    [Parameter(Mandatory=$true)] [string]$SliceName,
    [string]$ProdHost = "ftcpeacepad-extension-production.up.railway.app",
    [switch]$SkipPlaySubmit,
    [switch]$SkipWebDeploy
)

$ErrorActionPreference = "Stop"
$root = "C:/FTC HOLDING"
$native = "$root/APPS/saywetin-native"
$web = "$root/APPS/saywetin"
$started = Get-Date

function Section($n) { Write-Host "`n=== $n ===" -ForegroundColor Cyan }

Section "Step 4 — Native build (gradle)"
Push-Location "$native/android"
& ./gradlew :app:bundleRelease :app:assembleRelease --rerun-tasks
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Gradle build failed" }
Pop-Location

$aab = "$native/android/app/build/outputs/bundle/release/app-release.aab"
$apk = "$native/android/app/build/outputs/apk/release/app-release.apk"
if (-not (Test-Path $aab)) { throw "AAB not found at $aab" }
$aabSize = [math]::Round((Get-Item $aab).Length / 1MB, 2)
$apkSize = [math]::Round((Get-Item $apk).Length / 1MB, 2)

Section "Step 5 — Verify host baked into Hermes bundle (BLOCKING)"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$tmp = "$env:TEMP/saywetin-aab-scan-$(Get-Random)"
[System.IO.Compression.ZipFile]::ExtractToDirectory($aab, $tmp)
$bundle = "$tmp/base/assets/index.android.bundle"
if (-not (Test-Path $bundle)) { throw "Bundle not in AAB" }
$hits = (Select-String -Path $bundle -Pattern $ProdHost -SimpleMatch -AllMatches | Measure-Object).Count
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
if ($hits -lt 1) {
    throw "GATE FAILED: prod host '$ProdHost' NOT in AAB bundle. Check .env, metro.config.js, --rerun-tasks."
}
Write-Host "  Bundle host hits: $hits (>=1 OK)" -ForegroundColor Green

if (-not $SkipWebDeploy) {
    Section "Step 6 — Deploy web"
    Push-Location $web
    & npm run build:frontend
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Web build failed" }
    $deployOut = (& npx wrangler pages deploy dist/public --project-name saywetin-pages --branch main --commit-dirty=true 2>&1 | Out-String)
    Pop-Location
    Write-Host $deployOut
    $deployUrl = ($deployOut | Select-String -Pattern "https://[a-z0-9]+\.saywetin-pages\.pages\.dev").Matches[0].Value
    $meta = (curl.exe -sS "$deployUrl/_saywetin/build-meta.json" 2>&1 | Out-String)
    Write-Host "  build-meta: $meta"
} else {
    $deployUrl = "(skipped)"
}

if (-not $SkipPlaySubmit) {
    Section "Step 7 — Submit Play production"
    Push-Location $native
    $submitOut = (& eas submit --platform android --profile production --path $aab --non-interactive --no-wait 2>&1 | Out-String)
    Pop-Location
    Write-Host $submitOut
    $submissionId = ($submitOut | Select-String -Pattern "submissions/([a-f0-9-]+)").Matches[0].Groups[1].Value
} else {
    $submissionId = "(skipped)"
}

$elapsed = [math]::Round(((Get-Date) - $started).TotalMinutes, 1)

Section "SHIP REPORT — $SliceName"
@"

SLICE: $SliceName
Backend:  (assumed shipped — smoke separately)
Web:      $deployUrl
Native:   AAB ${aabSize}MB / APK ${apkSize}MB — submission $submissionId
Hermes:   bundle host hits: $hits (>=1 required)
Time:     $elapsed min (target <=60, cap 90)

"@ | Write-Host -ForegroundColor Green

if ($elapsed -gt 90) {
    Write-Host "WARNING: exceeded 90-min hard cap. Write postmortem under /memories/repo/." -ForegroundColor Yellow
}
