[CmdletBinding()]
param(
  [int[]]$ApiPorts = @(8000, 5000),
  [int[]]$UiPorts = @(5173, 5000),
  [int]$TimeoutSec = 8
)

$ErrorActionPreference = "Stop"

function Invoke-HttpCheck {
  param(
    [Parameter(Mandatory = $true)] [string]$Name,
    [Parameter(Mandatory = $true)] [string]$Url,
    [Parameter(Mandatory = $true)] [int]$ExpectedStatus,
    [Parameter(Mandatory = $false)] [string]$ContentTypeContains
  )

  $statusCode = $null
  $contentType = ""
  $detail = ""

  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -MaximumRedirection 3 -TimeoutSec $TimeoutSec -ErrorAction Stop
    $statusCode = [int]$response.StatusCode
    $contentType = [string]$response.Headers["Content-Type"]
  } catch {
    if ($_.Exception.Response) {
      try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
      try { $contentType = [string]$_.Exception.Response.Headers["Content-Type"] } catch {}
    }
    $detail = $_.Exception.Message
  }

  $statusPass = $statusCode -eq $ExpectedStatus
  $typePass = $true

  if ($ContentTypeContains) {
    $typePass = -not [string]::IsNullOrWhiteSpace($contentType) -and $contentType.ToLowerInvariant().Contains($ContentTypeContains.ToLowerInvariant())
    if (-not $typePass -and [string]::IsNullOrWhiteSpace($detail)) {
      $detail = "Content-Type did not include '$ContentTypeContains'."
    }
  }

  $pass = $statusPass -and $typePass
  if (-not $statusPass -and [string]::IsNullOrWhiteSpace($detail)) {
    $detail = "Expected HTTP $ExpectedStatus, got $statusCode."
  }

  [pscustomobject]@{
    Check       = $Name
    Url         = $Url
    Status      = if ($null -ne $statusCode) { [string]$statusCode } else { "-" }
    ContentType = if ([string]::IsNullOrWhiteSpace($contentType)) { "-" } else { $contentType }
    Result      = if ($pass) { "PASS" } else { "FAIL" }
    Detail      = if ([string]::IsNullOrWhiteSpace($detail)) { "-" } else { $detail }
  }
}

$results = @()

foreach ($port in $ApiPorts) {
  $results += Invoke-HttpCheck -Name "API /health on $port" -Url "http://127.0.0.1:$port/health" -ExpectedStatus 200
  $results += Invoke-HttpCheck -Name "API /api/health on $port" -Url "http://127.0.0.1:$port/api/health" -ExpectedStatus 200
}

foreach ($port in $UiPorts) {
  $results += Invoke-HttpCheck -Name "UI / on $port" -Url "http://127.0.0.1:$port/" -ExpectedStatus 200 -ContentTypeContains "text/html"
}

$results | Format-Table -AutoSize

$apiHealthyPorts = @()
foreach ($port in $ApiPorts) {
  $healthPass = $results | Where-Object { $_.Check -eq "API /health on $port" -and $_.Result -eq "PASS" }
  $apiHealthPass = $results | Where-Object { $_.Check -eq "API /api/health on $port" -and $_.Result -eq "PASS" }
  if ($healthPass -and $apiHealthPass) {
    $apiHealthyPorts += $port
  }
}

$uiHealthyPorts = @()
foreach ($port in $UiPorts) {
  $uiPass = $results | Where-Object { $_.Check -eq "UI / on $port" -and $_.Result -eq "PASS" }
  if ($uiPass) {
    $uiHealthyPorts += $port
  }
}

$apiOk = $apiHealthyPorts.Count -gt 0
$uiOk = $uiHealthyPorts.Count -gt 0

Write-Host ""
Write-Host ("API healthy ports: {0}" -f ($(if ($apiOk) { ($apiHealthyPorts -join ", ") } else { "none" })))
Write-Host ("UI healthy ports: {0}" -f ($(if ($uiOk) { ($uiHealthyPorts -join ", ") } else { "none" })))

if (-not $apiOk -or -not $uiOk) {
  Write-Host ""
  Write-Host "FAIL: local PeacePad verification failed."
  exit 1
}

Write-Host ""
Write-Host "PASS: local PeacePad verification passed."
exit 0
