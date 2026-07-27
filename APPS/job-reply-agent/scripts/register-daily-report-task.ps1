param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern("^[a-z0-9][a-z0-9_-]{1,31}$")]
  [string]$InstanceId,
  [string]$TaskName = "",
  [string]$RunTime = "19:00"
)

$projectPath = "C:\FTC HOLDING\APPS\job-reply-agent"
$ready = & npm --prefix $projectPath run instance:ready -- --instance=$InstanceId
if ($LASTEXITCODE -ne 0) { throw "Instance '$InstanceId' is not ready; scheduler was not registered.`n$ready" }
if (-not $TaskName) { $TaskName = "JobReplyAgent-$InstanceId-Digest" }
$npmCmd = "npm"
$args = "run report -- --instance=$InstanceId"

$action = New-ScheduledTaskAction -Execute $npmCmd -Argument $args -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Daily -At $RunTime
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Force
Write-Host "Scheduled task '$TaskName' registered for $RunTime daily."
