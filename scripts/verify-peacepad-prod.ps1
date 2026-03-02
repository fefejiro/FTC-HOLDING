[CmdletBinding()]
param(
  [int]$TimeoutSec = 20
)

$ErrorActionPreference = "Stop"

$checks = @(
  @{ Name = "peacepad.ca home"; Url = "https://peacepad.ca"; Expected = 200; ContentTypeContains = "text/html" },
  @{ Name = "www.peacepad.ca home"; Url = "https://www.peacepad.ca"; Expected = 200; ContentTypeContains = "text/html" },
  @{ Name = "api.peacepad.ca /health"; Url = "https://api.peacepad.ca/health"; Expected = 200 },
  @{ Name = "api.peacepad.ca /api/health"; Url = "https://api.peacepad.ca/api/health"; Expected = 200 },
  @{ Name = "peacepad.ca /auth/callback"; Url = "https://peacepad.ca/auth/callback"; Expected = 200 },
  @{ Name = "peacepad.ca /auth/mobile-callback"; Url = "https://peacepad.ca/auth/mobile-callback"; Expected = 200 }
)

function Invoke-EndpointCheck {
  param(
    [Parameter(Mandatory = $true)] [hashtable]$Check,
    [Parameter(Mandatory = $true)] [int]$TimeoutSec
  )

  $statusCode = $null
  $contentType = ""
  $detail = ""

  try {
    $response = Invoke-WebRequest -Uri $Check.Url -Method Get -MaximumRedirection 5 -TimeoutSec $TimeoutSec -ErrorAction Stop
    $statusCode = [int]$response.StatusCode
    $contentType = [string]$response.Headers["Content-Type"]
  } catch {
    if ($_.Exception.Response) {
      try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
      try { $contentType = [string]$_.Exception.Response.Headers["Content-Type"] } catch {}
    }
    $detail = $_.Exception.Message
  }

  $statusPass = $statusCode -eq $Check.Expected
  $typePass = $true

  if ($Check.ContainsKey("ContentTypeContains")) {
    $requiredType = [string]$Check.ContentTypeContains
    $typePass = -not [string]::IsNullOrWhiteSpace($contentType) -and $contentType.ToLowerInvariant().Contains($requiredType.ToLowerInvariant())
    if (-not $typePass -and [string]::IsNullOrWhiteSpace($detail)) {
      $detail = "Content-Type did not include '$requiredType'."
    }
  }

  $pass = $statusPass -and $typePass

  if (-not $statusPass -and [string]::IsNullOrWhiteSpace($detail)) {
    $detail = "Expected HTTP $($Check.Expected), got $statusCode."
  }

  [pscustomobject]@{
    Check       = [string]$Check.Name
    Url         = [string]$Check.Url
    Status      = if ($null -ne $statusCode) { [string]$statusCode } else { "-" }
    ContentType = if ([string]::IsNullOrWhiteSpace($contentType)) { "-" } else { $contentType }
    Result      = if ($pass) { "PASS" } else { "FAIL" }
    Detail      = if ([string]::IsNullOrWhiteSpace($detail)) { "-" } else { $detail }
  }
}

$results = foreach ($check in $checks) {
  Invoke-EndpointCheck -Check $check -TimeoutSec $TimeoutSec
}

$results | Format-Table -AutoSize

$failedCount = @($results | Where-Object { $_.Result -eq "FAIL" }).Count

if ($failedCount -gt 0) {
  Write-Host ""
  Write-Host ("FAIL: {0} check(s) failed." -f $failedCount)
  exit 1
}

Write-Host ""
Write-Host "PASS: all PeacePad production endpoint checks passed."
exit 0
