# Daily Job Agent Run
# Scans inbox -> drafts replies -> approves -> sends -> emails morning report
$ErrorActionPreference = "Continue"
$root = "C:\FTC HOLDING\APPS\job-reply-agent"
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd"
$log = Join-Path $logDir "daily-$stamp.log"

function Run-Step($label, $cmd) {
  "=== $label ($(Get-Date -Format 'HH:mm:ss')) ===" | Tee-Object -FilePath $log -Append
  Push-Location $root
  try {
    & cmd /c $cmd 2>&1 | Tee-Object -FilePath $log -Append
  } finally {
    Pop-Location
  }
}

Run-Step "1. Scan + Draft" "npm run process:gmail"
Run-Step "2. Approve drafts" "npm run approve:all"
Run-Step "3. Send approved" "npm run send:approved:gmail"
Run-Step "4. Morning report" "npm run report"

"=== Done $(Get-Date -Format 'HH:mm:ss') ===" | Tee-Object -FilePath $log -Append
