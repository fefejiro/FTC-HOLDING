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
$runDate = Get-Date -Format 'yyyy-MM-dd'
$proofDir = Join-Path (Join-Path $ProjectDir 'content\proof') $runDate
New-Item -ItemType Directory -Force -Path $proofDir | Out-Null
$statusPath = Join-Path $proofDir 'schedule-run-status.json'
$stage = 'starting'

function Write-RunStatus {
  param(
    [int]$ExitCode,
    [string]$Status = 'running'
  )
  $payload = [ordered]@{
    runDate = $runDate
    status = $Status
    exitCode = $ExitCode
    stage = $stage
    channels = $Channels
    logPath = $logPath
    updatedAt = (Get-Date -Format o)
  }
  $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statusPath -Encoding UTF8
}

Push-Location $ProjectDir
try {
  Write-RunStatus -ExitCode 0 -Status 'running'
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

  if ($AllowScheduledPublish) {
    $env:UNA_SANDBOX_AUTOPUBLISH = '1'
    "[$(Get-Date -Format o)] Una Labs sandbox autopublish policy enabled. Accepted fallback visuals may continue, while factual, caption, source, and low-score failures still stop the run." | Tee-Object -FilePath $logPath -Append
  }

  if ($CaptionOnly) {
    $stage = 'caption'
    Write-RunStatus -ExitCode 0 -Status 'running'
    "[$(Get-Date -Format o)] Caption-only mode enabled. No image generation, no OpenAI call, no browser publish." | Tee-Object -FilePath $logPath -Append
    npm run caption:write 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
    Write-RunStatus -ExitCode $exit -Status $(if ($exit -eq 0) { 'caption_complete' } else { 'failed' })
    "[$(Get-Date -Format o)] Una Labs caption-only workflow finished with exit code $exit" | Tee-Object -FilePath $logPath -Append
    exit $exit
  }

  $draftArgs = @('run', 'draft:regional')
  if ($ForceNew) {
    $draftArgs += @('--', '--force-new')
  }
  $stage = 'draft_regional'
  Write-RunStatus -ExitCode 0 -Status 'running'
  npm @draftArgs 2>&1 | Tee-Object -FilePath $logPath -Append
  $exit = $LASTEXITCODE
  if ($exit -eq 0) {
    $stage = 'visual_newsroom'
    Write-RunStatus -ExitCode 0 -Status 'running'
    "[$(Get-Date -Format o)] Una Labs visual newsroom render starting" | Tee-Object -FilePath $logPath -Append
    npm run visual:today 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  if ($exit -eq 0) {
    $stage = 'quality_check'
    Write-RunStatus -ExitCode 0 -Status 'running'
    "[$(Get-Date -Format o)] Una Labs social quality check starting" | Tee-Object -FilePath $logPath -Append
    npm run quality:today 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  if ($exit -eq 0) {
    $stage = 'linkedin_preview'
    Write-RunStatus -ExitCode 0 -Status 'running'
    "[$(Get-Date -Format o)] Una Labs LinkedIn preview render starting" | Tee-Object -FilePath $logPath -Append
    npm run preview:linkedin 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  if ($DraftOnly) {
    Write-RunStatus -ExitCode $exit -Status $(if ($exit -eq 0) { 'draft_ready_publish_skipped' } else { 'failed' })
    "[$(Get-Date -Format o)] Draft-only mode enabled. Package and quality proof created; browser publish skipped." | Tee-Object -FilePath $logPath -Append
    "[$(Get-Date -Format o)] Una Labs social draft workflow finished with exit code $exit" | Tee-Object -FilePath $logPath -Append
    exit $exit
  }
  if ($exit -eq 0) {
    $stage = 'visible_publish'
    Write-RunStatus -ExitCode 0 -Status 'running'
    "[$(Get-Date -Format o)] Una Labs visible Chrome publish starting" | Tee-Object -FilePath $logPath -Append
    if ($AllowScheduledPublish) {
      $env:UNA_ALLOW_UNAPPROVED_POST = '1'
      "[$(Get-Date -Format o)] Scheduled publish override enabled after quality gates passed." | Tee-Object -FilePath $logPath -Append
    }
    npm run publish:visible -- --channels $Channels 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }
  Write-RunStatus -ExitCode $exit -Status $(if ($exit -eq 0) { 'complete' } else { 'failed' })
  "[$(Get-Date -Format o)] Una Labs social daily workflow finished with exit code $exit" | Tee-Object -FilePath $logPath -Append
  exit $exit
}
catch {
  $message = $_.Exception.Message
  "[$(Get-Date -Format o)] Una Labs social daily workflow failed at stage ${stage}: $message" | Tee-Object -FilePath $logPath -Append
  Write-RunStatus -ExitCode 1 -Status 'failed'
  exit 1
}
finally {
  Pop-Location
}
