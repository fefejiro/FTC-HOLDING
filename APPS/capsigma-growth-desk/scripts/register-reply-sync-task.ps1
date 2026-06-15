param(
  [string]$TaskName = 'CapSigmaGrowthDeskReplySync',
  [int]$IntervalMinutes = 30,
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$runner = Join-Path $ProjectDir 'scripts\run-reply-sync.ps1'
if (-not (Test-Path -LiteralPath $runner)) {
  throw "Reply sync runner was not found: $runner"
}

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -ProjectDir `"$ProjectDir`"" `
  -WorkingDirectory $ProjectDir

$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Sync CapSigma Growth Desk Gmail replies into the production dashboard.' `
  -Force | Out-Null

Get-ScheduledTask -TaskName $TaskName | Select-Object TaskName, State
