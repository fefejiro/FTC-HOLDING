$ErrorActionPreference = "Stop"

$checks = @(
  @{ Name = "peacepad server /health"; Url = "http://127.0.0.1:8000/health" },
  @{ Name = "peacepad server /api/health"; Url = "http://127.0.0.1:8000/api/health" },
  @{ Name = "peacepad client"; Url = "http://127.0.0.1:5173" },
  @{ Name = "saywetin server /health"; Url = "http://127.0.0.1:8001/health" },
  @{ Name = "saywetin server /api/status"; Url = "http://127.0.0.1:8001/api/status" },
  @{ Name = "saywetin client"; Url = "http://127.0.0.1:5174" }
)

$failed = $false

foreach ($check in $checks) {
  try {
    $response = Invoke-WebRequest -Uri $check.Url -Method Get -UseBasicParsing -TimeoutSec 15
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
  throw "Local verification failed. One or more endpoints did not return HTTP 200."
}

Write-Host "Local verification passed."
