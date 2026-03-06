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
    $rawHeaders = & curl.exe -sS -L -I --max-time $TimeoutSec $Check.Url 2>$null
    if (-not $rawHeaders) {
      throw "No response received."
    }

    $statusLines = @($rawHeaders | Select-String -Pattern "^HTTP/" | ForEach-Object { $_.Line.Trim() })
    if ($statusLines.Count -eq 0) {
      throw "Could not parse HTTP status line."
    }

    $statusParts = $statusLines[-1] -split "\s+"
    if ($statusParts.Count -lt 2) {
      throw "Could not parse HTTP status code."
    }

    $statusCode = [int]$statusParts[1]

    $contentTypeLines = @($rawHeaders | Select-String -Pattern "^Content-Type:" | ForEach-Object { $_.Line.Trim() })
    if ($contentTypeLines.Count -gt 0) {
      $contentType = [string]($contentTypeLines[-1] -replace "^Content-Type:\s*", "")
    }
  } catch {
    $detail = [string]$_.Exception.Message
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
