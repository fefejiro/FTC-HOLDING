[CmdletBinding()]
param(
  [switch]$Unregister
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$cycleScript = Join-Path $root "scripts\local-billing-hold-ops-cycle.ps1"
$taskPath = "\FTC Holding\"
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$tasks = @(
  @{
    Name = "FTC Billing Hold Health"
    Mode = "Health"
    Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration (New-TimeSpan -Days 3650)
  },
  @{
    Name = "FTC Billing Hold Status Sync"
    Mode = "StatusSync"
    Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(10) -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Days 3650)
  }
)

if ($Unregister) {
  foreach ($task in $tasks) {
    Unregister-ScheduledTask -TaskName $task.Name -TaskPath $taskPath -Confirm:$false -ErrorAction SilentlyContinue
  }
  Write-Host "Unregistered FTC billing-hold local tasks."
  exit 0
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

Write-Host "Local billing-hold scheduler is active."
