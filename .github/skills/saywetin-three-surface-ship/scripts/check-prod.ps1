# check-prod.ps1 — Live status pulse for SayWetin three surfaces.
# Read-only. Safe to run anytime.
# Usage: powershell -ExecutionPolicy Bypass -File .github/skills/saywetin-three-surface-ship/scripts/check-prod.ps1

$ErrorActionPreference = "Continue"

function Hit($name, $url, $expect = 200) {
    $code = (curl.exe -sS -o NUL -w "%{http_code}" --max-time 10 $url 2>$null)
    if ($code -eq "$expect") { Write-Host ("  OK   {0,-30} -> {1}" -f $name, $code) -ForegroundColor Green; return $true }
    else { Write-Host ("  FAIL {0,-30} -> {1} (expected {2})" -f $name, $code, $expect) -ForegroundColor Red; return $false }
}

$start = Get-Date
$ok = $true

Write-Host "`n[Backend - Railway]" -ForegroundColor Cyan
$ok = (Hit "saywetin api /health" "https://ftcpeacepad-extension-production.up.railway.app/health") -and $ok

Write-Host "`n[Web - Cloudflare Pages]" -ForegroundColor Cyan
$ok = (Hit "saywetin-pages root" "https://saywetin-pages.pages.dev/") -and $ok
try {
    $meta = Invoke-RestMethod -Uri "https://saywetin-pages.pages.dev/_saywetin/build-meta.json" -TimeoutSec 10
    Write-Host ("       buildId:    {0}" -f $meta.webBuildId) -ForegroundColor Gray
    Write-Host ("       deployedAt: {0}" -f $meta.deployedAt) -ForegroundColor Gray
    Write-Host ("       version:    {0}" -f $meta.version) -ForegroundColor Gray
} catch {
    Write-Host "       (build-meta.json not reachable)" -ForegroundColor Yellow
}

Write-Host "`n[Native - EAS auth state]" -ForegroundColor Cyan
$easState = "$env:USERPROFILE/.expo/state.json"
if (Test-Path $easState) {
    $u = (Get-Content $easState -Raw | ConvertFrom-Json).auth.username
    Write-Host "  OK   eas user: $u" -ForegroundColor Green
} else {
    Write-Host "  FAIL ~/.expo/state.json missing" -ForegroundColor Red
    $ok = $false
}

$elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
Write-Host ""
if ($ok) { Write-Host "PROD GREEN ($elapsed s)" -ForegroundColor Green; exit 0 }
else     { Write-Host "PROD HAS ISSUES ($elapsed s)" -ForegroundColor Red; exit 1 }
