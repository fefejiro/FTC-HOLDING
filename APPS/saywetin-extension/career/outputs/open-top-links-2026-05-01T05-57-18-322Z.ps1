$ErrorActionPreference = "Stop"
$links = @(
  "https://remotive.com/remote-jobs/writing/freelance-writer-1185979"
  "https://remotive.com/remote-jobs/operations/operations-software-assistant-2090000"
  "https://remotive.com/remote-jobs/customer-service/customer-retention-manager-2088656"
  "https://remotive.com/remote-jobs/customer-service/customer-support-representative-2088655"
  "https://remotive.com/remote-jobs/software-development/tech-lead-full-stack-rails-engineer-2069746"
  "https://remotive.com/remote-jobs/all-others/online-data-analyst-united-states-2088710"
  "https://remotive.com/remote-jobs/marketing/office-assistant-1680495"
  "https://remotive.com/remote-jobs/software-development/senior-staff-software-engineer-php-ts-rust-kotlin-m-w-d-2088708"
)
foreach ($url in $links) {
  if (-not [string]::IsNullOrWhiteSpace($url)) {
    Start-Process $url
  }
}
Write-Host "Opened top job links in your default browser."