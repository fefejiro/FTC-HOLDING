$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$pathsToRemove = @(
  (Join-Path $projectRoot "Server\.local"),
  (Join-Path $projectRoot "Server\coverage"),
  (Join-Path $projectRoot "Server\server.log"),
  (Join-Path $projectRoot "telegram-gateway\.local")
)

foreach ($path in $pathsToRemove) {
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
    Write-Host "Removed $path"
  }
}

$publicDir = Join-Path $projectRoot "Public"
if (Test-Path -LiteralPath $publicDir) {
  Get-ChildItem -LiteralPath $publicDir -Filter "tmpclaude-*" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
    Write-Host "Removed $($_.FullName)"
  }
}

Write-Host "ATEAM local runtime cleanup complete."
