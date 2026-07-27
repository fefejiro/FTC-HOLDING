param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PeakAt = '06:45',
  [string]$EvergreenAt = '17:30',
  [string]$SaturdayTipAt = '09:00',
  [string]$SundayRecapAt = '10:00',
  [string]$Channels = 'instagram,linkedin'
)

$ErrorActionPreference = 'Stop'

$runner = Join-Path $ProjectDir 'scripts\social-run.ps1'
if (-not (Test-Path -LiteralPath $runner)) {
  throw "Una Labs social runner was not found: $runner"
}

$evergreenRunner = Join-Path $ProjectDir 'scripts\evergreen-run.ps1'
if (-not (Test-Path -LiteralPath $evergreenRunner)) {
  throw "Una Labs evergreen runner was not found: $evergreenRunner"
}

function Register-UnaTask {
  param(
    [string]$TaskName,
    [string]$At,
    [string[]]$DaysOfWeek,
    [string]$Arguments,
    [string]$Description
  )

  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $Arguments -WorkingDirectory $ProjectDir
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DaysOfWeek -At $At
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 90)

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $Description -Force | Out-Null
  Write-Host "Registered $TaskName for $($DaysOfWeek -join ',') at $At."
}

$runArgs = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ProjectDir `"$ProjectDir`" -ForceNew -Channels `"$Channels`" -AllowScheduledPublish"

$staleTasks = @(
  'UnaLabsSocial-DailyDraft',
  'UnaLabsSocial-PeakCaption',
  'UnaLabsSocial-Morning',
  'UnaLabsSocial-Evening',
  'UnaLabsSocial-EngagementMonitor',
  'UnaLabsSocial-EvergreenTip',
  'UnaLabsSocial-WeekendTip',
  'UnaLabsSocial-WeeklyRecap'
)

foreach ($staleTask in $staleTasks) {
  if (Get-ScheduledTask -TaskName $staleTask -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $staleTask -Confirm:$false
    Write-Host "Removed stale task $staleTask."
  }
}

Register-UnaTask -TaskName 'UnaLabsSocial-PeakDraft' -At $PeakAt -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -Arguments $runArgs -Description 'Weekday Una Labs sandbox post: source-backed regional brief, sandbox quality gate, automatic visible-browser publish, and proof ledger.'

$evergreenArgs = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$evergreenRunner`" -ProjectDir `"$ProjectDir`" -Slot `"evergreen`" -Mode `"tip`" -ForceNew -Channels `"$Channels`" -AllowScheduledPublish"
Register-UnaTask -TaskName 'UnaLabsSocial-EvergreenTip' -At $EvergreenAt -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -Arguments $evergreenArgs -Description 'Weekday Una Labs sandbox evergreen post with quality gate, automatic visible-browser publish, and proof ledger.'

$saturdayArgs = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$evergreenRunner`" -ProjectDir `"$ProjectDir`" -Slot `"weekend-tip`" -Mode `"tip`" -ForceNew -Channels `"$Channels`" -AllowScheduledPublish"
Register-UnaTask -TaskName 'UnaLabsSocial-WeekendTip' -At $SaturdayTipAt -DaysOfWeek Saturday -Arguments $saturdayArgs -Description 'Saturday Una Labs sandbox practical AI tip with automatic visible-browser publish and proof ledger.'

$sundayArgs = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$evergreenRunner`" -ProjectDir `"$ProjectDir`" -Slot `"weekly-recap`" -Mode `"weekly-recap`" -ForceNew -Channels `"$Channels`" -AllowScheduledPublish"
Register-UnaTask -TaskName 'UnaLabsSocial-WeeklyRecap' -At $SundayRecapAt -DaysOfWeek Sunday -Arguments $sundayArgs -Description 'Sunday Una Labs sandbox week-ahead recap with automatic visible-browser publish and proof ledger.'

Write-Host "Una Labs social schedule ready for weekdays at $PeakAt Eastern."
Write-Host "Una Labs evergreen tip schedule ready for weekdays at $EvergreenAt Eastern."
Write-Host "Una Labs weekend tip schedule ready for Saturdays at $SaturdayTipAt Eastern."
Write-Host "Una Labs weekly recap schedule ready for Sundays at $SundayRecapAt Eastern."
Write-Host "Una Labs is the sandbox: scheduled lanes publish automatically after quality gates, serialize browser access, and record proof for learning."
