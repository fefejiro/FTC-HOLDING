param(
  [string]$TaskName = "JobReplyAgent-Product-Continuous",
  [ValidateRange(1, 24)]
  [int]$IntervalHours = 6,
  [string]$ProjectRoot = "",
  [Parameter(Mandatory=$true)]
  [string]$WorktreeRoot,
  [string]$StateRoot = "",
  [string]$CodexPath = "",
  [ValidateRange(1, 8)]
  [int]$MaxRunsPerDay = 2,
  [ValidateRange(10, 120)]
  [int]$MaxMinutes = 45
)

$ErrorActionPreference = "Stop"
if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $StateRoot) { $StateRoot = $ProjectRoot }
$projectPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
$worktreePath = (Resolve-Path -LiteralPath $WorktreeRoot).Path
$statePath = (Resolve-Path -LiteralPath $StateRoot).Path

$branch = (& git -C $worktreePath branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -notlike "agent/job-agent-continuous*") {
  throw "Worktree must use an agent/job-agent-continuous* branch. Current branch: '$branch'."
}
if (@(& git -C $worktreePath status --porcelain).Count -gt 0) {
  throw "Continuous-agent worktree must be clean before task registration."
}

$runnerPath = Join-Path $projectPath "scripts\continuous-agent-run.ps1"
if (-not (Test-Path -LiteralPath $runnerPath)) { throw "Missing runner: $runnerPath" }

if ($CodexPath) {
  $codexSource = (Resolve-Path -LiteralPath $CodexPath).Path
} else {
  $codexSource = (Get-Command codex -ErrorAction Stop).Source
}
$loginStatus = (& cmd.exe /d /s /c "`"$codexSource`" login status 2>&1" | Out-String).Trim()
$loginExitCode = $LASTEXITCODE
if ($loginExitCode -ne 0 -or $loginStatus -notmatch "Logged in") {
  throw "Codex CLI must be authenticated before task registration."
}

$execute = "powershell.exe"
$arguments = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`" -ProjectRoot `"$projectPath`" -WorktreeRoot `"$worktreePath`" -StateRoot `"$statePath`" -CodexPath `"$codexSource`" -MaxRunsPerDay $MaxRunsPerDay -MaxMinutes $MaxMinutes"
$action = New-ScheduledTaskAction -Execute $execute -Argument $arguments -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(5)) `
  -RepetitionInterval (New-TimeSpan -Hours $IntervalHours) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes ($MaxMinutes + 5))

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Scheduled task '$TaskName' registered every $IntervalHours hour(s), starting in about 5 minutes."
Write-Host "Authority: product engineering only; no live external actions or deployments."
Write-Host "Runner: $runnerPath"
Write-Host "Codex: $codexSource"
Write-Host "Worktree: $worktreePath ($branch)"
Write-Host "State: $statePath"
Write-Host "Limits: $MaxRunsPerDay run(s)/day, $MaxMinutes minute(s)/run"
