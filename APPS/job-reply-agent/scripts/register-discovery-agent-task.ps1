param(
  [string]$TaskName = "JobReplyAgent-Discovery",
  [int]$IntervalMinutes = 120,
  [switch]$VisibleBrowser
)

if ($IntervalMinutes -lt 15) {
  throw "IntervalMinutes must be >= 15"
}

$projectPath = "C:\FTC HOLDING\APPS\job-reply-agent"
$runnerPath = Join-Path $projectPath "scripts\discovery-run.ps1"
$execute = "powershell.exe"
$visibleArg = if ($VisibleBrowser) { " -VisibleBrowser" } else { "" }
$args = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`"$visibleArg"

$action = New-ScheduledTaskAction -Execute $execute -Argument $args -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(1)) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 75)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Scheduled task '$TaskName' registered: every $IntervalMinutes minute(s), starts in ~1 minute, run mode=Interactive hidden window, visible discovery=$VisibleBrowser."
Write-Host "Runner: $runnerPath"
