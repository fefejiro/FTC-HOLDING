param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern("^[a-z0-9][a-z0-9_-]{1,31}$")]
  [string]$InstanceId,
  [string]$TaskName = "",
  [string]$RunTime = "19:00",
  [string]$ProjectRoot = "",
  [string]$StateRoot = ""
)

if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $StateRoot) { $StateRoot = $ProjectRoot }
$projectPath = (Resolve-Path -LiteralPath $ProjectRoot).Path
$statePath = (Resolve-Path -LiteralPath $StateRoot).Path
$env:JOB_AGENT_STATE_ROOT = $statePath
$ready = & npm --prefix $projectPath run instance:ready -- --instance=$InstanceId
if ($LASTEXITCODE -ne 0) { throw "Instance '$InstanceId' is not ready; scheduler was not registered.`n$ready" }
if (-not $TaskName) { $TaskName = "JobReplyAgent-$InstanceId-Digest" }
$runnerPath = Join-Path $projectPath "scripts\report-run.ps1"
$execute = "powershell.exe"
$args = "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`" -InstanceId `"$InstanceId`" -ProjectRoot `"$projectPath`" -StateRoot `"$statePath`""

$action = New-ScheduledTaskAction -Execute $execute -Argument $args -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Daily -At $RunTime
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Force
Write-Host "Scheduled task '$TaskName' registered for $RunTime daily."
Write-Host "Runner: $runnerPath"
Write-Host "State: $statePath"
