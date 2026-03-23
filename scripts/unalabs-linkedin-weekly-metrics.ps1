param(
  [string]$MetricsPath = "DOCS/linkedin/UNALABS_LINKEDIN_WEEKLY_METRICS.md"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MetricsPath)) {
  $header = @"
# Una Labs LinkedIn Weekly Metrics

| Week Ending | Impressions | Engagement Rate | Followers Gained | Top Topic | Notes |
|---|---|---|---|---|---|

"@
  Set-Content -Path $MetricsPath -Value $header -Encoding UTF8
}

$weekEnding = Read-Host "Week ending (YYYY-MM-DD)"
$impressions = Read-Host "Impressions"
$engagement = Read-Host "Engagement rate (e.g., 3.2%)"
$followers = Read-Host "Followers gained"
$topTopic = Read-Host "Top topic"
$notes = Read-Host "Notes (optional)"

$row = "| $weekEnding | $impressions | $engagement | $followers | $topTopic | $notes |"
Add-Content -Path $MetricsPath -Value $row

Write-Host "Metrics appended to $MetricsPath" -ForegroundColor Cyan
