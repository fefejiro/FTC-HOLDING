$ErrorActionPreference = "Stop"
$links = @(
  "https://www.google.com/search?q=Project%20Manager-Agile%20micro1%20job"
  "https://www.google.com/search?q=5%20Roles%3A%20100%25%20Remote%3A%20Business%20Systems%20Analyst%20with%20ERP%20FullStory%20job"
  "https://www.google.com/search?q=Sr%20IT%20BSA%20Cozydesk%20job"
  "https://www.google.com/search?q=IT%20Agile%20Project%20Manager-(AWS)%20RELQ%20TECHNOLOGIES%20LLC%20job"
  "https://www.google.com/search?q=Scrum%20Master%20(Exp%20in%20Medical%20Device%20or%20Healthcare%20Industry)%20Remote%20Salesforce%20job"
  "https://www.google.com/search?q=IT%20PM%20(ERP)%20Lattice%20job"
  "https://www.google.com/search?q=IT%20Business%20Analyst%20%2F%20Project%20Manager%20(Agile%2C%20ERP%2C%20Security%20%26%20Compliance)%20Cozydesk%20job"
  "https://www.google.com/search?q=Technical%20Analyst%20ERP%20-%20Business%20Analyst%20Vantix%20Systems%20Inc%20job"
)
foreach ($url in $links) {
  if (-not [string]::IsNullOrWhiteSpace($url)) {
    Start-Process $url
  }
}
Write-Host "Opened top job links in your default browser."