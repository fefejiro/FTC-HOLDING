param(
  [Parameter(Mandatory = $true)]
  [string]$PlaceThisTokenAt,
  [string]$Domain = "https://peacepad.ca"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-RelativePath {
  param([string]$InputValue)

  $value = $InputValue.Trim()
  if ($value -match "^https?://[^/]+(?<path>/.*)$") {
    return $Matches["path"]
  }

  if (-not $value.StartsWith("/")) {
    return "/$value"
  }

  return $value
}

function Get-TextHash {
  param([string]$Value)

  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha.ComputeHash($bytes)
  }
  finally {
    $sha.Dispose()
  }
  return ($hash | ForEach-Object { $_.ToString("x2") }) -join ""
}

$relativePath = Resolve-RelativePath -InputValue $PlaceThisTokenAt
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$relativeNoSlash = $relativePath.TrimStart("/")
$relativeFsPath = $relativeNoSlash -replace "/", [IO.Path]::DirectorySeparatorChar
$localFilePath = Join-Path $repoRoot (Join-Path "client/public" $relativeFsPath)

if (-not (Test-Path -LiteralPath $localFilePath)) {
  throw "Verification file not found: $localFilePath"
}

$expectedBody = [System.IO.File]::ReadAllText($localFilePath)
$url = "$($Domain.TrimEnd('/'))$relativePath"
$response = Invoke-WebRequest -Uri $url -UseBasicParsing -Method Get -TimeoutSec 30
$actualBody = ""
if ($response.Content -is [byte[]]) {
  $actualBody = [Text.Encoding]::UTF8.GetString($response.Content)
}
elseif ($response.RawContentStream) {
  $stream = $response.RawContentStream
  if ($stream.CanSeek) { $stream.Position = 0 }
  $reader = New-Object System.IO.StreamReader($stream, [Text.Encoding]::UTF8, $true, 1024, $true)
  try {
    $actualBody = $reader.ReadToEnd()
  }
  finally {
    $reader.Dispose()
  }
}
else {
  $actualBody = [string]$response.Content
}

if ([int]$response.StatusCode -ne 200) {
  throw "Expected HTTP 200 at $url but received $($response.StatusCode)."
}

if (-not $actualBody.Equals($expectedBody, [System.StringComparison]::Ordinal)) {
  $expectedHash = Get-TextHash -Value $expectedBody
  $actualHash = Get-TextHash -Value $actualBody
  throw "Body mismatch at $url. expectedLen=$($expectedBody.Length) actualLen=$($actualBody.Length) expectedSha256=$expectedHash actualSha256=$actualHash"
}

Write-Output "OK: $url returned HTTP 200 and exact token body."
