param(
  [string]$TaskName = "JobReplyAgentDailyReport",
  [string]$RunTime = "19:00"
)

$projectPath = "C:\FTC HOLDING\APPS\job-reply-agent"
$npmCmd = "npm"
$args = "run report"

$action = New-ScheduledTaskAction -Execute $npmCmd -Argument $args -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Daily -At $RunTime
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Force
Write-Host "Scheduled task '$TaskName' registered for $RunTime daily."
