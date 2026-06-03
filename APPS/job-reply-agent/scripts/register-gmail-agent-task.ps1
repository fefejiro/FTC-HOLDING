param(
  [string]$TaskName = "JobReplyAgent-Gmail",
  [int]$IntervalMinutes = 30
)

if ($IntervalMinutes -lt 5) {
  throw "IntervalMinutes must be >= 5"
}

$projectPath = "C:\FTC HOLDING\APPS\job-reply-agent"
$runnerPath = Join-Path $projectPath "scripts\gmail-run.ps1"
$execute = "powershell.exe"
$args = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`""

$action = New-ScheduledTaskAction -Execute $execute -Argument $args -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(1)) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Scheduled task '$TaskName' registered: every $IntervalMinutes minute(s), starts in ~1 minute, run mode=Interactive hidden window."
Write-Host "Runner: $runnerPath"
