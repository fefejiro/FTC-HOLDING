[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^https://')]
  [string]$Origin,

  [Parameter(Mandatory = $true)]
  [string]$EnrollmentToken,

  [string]$DeviceName = $env:COMPUTERNAME,

  [string]$RunnerHandler
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source

Push-Location $root
try {
  npm ci --workspaces=false
  npm run build --workspaces=false
  & $node 'dist/product_runner_client.js' 'enroll' "--origin=$Origin" "--token=$EnrollmentToken" "--name=$DeviceName"
  if ($LASTEXITCODE -ne 0) {
    throw "Trusted runner enrollment failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}

$runnerConfig = Join-Path $env:LOCALAPPDATA 'UnaLabs\JobAgent\runner.json'
if (-not (Test-Path -LiteralPath $runnerConfig)) {
  throw "Runner configuration was not created at $runnerConfig."
}

& icacls.exe $runnerConfig '/inheritance:r' "/grant:r" "$env:USERNAME`:(R,W)" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Could not restrict the trusted runner credential file."
}

if ($RunnerHandler) {
  $resolvedHandler = (Resolve-Path -LiteralPath $RunnerHandler).Path
  [Environment]::SetEnvironmentVariable('JOB_AGENT_RUNNER_HANDLER', $resolvedHandler, 'User')
}

$config = Get-Content -LiteralPath $runnerConfig -Raw | ConvertFrom-Json
$taskName = "UnaLabs-JobAgent-Runner-$($config.deviceId)"
$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument '"dist/product_runner_client.js" run' `
  -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'Una Labs JobAgent signed trusted runner. Browser sessions remain on this device.' `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Host "Trusted runner enrolled and started."
Write-Host "Task: $taskName"
Write-Host "Candidate: $($config.candidateUserId)"
Write-Host "Config: $runnerConfig"
