param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern("^[a-z0-9][a-z0-9_-]{1,31}$")]
  [string]$InstanceId,
  [string]$TaskName = "",
  [int]$IntervalMinutes = 30,
  [string]$ProjectRoot = "",
  [string]$StateRoot = ""
)

if ($IntervalMinutes -lt 5) {
  throw "IntervalMinutes must be >= 5"
}

if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $StateRoot) { $StateRoot = $ProjectRoot }
$projectPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
$statePath = (Resolve-Path -LiteralPath $StateRoot).Path
$env:JOB_AGENT_STATE_ROOT = $statePath
$ready = & npm --prefix $projectPath run instance:ready -- --instance=$InstanceId
if ($LASTEXITCODE -ne 0) { throw "Instance '$InstanceId' is not ready; scheduler was not registered.`n$ready" }
if (-not $TaskName) { $TaskName = "JobReplyAgent-$InstanceId-Gmail" }
$runnerPath = Join-Path $projectPath "scripts\gmail-run.ps1"
$execute = "powershell.exe"
$args = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`" -InstanceId `"$InstanceId`" -ProjectRoot `"$projectPath`" -StateRoot `"$statePath`""

$action = New-ScheduledTaskAction -Execute $execute -Argument $args -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(1)) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Scheduled task '$TaskName' registered: every $IntervalMinutes minute(s), starts in ~1 minute, run mode=Interactive hidden window."
Write-Host "Runner: $runnerPath"
Write-Host "State: $statePath"
