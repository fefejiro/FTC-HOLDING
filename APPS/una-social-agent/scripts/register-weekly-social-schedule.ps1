param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PeakAt = '12:30',
  [string]$Channels = 'instagram,linkedin'
)

$ErrorActionPreference = 'Stop'

$runner = Join-Path $ProjectDir 'scripts\social-run.ps1'
if (-not (Test-Path -LiteralPath $runner)) {
  throw "Una Labs social runner was not found: $runner"
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

$runArgs = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ProjectDir `"$ProjectDir`" -CaptionOnly -Channels `"$Channels`""

Register-UnaTask -TaskName 'UnaLabsSocial-PeakCaption' -At $PeakAt -Arguments $runArgs -Description 'Daily peak Eastern caption-only Una Labs Instagram and LinkedIn source-backed draft run.'

Write-Host "Una Labs caption-only social schedule ready for weekdays at $PeakAt Eastern."
Write-Host "No image generation, no OpenAI call, and no browser publish happen in this scheduled task."
