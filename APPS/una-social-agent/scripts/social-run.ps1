param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$ForceNew,
  [string]$Channels = 'instagram,linkedin'
)

$ErrorActionPreference = 'Stop'

$logDir = Join-Path $ProjectDir 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDir "daily-draft-$stamp.log"
Push-Location $ProjectDir
try {
  "[$(Get-Date -Format o)] Una Labs social daily workflow starting" | Tee-Object -FilePath $logPath
  $draftArgs = @('run', 'draft:today')
  if ($ForceNew) {
    $draftArgs += @('--', '--force-new')
  }
  npm @draftArgs 2>&1 | Tee-Object -FilePath $logPath -Append
  $exit = $LASTEXITCODE
  if ($exit -eq 0) {
    "[$(Get-Date -Format o)] Una Labs social quality check starting" | Tee-Object -FilePath $logPath -Append
    npm run quality:today 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  if ($exit -eq 0) {
    "[$(Get-Date -Format o)] Una Labs visible Chrome publish starting" | Tee-Object -FilePath $logPath -Append
    npm run publish:visible -- --channels $Channels 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  "[$(Get-Date -Format o)] Una Labs social daily workflow finished with exit code $exit" | Tee-Object -FilePath $logPath -Append
  exit $exit
}
finally {
  Pop-Location
}
