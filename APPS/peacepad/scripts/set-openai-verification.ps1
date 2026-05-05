param(
  [Parameter(Mandatory = $true)]
  [string]$PlaceThisTokenAt,
  [string]$Token
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

function Read-TokenFromPrompt {
  $secure = Read-Host "Paste Verification token" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$relativePath = Resolve-RelativePath -InputValue $PlaceThisTokenAt
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$relativeNoSlash = $relativePath.TrimStart("/")
$relativeFsPath = $relativeNoSlash -replace "/", [IO.Path]::DirectorySeparatorChar
$outputFilePath = Join-Path $repoRoot (Join-Path "client/public" $relativeFsPath)

if ([string]::IsNullOrWhiteSpace($Token)) {
  $Token = Read-TokenFromPrompt
}

if ([string]::IsNullOrWhiteSpace($Token)) {
  throw "Verification token is required."
}

$outputDir = Split-Path -Parent $outputFilePath
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputFilePath, $Token, $utf8NoBom)

Write-Output "Created verification file: $outputFilePath"
Write-Output "Relative URL path: $relativePath"
Write-Output "Token length: $($Token.Length)"
