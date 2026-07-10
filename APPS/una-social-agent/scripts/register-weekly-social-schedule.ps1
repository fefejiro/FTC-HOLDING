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

$runArgs = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ProjectDir `"$ProjectDir`" -DraftOnly -Channels `"$Channels`""

$staleTasks = @(
  'UnaLabsSocial-DailyDraft',
  'UnaLabsSocial-PeakCaption',
  'UnaLabsSocial-Morning',
  'UnaLabsSocial-Evening',
  'UnaLabsSocial-EngagementMonitor'
)

foreach ($staleTask in $staleTasks) {
  if (Get-ScheduledTask -TaskName $staleTask -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $staleTask -Confirm:$false
    Write-Host "Removed stale task $staleTask."
  }
}

Register-UnaTask -TaskName 'UnaLabsSocial-PeakDraft' -At $PeakAt -Arguments $runArgs -Description 'Daily peak Eastern Una Labs Instagram and LinkedIn source-backed draft and quality run. Publishing remains review-gated.'

Write-Host "Una Labs social draft schedule ready for weekdays at $PeakAt Eastern."
Write-Host "This creates the Instagram visual draft and LinkedIn/Instagram copy, runs quality checks, and skips browser publish."
