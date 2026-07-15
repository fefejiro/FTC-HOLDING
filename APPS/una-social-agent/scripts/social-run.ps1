param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch]$ForceNew,
  [string]$Channels = 'instagram,linkedin',
  [switch]$CaptionOnly,
  [switch]$DraftOnly,
  [switch]$AllowScheduledPublish
)

$ErrorActionPreference = 'Stop'

$logDir = Join-Path $ProjectDir 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logPath = Join-Path $logDir "daily-draft-$stamp.log"
Push-Location $ProjectDir
try {
  "[$(Get-Date -Format o)] Una Labs social daily workflow starting for channels: $Channels" | Tee-Object -FilePath $logPath

  $envPath = Join-Path $ProjectDir '.env.local'
  if (Test-Path -LiteralPath $envPath) {
    Get-Content -LiteralPath $envPath | ForEach-Object {
      if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
      $parts = $_ -split '=', 2
      $name = $parts[0].Trim()
      $value = $parts[1].Trim()
      if ($name -and -not [Environment]::GetEnvironmentVariable($name, 'Process')) {
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
      }
    }
    "[$(Get-Date -Format o)] Loaded local environment keys from .env.local for this run." | Tee-Object -FilePath $logPath -Append
  }

  if ($CaptionOnly) {
    "[$(Get-Date -Format o)] Caption-only mode enabled. No image generation, no OpenAI call, no browser publish." | Tee-Object -FilePath $logPath -Append
    npm run caption:write 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
    "[$(Get-Date -Format o)] Una Labs caption-only workflow finished with exit code $exit" | Tee-Object -FilePath $logPath -Append
    exit $exit
  }

  $draftArgs = @('run', 'draft:regional')
  if ($ForceNew) {
    $draftArgs += @('--', '--force-new')
  }
  npm @draftArgs 2>&1 | Tee-Object -FilePath $logPath -Append
  $exit = $LASTEXITCODE
  if ($exit -eq 0) {
    "[$(Get-Date -Format o)] Una Labs visual newsroom render starting" | Tee-Object -FilePath $logPath -Append
    npm run visual:today 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  if ($exit -eq 0) {
    "[$(Get-Date -Format o)] Una Labs social quality check starting" | Tee-Object -FilePath $logPath -Append
    npm run quality:today 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  if ($exit -eq 0) {
    "[$(Get-Date -Format o)] Una Labs LinkedIn preview render starting" | Tee-Object -FilePath $logPath -Append
    npm run preview:linkedin 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  if ($DraftOnly) {
    "[$(Get-Date -Format o)] Draft-only mode enabled. Package and quality proof created; browser publish skipped." | Tee-Object -FilePath $logPath -Append
    "[$(Get-Date -Format o)] Una Labs social draft workflow finished with exit code $exit" | Tee-Object -FilePath $logPath -Append
    exit $exit
  }
  if ($exit -eq 0) {
    "[$(Get-Date -Format o)] Una Labs visible Chrome publish starting" | Tee-Object -FilePath $logPath -Append
    if ($AllowScheduledPublish) {
      $env:UNA_ALLOW_UNAPPROVED_POST = '1'
      "[$(Get-Date -Format o)] Scheduled publish override enabled after quality gates passed." | Tee-Object -FilePath $logPath -Append
    }
    npm run publish:visible -- --channels $Channels 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  "[$(Get-Date -Format o)] Una Labs social daily workflow finished with exit code $exit" | Tee-Object -FilePath $logPath -Append
  exit $exit
}
finally {
  Pop-Location
}
