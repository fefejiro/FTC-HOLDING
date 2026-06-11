param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$ProjectName = "ftc-site-pages",
    [string]$Branch = "main",
    [string]$GardenBaseUrl = "https://gardencleaners.ca",
    [string]$PagesPreviewUrl = "",
    [switch]$SkipFetch,
    [switch]$SkipPlaywright,
    [switch]$SkipDeploy,
    [switch]$AllowDirty,
    [switch]$StrictEnv,
    [switch]$NoTranscript
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path $RepoRoot).Path
$FtcSiteDir = Join-Path $RepoRoot "APPS\ftc-site"
$LogDir = Join-Path $RepoRoot ".local\garden-release-logs"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogPath = Join-Path $LogDir "garden-nightly-release-$Timestamp.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Section {
    param([string]$Message)
    Write-Host ""
    Write-Host ("== {0} ==" -f $Message) -ForegroundColor Cyan
}

function Import-DotEnvFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    Write-Host ("Loading env file: {0}" -f $Path)
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $match = [regex]::Match($trimmed, "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$")
        if (-not $match.Success) {
            continue
        }

        $name = $match.Groups[1].Value
        $value = $match.Groups[2].Value.Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Invoke-Native {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$File,
        [string[]]$Arguments = @()
    )

    Write-Section $Name
    Push-Location $WorkingDirectory
    try {
        & $File @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw ("{0} failed with exit code {1}." -f $Name, $LASTEXITCODE)
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-NativeCapture {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$File,
        [string[]]$Arguments = @()
    )

    Write-Section $Name
    Push-Location $WorkingDirectory
    try {
        $output = & $File @Arguments 2>&1
        $output | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -ne 0) {
            throw ("{0} failed with exit code {1}." -f $Name, $LASTEXITCODE)
        }
        return @($output | ForEach-Object { $_.ToString() })
    }
    finally {
        Pop-Location
    }
}

function Assert-CleanGit {
    param([string]$Message)

    $status = & git -C $RepoRoot status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw "git status failed."
    }

    if ($status -and -not $AllowDirty) {
        Write-Host $status
        throw ("{0} Refusing to deploy a dirty worktree. Re-run manually with -AllowDirty only when intentional." -f $Message)
    }
}

function Invoke-GardenEnvContract {
    if ($StrictEnv) {
        Invoke-Native -Name "Garden env contract" -WorkingDirectory $RepoRoot -File "npm" -Arguments @("--prefix", "APPS/ftc-site", "run", "portal:env:check")
        return
    }

    $placeholderValues = @{
        NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co"
        NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key-for-ci"
        SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-role-key-for-ci"
        NEXT_PUBLIC_SITE_URL = $GardenBaseUrl
    }
    $originalValues = @{}

    foreach ($key in $placeholderValues.Keys) {
        $current = Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue
        $originalValues[$key] = if ($current) { $current.Value } else { $null }
        if (-not $current -or -not $current.Value.Trim()) {
            [Environment]::SetEnvironmentVariable($key, $placeholderValues[$key], "Process")
        }
    }

    try {
        Invoke-Native -Name "Garden env contract" -WorkingDirectory $RepoRoot -File "npm" -Arguments @("--prefix", "APPS/ftc-site", "run", "portal:env:check")
    }
    finally {
        foreach ($key in $placeholderValues.Keys) {
            if ($null -eq $originalValues[$key]) {
                Remove-Item -Path "Env:$key" -ErrorAction SilentlyContinue
            }
            else {
                [Environment]::SetEnvironmentVariable($key, $originalValues[$key], "Process")
            }
        }
    }
}

if (-not $NoTranscript) {
    Start-Transcript -Path $LogPath -Append | Out-Null
}

try {
    Write-Section "Garden nightly release"
    Write-Host ("Repo: {0}" -f $RepoRoot)
    Write-Host ("Started: {0}" -f (Get-Date).ToString("s"))
    Write-Host ("Log: {0}" -f $LogPath)

    if (-not (Test-Path -LiteralPath $FtcSiteDir)) {
        throw ("FTC site directory not found: {0}" -f $FtcSiteDir)
    }

    Import-DotEnvFile -Path (Join-Path $RepoRoot ".env")
    Import-DotEnvFile -Path (Join-Path $RepoRoot ".env.local")
    Import-DotEnvFile -Path (Join-Path $FtcSiteDir ".env")
    Import-DotEnvFile -Path (Join-Path $FtcSiteDir ".env.local")

    if (-not $env:NEXT_PUBLIC_SITE_URL) {
        $env:NEXT_PUBLIC_SITE_URL = $GardenBaseUrl
    }
    if (-not $env:NEXT_PUBLIC_OG_TRADES_SITE_URL) {
        $env:NEXT_PUBLIC_OG_TRADES_SITE_URL = "https://www.ogtradesacademy.com"
    }
    $env:GARDEN_SMOKE_BASE_URL = $GardenBaseUrl

    Assert-CleanGit -Message "Pre-fetch check failed."

    if (-not $SkipFetch) {
        Invoke-Native -Name "Fetch origin main" -WorkingDirectory $RepoRoot -File "git" -Arguments @("fetch", "origin", "main")
        Invoke-Native -Name "Fast-forward local branch" -WorkingDirectory $RepoRoot -File "git" -Arguments @("merge", "--ff-only", "origin/main")
        Assert-CleanGit -Message "Post-fetch check failed."
    }

    Invoke-GardenEnvContract
    Invoke-Native -Name "Garden worker contract" -WorkingDirectory $RepoRoot -File "npm" -Arguments @("--prefix", "APPS/ftc-site", "run", "garden:worker-contract")
    Invoke-Native -Name "Build ftc-site" -WorkingDirectory $RepoRoot -File "npm" -Arguments @("--prefix", "APPS/ftc-site", "run", "build")

    if (-not $SkipPlaywright) {
        Invoke-Native -Name "Garden public Playwright smoke" -WorkingDirectory $FtcSiteDir -File "npx" -Arguments @(
            "playwright",
            "test",
            "tests/garden-portal.spec.ts",
            "tests/garden-cleaners-public.spec.ts",
            "--grep-invert",
            "quote form accepts a valid lead",
            "--reporter=line"
        )
    }

    $previewUrl = $PagesPreviewUrl
    if (-not $SkipDeploy) {
        $deployOutput = Invoke-NativeCapture -Name "Deploy Garden via Cloudflare Pages direct upload" -WorkingDirectory $FtcSiteDir -File "npx" -Arguments @(
            "wrangler",
            "pages",
            "deploy",
            ".vercel/output/static",
            "--project-name",
            $ProjectName,
            "--branch",
            $Branch
        )

        $joined = $deployOutput -join "`n"
        $match = [regex]::Match($joined, "https://[a-z0-9-]+\.ftc-site-pages\.pages\.dev", "IgnoreCase")
        if ($match.Success) {
            $previewUrl = $match.Value
            Write-Host ("Detected Pages preview: {0}" -f $previewUrl)
        }
    }

    if ($previewUrl) {
        $env:GARDEN_SMOKE_PAGES_URL = $previewUrl
    }

    Invoke-Native -Name "Garden production route smoke" -WorkingDirectory $RepoRoot -File "npm" -Arguments @("--prefix", "APPS/ftc-site", "run", "garden:smoke:prod")
    Invoke-Native -Name "Garden auth callback smoke" -WorkingDirectory $FtcSiteDir -File "node" -Arguments @("scripts/qa-garden-auth-callback.mjs")

    Write-Section "Garden nightly release complete"
    Write-Host ("Completed: {0}" -f (Get-Date).ToString("s"))
}
finally {
    if (-not $NoTranscript) {
        Stop-Transcript | Out-Null
    }
}
