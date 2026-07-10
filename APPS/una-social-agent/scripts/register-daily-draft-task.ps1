param(
  [string]$TaskName = 'UnaLabsSocial-DailyDraft',
  [string]$At = '08:10',
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$runner = Join-Path $ProjectDir 'scripts\social-run.ps1'
if (-not (Test-Path -LiteralPath $runner)) {
  throw "Una Labs social runner was not found: $runner"
}

$execute = 'powershell.exe'
$args = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ProjectDir `"$ProjectDir`""

$action = New-ScheduledTaskAction -Execute $execute -Argument $args -WorkingDirectory $ProjectDir
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At $At
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Generate, quality-check, browser-publish, verify, and record Una Labs Instagram and LinkedIn posts from source-backed AI/tech news.' -Force | Out-Null

Write-Host "Scheduled task '$TaskName' registered for weekdays at $At."
Write-Host "Runner: $runner"
