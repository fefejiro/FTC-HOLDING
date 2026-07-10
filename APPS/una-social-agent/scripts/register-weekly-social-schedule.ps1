param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$MorningAt = '09:10',
  [string]$EveningAt = '18:40',
  [string]$MonitorAt = '20:50',
  [string]$Channels = 'instagram,linkedin'
)

$ErrorActionPreference = 'Stop'

$runner = Join-Path $ProjectDir 'scripts\social-run.ps1'
$monitor = Join-Path $ProjectDir 'scripts\visible-social-monitor.py'
if (-not (Test-Path -LiteralPath $runner)) {
  throw "Una Labs social runner was not found: $runner"
}
if (-not (Test-Path -LiteralPath $monitor)) {
  throw "Una Labs social monitor was not found: $monitor"
}

function Register-UnaTask {
  param(
    [string]$TaskName,
    [string]$At,
    [string]$Arguments,
    [string]$Description
  )

  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $Arguments -WorkingDirectory $ProjectDir
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At $At
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $Description -Force | Out-Null
  Write-Host "Registered $TaskName for weekdays at $At."
}

$runArgs = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ProjectDir `"$ProjectDir`" -ForceNew -Channels `"$Channels`""
$monitorArgs = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command `"Set-Location '$ProjectDir'; python '$monitor'`""

Register-UnaTask -TaskName 'UnaLabsSocial-Morning' -At $MorningAt -Arguments $runArgs -Description 'Morning Una Labs source-backed Instagram and LinkedIn visible-browser publishing run.'
Register-UnaTask -TaskName 'UnaLabsSocial-Evening' -At $EveningAt -Arguments $runArgs -Description 'Evening Una Labs source-backed Instagram and LinkedIn visible-browser publishing run.'
Register-UnaTask -TaskName 'UnaLabsSocial-EngagementMonitor' -At $MonitorAt -Arguments $monitorArgs -Description 'Capture Una Labs Instagram and LinkedIn engagement proof screenshots.'

Write-Host "Una Labs social schedule ready. Keep the computer signed in, unlocked, online, and Chrome available."
