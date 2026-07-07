[CmdletBinding()]
param(
  [int]$TimeoutSec = 20
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

$checks = @(
  @{
    Name = "peacepad.ca home";
    Url = "https://peacepad.ca";
    Expected = 200;
    ContentTypeContains = "text/html";
    ServerContains = "cloudflare";
  },
  @{
    Name = "www.peacepad.ca home";
    Url = "https://www.peacepad.ca";
    Expected = 200;
    ContentTypeContains = "text/html";
    ServerContains = "cloudflare";
  },
  @{
    Name = "api.peacepad.ca /health";
    Url = "https://api.peacepad.ca/health";
    Expected = 200;
    ContentTypeContains = "application/json";
    HeaderName = "x-railway-edge";
    HeaderRequired = $true;
  },
  @{
    Name = "api.peacepad.ca /api/health";
    Url = "https://api.peacepad.ca/api/health";
    Expected = 200;
    ContentTypeContains = "application/json";
    HeaderName = "x-railway-edge";
    HeaderRequired = $true;
  },
  @{
    Name = "peacepad.ca /auth/callback";
    Url = "https://peacepad.ca/auth/callback";
    Expected = 200;
    ContentTypeContains = "text/html";
  },
  @{
    Name = "peacepad.ca /auth/mobile-callback";
    Url = "https://peacepad.ca/auth/mobile-callback";
    Expected = 200;
    ContentTypeContains = "text/html";
  },
  @{
    Name = "peacepad.ca build meta";
    Url = "https://peacepad.ca/_peacepad/build-meta.json";
    Expected = 200;
    ContentTypeContains = "application/json";
    CacheControlContains = "no-store";
    RequireJsonField = "webBuildId";
  },
  @{
    Name = "peacepad.ca onboarding bundle references API domain";
    Url = "https://peacepad.ca/onboarding";
    Expected = 200;
    ContentTypeContains = "text/html";
    HtmlAssetPattern = '<script[^>]+src="(/assets/index-[^"]+\.js)"';
    BundleMustContain = "api.peacepad.ca";
  }
)

function Invoke-CurlHeaders {
  param(
    [Parameter(Mandatory = $true)] [string]$Url,
    [Parameter(Mandatory = $true)] [int]$TimeoutSec
  )

  $rawHeaders = & curl.exe -sS -L -I --max-time $TimeoutSec $Url 2>$null
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

  $contentTypeLine = @($rawHeaders | Select-String -Pattern "^Content-Type:" | ForEach-Object { $_.Line.Trim() }) | Select-Object -Last 1
  $serverLine = @($rawHeaders | Select-String -Pattern "^Server:" | ForEach-Object { $_.Line.Trim() }) | Select-Object -Last 1
  $cacheControlLine = @($rawHeaders | Select-String -Pattern "^Cache-Control:" | ForEach-Object { $_.Line.Trim() }) | Select-Object -Last 1

  $headerMap = @{}
  foreach ($line in $rawHeaders) {
    $trimmedLine = $line.ToString().Trim()
    if ($trimmedLine -match "^[A-Za-z0-9\-]+:\s*") {
      $headerName, $headerValue = $trimmedLine -split ":\s*", 2
      if (-not [string]::IsNullOrWhiteSpace($headerName)) {
        $headerMap[$headerName.ToLowerInvariant()] = if ($null -eq $headerValue) { "" } else { [string]$headerValue }
      }
    }
  }

  [pscustomobject]@{
    StatusCode = $statusCode
    ContentType = if ($contentTypeLine) { [string]($contentTypeLine -replace "^Content-Type:\s*", "") } else { "" }
    Server = if ($serverLine) { [string]($serverLine -replace "^Server:\s*", "") } else { "" }
    CacheControl = if ($cacheControlLine) { [string]($cacheControlLine -replace "^Cache-Control:\s*", "") } else { "" }
    Headers = $headerMap
  }
}

function Invoke-CurlBody {
  param(
    [Parameter(Mandatory = $true)] [string]$Url,
    [Parameter(Mandatory = $true)] [int]$TimeoutSec
  )

  $handler = [System.Net.Http.HttpClientHandler]::new()
  $handler.AllowAutoRedirect = $true
  $handler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate -bor [System.Net.DecompressionMethods]::Brotli
  $client = [System.Net.Http.HttpClient]::new($handler)
  $client.Timeout = [TimeSpan]::FromSeconds($TimeoutSec)
  $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $Url)

  try {
    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    if (-not $response.IsSuccessStatusCode) {
      throw "Body request failed with status $([int]$response.StatusCode)."
    }

    return [string]$response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  } finally {
    $request.Dispose()
    $client.Dispose()
    $handler.Dispose()
  }
}

function Invoke-EndpointCheck {
  param(
    [Parameter(Mandatory = $true)] [hashtable]$Check,
    [Parameter(Mandatory = $true)] [int]$TimeoutSec
  )

  $statusCode = $null
  $contentType = ""
  $server = ""
  $cacheControl = ""
  $headerValue = ""
  $detail = ""
  $bundleAsset = ""

  try {
    $headers = Invoke-CurlHeaders -Url $Check.Url -TimeoutSec $TimeoutSec
    $statusCode = $headers.StatusCode
    $contentType = $headers.ContentType
    $server = $headers.Server
    $cacheControl = $headers.CacheControl
    if ($Check.ContainsKey("HeaderName")) {
      $headerName = [string]$Check.HeaderName
      if ($headers.Headers.ContainsKey($headerName.ToLowerInvariant())) {
        $headerValue = [string]$headers.Headers[$headerName.ToLowerInvariant()]
      }
    }

    if ($Check.ContainsKey("RequireJsonField") -or $Check.ContainsKey("HtmlAssetPattern")) {
      $body = Invoke-CurlBody -Url $Check.Url -TimeoutSec $TimeoutSec
      if (-not $body) {
        throw "Response body was empty."
      }

      if ($Check.ContainsKey("RequireJsonField")) {
        $requiredField = [string]$Check.RequireJsonField
        try {
          $json = $body | ConvertFrom-Json
          $value = $json.$requiredField
          if ([string]::IsNullOrWhiteSpace([string]$value)) {
            throw "JSON field '$requiredField' was missing or empty."
          }
        } catch {
          throw "Failed JSON validation: $($_.Exception.Message)"
        }
      }

      if ($Check.ContainsKey("HtmlAssetPattern")) {
        $pattern = [string]$Check.HtmlAssetPattern
        $match = [regex]::Match($body, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if (-not $match.Success -or $match.Groups.Count -lt 2) {
          throw "Could not find index asset script in onboarding HTML."
        }

        $bundleAsset = $match.Groups[1].Value
        $bundleUrl = "https://peacepad.ca$bundleAsset"
        $bundleBody = Invoke-CurlBody -Url $bundleUrl -TimeoutSec $TimeoutSec
        if (-not $bundleBody) {
          throw "Failed to fetch bundle asset body: $bundleAsset"
        }

        if ($Check.ContainsKey("BundleMustContain")) {
          $bundleNeedle = [string]$Check.BundleMustContain
          if (-not $bundleBody.ToLowerInvariant().Contains($bundleNeedle.ToLowerInvariant())) {
            throw "Bundle asset '$bundleAsset' does not reference '$bundleNeedle'."
          }
        }
      }
    }
  } catch {
    $detail = [string]$_.Exception.Message
  }

  $statusPass = $statusCode -eq $Check.Expected
  $typePass = $true
  $serverPass = $true
  $cachePass = $true
  $headerPass = $true

  if ($Check.ContainsKey("ContentTypeContains")) {
    $requiredType = [string]$Check.ContentTypeContains
    $typePass = -not [string]::IsNullOrWhiteSpace($contentType) -and $contentType.ToLowerInvariant().Contains($requiredType.ToLowerInvariant())
    if (-not $typePass -and [string]::IsNullOrWhiteSpace($detail)) {
      $detail = "Content-Type did not include '$requiredType'."
    }
  }

  if ($Check.ContainsKey("ServerContains")) {
    $requiredServer = [string]$Check.ServerContains
    $serverPass = -not [string]::IsNullOrWhiteSpace($server) -and $server.ToLowerInvariant().Contains($requiredServer.ToLowerInvariant())
    if (-not $serverPass -and [string]::IsNullOrWhiteSpace($detail)) {
      $detail = "Server header did not include '$requiredServer'."
    }
  }

  if ($Check.ContainsKey("HeaderName") -and $Check.ContainsKey("HeaderContains")) {
    $requiredHeaderName = [string]$Check.HeaderName
    $requiredHeaderValue = [string]$Check.HeaderContains
    $headerPass = -not [string]::IsNullOrWhiteSpace($headerValue) -and $headerValue.ToLowerInvariant().Contains($requiredHeaderValue.ToLowerInvariant())
    if (-not $headerPass -and [string]::IsNullOrWhiteSpace($detail)) {
      $detail = "Header '$requiredHeaderName' did not include '$requiredHeaderValue'."
    }
  }

  if ($Check.ContainsKey("HeaderName") -and $Check.ContainsKey("HeaderRequired")) {
    $requiredHeaderName = [string]$Check.HeaderName
    $headerPass = -not [string]::IsNullOrWhiteSpace($headerValue)
    if (-not $headerPass -and [string]::IsNullOrWhiteSpace($detail)) {
      $detail = "Header '$requiredHeaderName' was missing or empty."
    }
  }

  if ($Check.ContainsKey("CacheControlContains")) {
    $requiredCache = [string]$Check.CacheControlContains
    $cachePass = -not [string]::IsNullOrWhiteSpace($cacheControl) -and $cacheControl.ToLowerInvariant().Contains($requiredCache.ToLowerInvariant())
    if (-not $cachePass -and [string]::IsNullOrWhiteSpace($detail)) {
      $detail = "Cache-Control did not include '$requiredCache'."
    }
  }

  $pass = $statusPass -and $typePass -and $serverPass -and $cachePass -and $headerPass -and [string]::IsNullOrWhiteSpace($detail)

  if (-not $statusPass -and [string]::IsNullOrWhiteSpace($detail)) {
    $detail = "Expected HTTP $($Check.Expected), got $statusCode."
  }

  [pscustomobject]@{
    Check       = [string]$Check.Name
    Url         = [string]$Check.Url
    Status      = if ($null -ne $statusCode) { [string]$statusCode } else { "-" }
    ContentType = if ([string]::IsNullOrWhiteSpace($contentType)) { "-" } else { $contentType }
    Server      = if ([string]::IsNullOrWhiteSpace($server)) { "-" } else { $server }
    HeaderValue = if ([string]::IsNullOrWhiteSpace($headerValue)) { "-" } else { $headerValue }
    Cache       = if ([string]::IsNullOrWhiteSpace($cacheControl)) { "-" } else { $cacheControl }
    BundleAsset = if ([string]::IsNullOrWhiteSpace($bundleAsset)) { "-" } else { $bundleAsset }
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
  Write-Host "Failed check details:"
  $results |
    Where-Object { $_.Result -eq "FAIL" } |
    Format-List Check, Url, Status, ContentType, Server, HeaderValue, Cache, BundleAsset, Detail

  Write-Host ""
  Write-Host ("FAIL: {0} check(s) failed." -f $failedCount)
  exit 1
}

Write-Host ""
Write-Host "PASS: all PeacePad production endpoint checks passed."
exit 0
