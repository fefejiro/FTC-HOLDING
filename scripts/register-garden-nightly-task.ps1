param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$TaskName = "FTC Garden Cleaners Nightly Deploy",
    [string]$At = "20:00",
    [switch]$SkipDeploy,
    [switch]$SkipPlaywright,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path $RepoRoot).Path
$RunnerPath = Join-Path $RepoRoot "scripts\run-garden-nightly-release.ps1"

if (-not (Test-Path -LiteralPath $RunnerPath)) {
    throw ("Garden runner script not found: {0}" -f $RunnerPath)
}

$taskArgs = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    ('"{0}"' -f $RunnerPath),
    "-RepoRoot",
    ('"{0}"' -f $RepoRoot)
)

if ($SkipDeploy) {
    $taskArgs += "-SkipDeploy"
}
if ($SkipPlaywright) {
    $taskArgs += "-SkipPlaywright"
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument ($taskArgs -join " ") `
    -WorkingDirectory $RepoRoot

$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]::ParseExact($At, "HH:mm", $null))
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$description = "Runs Garden Cleaners local CI gates, Cloudflare Pages deploy, and live smoke checks without GitHub Actions."

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing -and -not $Force) {
    throw ("Scheduled task already exists: {0}. Re-run with -Force to replace it." -f $TaskName)
}

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description $description `
    -Force | Out-Null

$registered = Get-ScheduledTask -TaskName $TaskName
$nextRun = (Get-ScheduledTaskInfo -TaskName $TaskName).NextRunTime

Write-Host ("Registered task: {0}" -f $registered.TaskName)
Write-Host ("User: {0}" -f $user)
Write-Host ("Runs daily at local time: {0}" -f $At)
Write-Host ("Next run: {0}" -f $nextRun)
Write-Host ("Action: powershell.exe {0}" -f ($taskArgs -join " "))
