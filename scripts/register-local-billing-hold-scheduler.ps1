[CmdletBinding()]
param(
  [switch]$Unregister
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$cycleScript = Join-Path $root "scripts\local-billing-hold-ops-cycle.ps1"
$taskPath = "\FTC Holding\"
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$legacyTaskNames = @("FTC Billing Hold Health", "FTC Billing Hold Status Sync")

$tasks = @(
  @{
    Name = "FTC Product Health"
    Mode = "Health"
    Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Days 3650)
  },
  @{
    Name = "FTC Product Status Sync"
    Mode = "StatusSync"
    Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(10) -RepetitionInterval (New-TimeSpan -Hours 6) -RepetitionDuration (New-TimeSpan -Days 3650)
  }
)

if ($Unregister) {
  foreach ($name in $legacyTaskNames) {
    Unregister-ScheduledTask -TaskName $name -TaskPath $taskPath -Confirm:$false -ErrorAction SilentlyContinue
  }
  foreach ($task in $tasks) {
    Unregister-ScheduledTask -TaskName $task.Name -TaskPath $taskPath -Confirm:$false -ErrorAction SilentlyContinue
  }
  Write-Host "Unregistered FTC local product-health tasks."
  exit 0
}

foreach ($name in $legacyTaskNames) {
  Unregister-ScheduledTask -TaskName $name -TaskPath $taskPath -Confirm:$false -ErrorAction SilentlyContinue
}

foreach ($task in $tasks) {
  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$cycleScript`" -Mode $($task.Mode)" `
    -WorkingDirectory $root

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

  Register-ScheduledTask `
    -TaskName $task.Name `
    -TaskPath $taskPath `
    -Action $action `
    -Trigger $task.Trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

  Write-Host "Registered $($task.Name) ($($task.Mode))."
}

Write-Host "Local product-health scheduler is active."
