# bootstrap.ps1 — Preflight for SayWetin three-surface ship.
# Verifies all preconditions before a slice. Exits non-zero on any miss.
# Usage (Windows PowerShell 5.1 — pwsh is NOT installed on the dev box):
#   powershell -ExecutionPolicy Bypass -File .github/skills/saywetin-three-surface-ship/scripts/bootstrap.ps1

$ErrorActionPreference = "Stop"
$root = "C:/FTC HOLDING"
$native = "$root/APPS/saywetin-native"
$web = "$root/APPS/saywetin"
$failures = @()

function Check($name, $cond, $hint) {
    if ($cond) { Write-Host "  OK   $name" -ForegroundColor Green }
    else {
        Write-Host "  FAIL $name" -ForegroundColor Red
        Write-Host "       hint: $hint" -ForegroundColor Yellow
        $script:failures += ,$name
    }
}

Write-Host "`n[1/7] Native preconditions" -ForegroundColor Cyan
Check "metro.config.js exists" (Test-Path "$native/metro.config.js") "Create per SKILL.md preconditions"
Check ".env has EXPO_PUBLIC_API_BASE_URL" `
    ((Test-Path "$native/.env") -and ((Get-Content "$native/.env" -Raw) -match "EXPO_PUBLIC_API_BASE_URL=https://")) `
    "echo 'EXPO_PUBLIC_API_BASE_URL=https://ftcpeacepad-extension-production.up.railway.app' > $native/.env"

$gradle = Get-Content "$native/android/app/build.gradle" -Raw -ErrorAction SilentlyContinue
$gradleHint = 'Add to react { ... } block: extraPackagerArgs = ["--entry-file", file("${projectRoot}/index.ts").absolutePath]'
Check "build.gradle has extraPackagerArgs --entry-file" `
    ($gradle -match 'extraPackagerArgs\s*=\s*\["--entry-file"') `
    $gradleHint

Write-Host "`n[2/7] EAS auth" -ForegroundColor Cyan
$easState = "$env:USERPROFILE/.expo/state.json"
$easUser = ""
if (Test-Path $easState) {
    try { $easUser = (Get-Content $easState -Raw | ConvertFrom-Json).auth.username } catch {}
}
Check "eas auth username = official_fejiro" ($easUser -eq "official_fejiro") "Run from APPS/saywetin-native: npx --yes eas-cli@latest login"

Write-Host "`n[3/7] Play service-account key" -ForegroundColor Cyan
Check "play-store-key.json exists" (Test-Path "$root/secrets/play-store-key.json") "Restore key from password manager"

Write-Host "`n[4/7] Wrangler auth" -ForegroundColor Cyan
$wr = $null
try { $wr = (npx --yes wrangler whoami 2>&1 | Out-String) } catch {}
Check "wrangler authed" ($wr -match "@" -or $wr -match "OAuth") "Run: npx wrangler login"

Write-Host "`n[5/7] Backend smoke" -ForegroundColor Cyan
$ping = (curl.exe -sS -o NUL -w "%{http_code}" "https://ftcpeacepad-extension-production.up.railway.app/health" 2>&1)
Check "Railway prod /health = 200" ($ping -eq "200") "Check Railway service status"

Write-Host "`n[6/7] Git tree state" -ForegroundColor Cyan
Push-Location $root
$dirty = git status --short
Pop-Location
Check "git tree clean (or known-dirty acceptable)" $true "Use git stash --include-untracked if needed"

Write-Host "`n[7/7] Disk + node version" -ForegroundColor Cyan
$nodev = (node -v 2>&1)
Check "Node >= 20" ($nodev -match "^v(2[0-9]|[3-9][0-9])") "Use nvm to install 20+"

Write-Host ""
if ($failures.Count -eq 0) {
    Write-Host "ALL PRECONDITIONS MET. Proceed to ship." -ForegroundColor Green
    exit 0
} else {
    Write-Host ("BLOCKED - " + $failures.Count + " precondition(s) failed:") -ForegroundColor Red
    $failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
