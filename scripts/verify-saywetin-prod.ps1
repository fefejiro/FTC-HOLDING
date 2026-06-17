[CmdletBinding()]
param(
  [int]$TimeoutSec = 20
)

$ErrorActionPreference = "Stop"

$checks = @(
  @{
    Name = "saywetin.app home";
    Url = "https://saywetin.app";
    Expected = 200;
    ContentTypeContains = "text/html";
  },
  @{
    Name = "www.saywetin.app home";
    Url = "https://www.saywetin.app";
    Expected = 200;
    ContentTypeContains = "text/html";
  },
  @{
    Name = "api.saywetin.app /health";
    Url = "https://api.saywetin.app/health";
    Expected = 200;
    ContentTypeContains = "application/json";
  },
  @{
    Name = "api.saywetin.app /api/status";
    Url = "https://api.saywetin.app/api/status";
    Expected = 200;
    ContentTypeContains = "application/json";
  }
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
    $requestParams = @{
      Uri                = $Check.Url
      Method             = "Get"
      TimeoutSec         = $TimeoutSec
      MaximumRedirection = 5
      ErrorAction        = "Stop"
    }
    if ($PSVersionTable.PSVersion.Major -lt 6) {
      $requestParams.UseBasicParsing = $true
    }

    $response = Invoke-WebRequest @requestParams
    $statusCode = [int]$response.StatusCode
    $contentTypeHeader = $response.Headers["Content-Type"]
    if ($contentTypeHeader -is [array]) {
      $contentType = [string]$contentTypeHeader[0]
    } else {
      $contentType = [string]$contentTypeHeader
    }
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

$results = @()
foreach ($check in $checks) {
  $results += Invoke-EndpointCheck -Check $check -TimeoutSec $TimeoutSec
}

$statusResponse = $null
try {
  $statusResponse = Invoke-RestMethod -Uri "https://api.saywetin.app/api/status" -Method Get -TimeoutSec $TimeoutSec -ErrorAction Stop
} catch {
  $results += [pscustomobject]@{
    Check       = "listen readiness status endpoint"
    Url         = "https://api.saywetin.app/api/status"
    Status      = "-"
    ContentType = "-"
    Result      = "FAIL"
    Detail      = "Could not parse /api/status payload: $($_.Exception.Message)"
  }
}

if ($statusResponse) {
  $acrcloudConfigured = [bool]($statusResponse.acrcloud -and $statusResponse.acrcloud.configured)
  $openaiConfigured = [bool]($statusResponse.openai -and $statusResponse.openai.configured)
  $lyricsConfigured = [bool]($statusResponse.lyrics -and $statusResponse.lyrics.configured)
  $databaseConfigured = [bool]($statusResponse.database -and $statusResponse.database.configured)
  $databaseConnected = [bool]($statusResponse.database -and $statusResponse.database.connected)
  $databaseErrorCode = if ($statusResponse.database -and $statusResponse.database.errorCode) { [string]$statusResponse.database.errorCode } else { "UNKNOWN" }
  $databaseTroubleshooting = if ($statusResponse.database -and $statusResponse.database.troubleshooting) { [string]$statusResponse.database.troubleshooting } else { "-" }

  $results += [pscustomobject]@{
    Check       = "listen readiness acrcloud configured"
    Url         = "https://api.saywetin.app/api/status"
    Status      = "-"
    ContentType = "-"
    Result      = if ($acrcloudConfigured) { "PASS" } else { "FAIL" }
    Detail      = if ($acrcloudConfigured) { "-" } else { "acrcloud.configured=false" }
  }

  $results += [pscustomobject]@{
    Check       = "listen readiness openai configured"
    Url         = "https://api.saywetin.app/api/status"
    Status      = "-"
    ContentType = "-"
    Result      = if ($openaiConfigured) { "PASS" } else { "FAIL" }
    Detail      = if ($openaiConfigured) { "-" } else { "openai.configured=false" }
  }

  $results += [pscustomobject]@{
    Check       = "listen readiness database configured"
    Url         = "https://api.saywetin.app/api/status"
    Status      = "-"
    ContentType = "-"
    Result      = if ($databaseConfigured) { "PASS" } else { "FAIL" }
    Detail      = if ($databaseConfigured) { "-" } else { "database.configured=false" }
  }

  $results += [pscustomobject]@{
    Check       = "listen readiness database connected"
    Url         = "https://api.saywetin.app/api/status"
    Status      = "-"
    ContentType = "-"
    Result      = if ($databaseConnected) { "PASS" } else { "FAIL" }
    Detail      = if ($databaseConnected) { "-" } else { "$databaseErrorCode :: $databaseTroubleshooting" }
  }

  $results += [pscustomobject]@{
    Check       = "listen readiness lyrics configured"
    Url         = "https://api.saywetin.app/api/status"
    Status      = "-"
    ContentType = "-"
    Result      = if ($lyricsConfigured) { "PASS" } else { "WARN" }
    Detail      = if ($lyricsConfigured) { "-" } else { "lyrics.configured=false (degraded lyrics pipeline)" }
  }
}

$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Result -eq "FAIL" })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "FAIL: SayWetin production verification failed."
  exit 1
}

Write-Host ""
Write-Host "PASS: SayWetin production verification passed."
exit 0
