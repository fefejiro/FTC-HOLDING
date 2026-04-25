param(
    [switch]$Apply
)

$ErrorActionPreference = "Stop"
$root = "C:\FTC HOLDING"

$targets = @(
    @{ Path = "$root\APPS\dispatch\test-results"; Label = "Dispatch Playwright test-results" },
    @{ Path = "$root\APPS\dispatch\playwright-report"; Label = "Dispatch Playwright report" },
    @{ Path = "$root\APPS\dispatch\dist"; Label = "Dispatch dist" },
    @{ Path = "$root\APPS\saywetin\dist"; Label = "SayWetin dist" },
    @{ Path = "$root\APPS\ftc-site\.next"; Label = "FTC site .next" },
    @{ Path = "$root\APPS\saywetin-native\android\app\build"; Label = "SayWetin native app build" },
    @{ Path = "$root\APPS\saywetin-native\android\build"; Label = "SayWetin native android build" },
    @{ Path = "$root\APPS\ATEAM\tmpclaude-*"; Label = "ATEAM tmpclaude roots" },
    @{ Path = "$root\APPS\ATEAM\Server\tmpclaude-*"; Label = "ATEAM Server tmpclaude roots" }
)

function Get-BytesForPath {
    param([string]$PathPattern)

    $sum = 0L
    $items = Get-ChildItem -Path $PathPattern -Force -ErrorAction SilentlyContinue
    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            $sum += (Get-ChildItem -Path $item.FullName -File -Recurse -Force -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
        } else {
            $sum += $item.Length
        }
    }
    return $sum
}

function Format-GB {
    param([long]$Bytes)
    return [math]::Round(($Bytes / 1GB), 2)
}

$totalBytes = 0L
Write-Host "Scan targets:" -ForegroundColor Cyan
foreach ($target in $targets) {
    $bytes = Get-BytesForPath -PathPattern $target.Path
    $totalBytes += $bytes
    Write-Host (" - {0}: {1} GB" -f $target.Label, (Format-GB -Bytes $bytes))
}

Write-Host ""
Write-Host ("Potential reclaim: {0} GB" -f (Format-GB -Bytes $totalBytes)) -ForegroundColor Yellow

if (-not $Apply) {
    Write-Host "Dry run only. Re-run with -Apply to delete these artifacts." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Applying cleanup..." -ForegroundColor Cyan
foreach ($target in $targets) {
    Get-ChildItem -Path $target.Path -Force -ErrorAction SilentlyContinue |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Cleanup complete." -ForegroundColor Green
