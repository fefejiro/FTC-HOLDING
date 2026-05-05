param(
    [switch]$Apply,
    [switch]$IncludeNodeModules,
    [int]$NodeModulesMaxAgeDays = 14
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

if ($IncludeNodeModules) {
    $targets += @(
        @{ Path = "$root\node_modules"; Label = "Root node_modules" },
        @{ Path = "$root\APPS\dispatch\node_modules"; Label = "Dispatch node_modules" },
        @{ Path = "$root\APPS\saywetin\node_modules"; Label = "SayWetin node_modules" },
        @{ Path = "$root\APPS\saywetin-native\node_modules"; Label = "SayWetin native node_modules" },
        @{ Path = "$root\APPS\ftc-site\node_modules"; Label = "FTC site node_modules" }
    )
}

$cutoff = (Get-Date).AddDays(-1 * [math]::Abs($NodeModulesMaxAgeDays))

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

function Get-MatchingItems {
    param(
        [string]$PathPattern,
        [string]$Label
    )

    $items = Get-ChildItem -Path $PathPattern -Force -ErrorAction SilentlyContinue
    if (-not $IncludeNodeModules) {
        return $items
    }

    if ($Label -notlike "*node_modules*") {
        return $items
    }

    return @($items | Where-Object { $_.LastWriteTime -lt $cutoff })
}

function Format-GB {
    param([long]$Bytes)
    return [math]::Round(($Bytes / 1GB), 2)
}

$totalBytes = 0L
Write-Host "Scan targets:" -ForegroundColor Cyan
foreach ($target in $targets) {
    $matchingItems = Get-MatchingItems -PathPattern $target.Path -Label $target.Label
    if ($matchingItems.Count -eq 0) {
        Write-Host (" - {0}: 0 GB" -f $target.Label)
        continue
    }

    $bytes = 0L
    foreach ($item in $matchingItems) {
        if ($item.PSIsContainer) {
            $bytes += (Get-ChildItem -Path $item.FullName -File -Recurse -Force -ErrorAction SilentlyContinue |
                Measure-Object -Property Length -Sum).Sum
        } else {
            $bytes += $item.Length
        }
    }

    $totalBytes += $bytes
    Write-Host (" - {0}: {1} GB" -f $target.Label, (Format-GB -Bytes $bytes))
}

Write-Host ""
Write-Host ("Potential reclaim: {0} GB" -f (Format-GB -Bytes $totalBytes)) -ForegroundColor Yellow

if (-not $Apply) {
    Write-Host "Dry run only. Re-run with -Apply to delete these artifacts." -ForegroundColor Green
    if ($IncludeNodeModules) {
        Write-Host ("Node modules cleanup scope: last write time older than {0} days (before {1})." -f $NodeModulesMaxAgeDays, $cutoff.ToString("yyyy-MM-dd")) -ForegroundColor DarkYellow
    }
    exit 0
}

Write-Host ""
Write-Host "Applying cleanup..." -ForegroundColor Cyan
foreach ($target in $targets) {
    $matchingItems = Get-MatchingItems -PathPattern $target.Path -Label $target.Label
    if ($matchingItems.Count -eq 0) {
        continue
    }

    $matchingItems | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Cleanup complete." -ForegroundColor Green
