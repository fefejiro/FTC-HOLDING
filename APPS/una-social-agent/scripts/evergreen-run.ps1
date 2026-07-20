param(
  [string]$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Slot = 'evergreen',
  [string]$Mode = 'tip',
  [string]$Channels = 'instagram,linkedin',
  [switch]$ForceNew,
  [switch]$DraftOnly,
  [switch]$AllowScheduledPublish
)

$ErrorActionPreference = 'Stop'

$logDir = Join-Path $ProjectDir 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runDate = Get-Date -Format 'yyyy-MM-dd'
$logPath = Join-Path $logDir "evergreen-$Slot-$stamp.log"
$proofDir = Join-Path (Join-Path (Join-Path $ProjectDir 'content\proof') $runDate) $Slot
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
    slot = $Slot
    mode = $Mode
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
  "[$(Get-Date -Format o)] Una Labs evergreen workflow starting for slot: $Slot mode: $Mode channels: $Channels" | Tee-Object -FilePath $logPath

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
  }

  $draftArgs = @('run', 'draft:evergreen', '--', '--slot', $Slot, '--mode', $Mode)
  if ($ForceNew) {
    $draftArgs += '--force-new'
  }

  $stage = 'draft_evergreen'
  Write-RunStatus -ExitCode 0 -Status 'running'
  npm @draftArgs 2>&1 | Tee-Object -FilePath $logPath -Append
  $exit = $LASTEXITCODE

  if ($exit -eq 0) {
    $stage = 'render_evergreen'
    Write-RunStatus -ExitCode 0 -Status 'running'
    npm run preview:evergreen -- --slot $Slot 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }

  if ($exit -eq 0) {
    $stage = 'quality_evergreen'
    Write-RunStatus -ExitCode 0 -Status 'running'
    npm run quality:evergreen -- --slot $Slot 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }

  if ($DraftOnly) {
    Write-RunStatus -ExitCode $exit -Status $(if ($exit -eq 0) { 'draft_ready_publish_skipped' } else { 'failed' })
    "[$(Get-Date -Format o)] Draft-only mode enabled. Evergreen package created; publish skipped." | Tee-Object -FilePath $logPath -Append
    exit $exit
  }

  if ($exit -eq 0) {
    $stage = 'visible_publish'
    Write-RunStatus -ExitCode 0 -Status 'running'
    if ($AllowScheduledPublish) {
      $env:UNA_ALLOW_UNAPPROVED_POST = '1'
    }
    npm run publish:visible -- --date $runDate --slot $Slot --channels $Channels 2>&1 | Tee-Object -FilePath $logPath -Append
    $exit = $LASTEXITCODE
  }

  Write-RunStatus -ExitCode $exit -Status $(if ($exit -eq 0) { 'complete' } else { 'failed' })
  "[$(Get-Date -Format o)] Una Labs evergreen workflow finished with exit code $exit" | Tee-Object -FilePath $logPath -Append
  exit $exit
}
catch {
  $message = $_.Exception.Message
  "[$(Get-Date -Format o)] Una Labs evergreen workflow failed at stage ${stage}: $message" | Tee-Object -FilePath $logPath -Append
  Write-RunStatus -ExitCode 1 -Status 'failed'
  exit 1
}
finally {
  Pop-Location
}
