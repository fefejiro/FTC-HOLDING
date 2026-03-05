$ErrorActionPreference = "Stop"

$checks = @(
  @{ Name = "api.peacepad.ca /health"; Url = "https://api.peacepad.ca/health" },
  @{ Name = "api.peacepad.ca /api/health"; Url = "https://api.peacepad.ca/api/health" },
  @{ Name = "api.saywetin.app /health"; Url = "https://api.saywetin.app/health" },
  @{ Name = "api.saywetin.app /api/status"; Url = "https://api.saywetin.app/api/status" }
)

$failed = $false

foreach ($check in $checks) {
  try {
    $response = Invoke-WebRequest -Uri $check.Url -Method Get -UseBasicParsing -TimeoutSec 20
    Write-Host ("{0} => {1}" -f $check.Name, $response.StatusCode)
    if ($response.StatusCode -ne 200) {
      $failed = $true
    }
  }
  catch {
    $failed = $true
    $statusCode = $null
    try { $statusCode = $_.Exception.Response.StatusCode.value__ } catch {}

    if ($statusCode) {
      Write-Host ("{0} => HTTP {1}" -f $check.Name, $statusCode)
    }
    else {
      Write-Host ("{0} => REQUEST_FAILED" -f $check.Name)
    }
  }
}

if ($failed) {
  throw "Production verification failed. One or more endpoints did not return HTTP 200."
}

Write-Host "Production verification passed."
