$ErrorActionPreference = 'Stop'

$chromeRoots = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" |
  Where-Object {
    $_.CommandLine -match '--remote-debugging-port=(\d+)' -and
    $_.CommandLine -match '--profile-directory=([^\s"]+|"[^"]+")'
  } |
  Select-Object ProcessId, CommandLine

$results = foreach ($proc in $chromeRoots) {
  $cmd = $proc.CommandLine
  $port = if ($cmd -match '--remote-debugging-port=(\d+)') { [int]$Matches[1] } else { $null }
  $profile = if ($cmd -match '--profile-directory="?([^"]+?)"?(?:\s--|\shttps?:|\s*$)') { $Matches[1].Trim() } else { '' }
  $userData = if ($cmd -match '--user-data-dir="?([^"]+?)"?(?:\s--|\shttps?:|\s*$)') { $Matches[1].Trim() } else { '' }

  $cdpReady = $false
  $browser = ''
  if ($port) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/json/version" -UseBasicParsing -TimeoutSec 1
      $cdpReady = $response.StatusCode -eq 200
      $browser = (($response.Content | ConvertFrom-Json).Browser)
    } catch {
      $cdpReady = $false
    }
  }

  [pscustomobject]@{
    ProcessId = $proc.ProcessId
    Port = $port
    CdpUrl = if ($port) { "http://127.0.0.1:$port" } else { '' }
    CdpReady = $cdpReady
    ProfileDirectory = $profile
    UserDataDir = $userData
    Browser = $browser
  }
}

if (-not $results) {
  Write-Host 'No controlled Chrome instance found. Open Chrome with --remote-debugging-port first.'
  exit 1
}

$results | Sort-Object CdpReady -Descending | Format-Table -AutoSize
