param(
  [string]$RepoRoot = 'C:\FTC HOLDING',
  [string]$RunnerPath = (Join-Path $PSScriptRoot 'run-local-continuous-improvement.ps1'),
  [string]$TaskName = 'FTC Portfolio Continuous Audit'
)

$ErrorActionPreference = 'Stop'
$repo = [System.IO.Path]::GetFullPath($RepoRoot)
$runner = [System.IO.Path]::GetFullPath($RunnerPath)
if (!(Test-Path -LiteralPath $runner)) { throw "Runner not found: $runner" }
if (!(Test-Path -LiteralPath (Join-Path $repo '.git'))) { throw "Repository not found: $repo" }

$arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`" -RepoRoot `"$repo`" -IssueLimit 3"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 10am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Free local FTC portfolio audit; creates at most three triage issues and never builds or deploys.' -Force | Out-Null
Get-ScheduledTask -TaskName $TaskName
