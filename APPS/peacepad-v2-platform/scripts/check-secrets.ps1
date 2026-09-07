[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$files = Get-ChildItem -Path $root -Recurse -File | Where-Object {
  $_.FullName -notmatch '[\\/]\.terraform[\\/]'
}

$patterns = @(
  @{ Name = "private key"; Regex = '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----' },
  @{ Name = "AWS access key"; Regex = '(?<![A-Z0-9])(?:AKIA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])' },
  @{ Name = "GitHub token"; Regex = '(?<![A-Za-z0-9_])gh[pousr]_[A-Za-z0-9]{36,}(?![A-Za-z0-9_])' },
  @{ Name = "credentialed PostgreSQL URL"; Regex = 'postgres(?:ql)?://[^\s:/]+:[^\s@]+@' },
  @{ Name = "literal AWS secret"; Regex = '(?i)aws_secret_access_key\s*[=:]\s*["''][^"'']+["'']' }
)

$findings = @()
foreach ($file in $files) {
  $lineNumber = 0
  foreach ($line in Get-Content -LiteralPath $file.FullName) {
    $lineNumber++
    foreach ($pattern in $patterns) {
      if ($line -match $pattern.Regex) {
        $relative = [System.IO.Path]::GetRelativePath($root, $file.FullName)
        $findings += "$relative`:$lineNumber ($($pattern.Name))"
      }
    }
  }
}

if ($findings.Count -gt 0) {
  $findings | ForEach-Object { Write-Error "Potential secret: $_" }
  exit 1
}

Write-Host "PEACEPAD_V2_INFRA_SECRET_SCAN_PASS ($($files.Count) files)"
