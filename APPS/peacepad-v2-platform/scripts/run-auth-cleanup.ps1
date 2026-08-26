[CmdletBinding()]
param(
  [ValidateSet('ca', 'us', 'all')]
  [string]$Region = 'all'
)

$ErrorActionPreference = 'Stop'

$regions = if ($Region -eq 'all') { @('ca', 'us') } else { @($Region) }
foreach ($currentRegion in $regions) {
  $prefix = "PEACEPAD_V2_$($currentRegion.ToUpperInvariant())"
  $functionUrl = [Environment]::GetEnvironmentVariable("${prefix}_FUNCTION_URL")
  $maintenanceSecret = [Environment]::GetEnvironmentVariable("${prefix}_MAINTENANCE_SECRET")
  if ([string]::IsNullOrWhiteSpace($functionUrl) -or [string]::IsNullOrWhiteSpace($maintenanceSecret)) {
    throw "Missing ${prefix}_FUNCTION_URL or ${prefix}_MAINTENANCE_SECRET."
  }

  $endpoint = "$($functionUrl.TrimEnd('/'))/internal/v2/auth-cleanup/run"
  $response = Invoke-RestMethod -Method Post -Uri $endpoint -Headers @{
    'x-peacepad-maintenance-secret' = $maintenanceSecret
    'x-peacepad-region' = $currentRegion
  } -TimeoutSec 30

  if (
    $null -eq $response.claimed -or
    $null -eq $response.completed -or
    $null -eq $response.rescheduled -or
    $null -eq $response.failedToFinalize -or
    [string]::IsNullOrWhiteSpace([string]$response.region)
  ) {
    throw "Auth cleanup returned an incomplete aggregate for region $currentRegion."
  }
  $claimed = [int]$response.claimed
  $completed = [int]$response.completed
  $rescheduled = [int]$response.rescheduled
  $failedToFinalize = [int]$response.failedToFinalize
  if (
    $response.region -ne $currentRegion -or
    $claimed -lt 0 -or
    $completed -lt 0 -or
    $rescheduled -lt 0 -or
    $failedToFinalize -lt 0 -or
    $claimed -ne ($completed + $rescheduled + $failedToFinalize)
  ) {
    throw "Auth cleanup returned an invalid aggregate for region $currentRegion."
  }

  [pscustomobject]@{
    Region = $currentRegion
    Claimed = $claimed
    Completed = $completed
    Rescheduled = $rescheduled
    FailedToFinalize = $failedToFinalize
  }
  if ($rescheduled -gt 0 -or $failedToFinalize -gt 0) {
    throw "Auth cleanup requires follow-up in region $currentRegion."
  }
}
