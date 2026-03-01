$ErrorActionPreference = "Stop"

$requiredChecks = @(
  @{ Name = "peacepad-home"; Url = "https://peacepad.ca"; Expected = 200 },
  @{ Name = "peacepad-auth-callback"; Url = "https://peacepad.ca/auth/callback"; Expected = 200 },
  @{ Name = "peacepad-mobile-callback"; Url = "https://peacepad.ca/auth/mobile-callback"; Expected = 200 }
)

$optionalChecks = @(
  @{ Name = "peacepad-api-health"; Url = "https://api.peacepad.ca/health"; Expected = 200 }
)

function Invoke-HttpStatusCheck {
  param(
    [Parameter(Mandatory = $true)] [string] $Name,
    [Parameter(Mandatory = $true)] [string] $Url,
    [Parameter(Mandatory = $true)] [int] $Expected,
    [Parameter(Mandatory = $false)] [switch] $Optional
  )

  $statusCode = $null
  $errorMessage = $null

  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -MaximumRedirection 5 -TimeoutSec 20
    $statusCode = [int] $response.StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int] $_.Exception.Response.StatusCode
      $errorMessage = $_.Exception.Message
    } else {
      $errorMessage = $_.Exception.Message
    }
  }

  if ($statusCode -eq $Expected) {
    Write-Host ("PASS {0}: {1} -> {2}" -f $Name, $Url, $statusCode)
    return @{ Passed = $true; Skipped = $false }
  }

  if ($Optional -and -not $statusCode) {
    Write-Host ("WARN {0}: {1} unreachable; skipping optional check ({2})" -f $Name, $Url, $errorMessage)
    return @{ Passed = $true; Skipped = $true }
  }

  if ($statusCode) {
    Write-Host ("FAIL {0}: {1} -> {2} (expected {3})" -f $Name, $Url, $statusCode, $Expected)
  } else {
    Write-Host ("FAIL {0}: {1} -> no response ({2})" -f $Name, $Url, $errorMessage)
  }

  return @{ Passed = $false; Skipped = $false }
}

$failed = $false
$skipped = 0

foreach ($check in $requiredChecks) {
  $result = Invoke-HttpStatusCheck -Name $check.Name -Url $check.Url -Expected $check.Expected
  if (-not $result.Passed) {
    $failed = $true
  }
}

foreach ($check in $optionalChecks) {
  $result = Invoke-HttpStatusCheck -Name $check.Name -Url $check.Url -Expected $check.Expected -Optional
  if ($result.Skipped) {
    $skipped++
  } elseif (-not $result.Passed) {
    $failed = $true
  }
}

if ($failed) {
  Write-Host "FAIL PeacePad production verification failed."
  exit 1
}

if ($skipped -gt 0) {
  Write-Host ("PASS PeacePad production verification passed (optional checks skipped: {0})." -f $skipped)
  exit 0
}

Write-Host "PASS PeacePad production verification passed."
exit 0
