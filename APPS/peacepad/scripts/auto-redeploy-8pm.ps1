$ErrorActionPreference = 'Continue'

$root = 'C:\FTC HOLDING\APPS\peacepad'
$logDir = Join-Path $root 'logs'
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $logDir ("auto-redeploy-$timestamp.log")

function Write-Log {
    param([string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    $line | Tee-Object -FilePath $logFile -Append
}

Write-Log 'Starting scheduled PeacePad redeploy job.'
Set-Location $root

Write-Log 'Running Railway redeploy (auto-confirm enabled).'
$redeployOutput = cmd /c "echo y| railway redeploy --service \"@ftc/peacepad\" 2>&1"
$redeployOutput | Tee-Object -FilePath $logFile -Append | Out-Null

Write-Log 'Checking API health endpoint after redeploy attempt.'
$healthOutput = curl.exe -s -w "`nHTTP_STATUS: %{http_code}" https://api.peacepad.ca/api/health 2>&1
$healthOutput | Tee-Object -FilePath $logFile -Append | Out-Null

Write-Log 'Scheduled PeacePad redeploy job finished.'
