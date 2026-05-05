$ErrorActionPreference = "Stop"
$links = @(
  "https://example.com/job-2"
  "https://example.com/job-3"
  "https://example.com/job-1"
)
foreach ($url in $links) {
  if (-not [string]::IsNullOrWhiteSpace($url)) {
    Start-Process $url
  }
}
Write-Host "Opened top job links in your default browser."