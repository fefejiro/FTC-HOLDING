param(
  [string]$TelegramToken = $env:TELEGRAM_BOT_TOKEN,
  [string]$TelegramChatId = $env:TELEGRAM_CHAT_ID
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[warn] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[error] $msg" -ForegroundColor Red }

function Resolve-RepoRoot {
  param([string]$StartPath)
  $candidate = (Resolve-Path $StartPath).Path
  while ($candidate -and -not (Test-Path (Join-Path $candidate "DOCS\\linkedin"))) {
    $parent = Split-Path -Parent $candidate
    if ($parent -eq $candidate) { $candidate = $null; break }
    $candidate = $parent
  }
  if (-not $candidate) { throw "Repo root not found (expected DOCS\\linkedin)." }
  return $candidate
}

function Assert-DedicatedBot {
  param([string]$Token)
  if (-not $Token) { return }
  if ($env:OPENCLAW_TELEGRAM_BOT_TOKEN -and $env:OPENCLAW_TELEGRAM_BOT_TOKEN -eq $Token) {
    Write-Err "TELEGRAM_BOT_TOKEN matches OPENCLAW_TELEGRAM_BOT_TOKEN. Use a dedicated bot for LinkedIn automation."
    exit 1
  }
  if ($env:OPENCLAW_BOT_TOKEN -and $env:OPENCLAW_BOT_TOKEN -eq $Token) {
    Write-Err "TELEGRAM_BOT_TOKEN matches OPENCLAW_BOT_TOKEN. Use a dedicated bot for LinkedIn automation."
    exit 1
  }
  $openclawConfigPath = Join-Path $env:USERPROFILE ".openclaw\\openclaw.json"
  if (Test-Path $openclawConfigPath) {
    try {
      $raw = Get-Content $openclawConfigPath -Raw
      if ($raw -match [regex]::Escape($Token)) {
        Write-Err "TELEGRAM_BOT_TOKEN appears in OpenClaw config. Use a dedicated bot for LinkedIn automation."
        exit 1
      }
    } catch {}
  }
}

function Ensure-LocalDir($path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

function Send-Telegram {
  param(
    [string]$Token,
    [string]$ChatId,
    [string]$Text
  )
  if (-not $Token -or -not $ChatId) { return }
  $uri = "https://api.telegram.org/bot$Token/sendMessage"
  $body = @{
    chat_id = $ChatId
    text = $Text
    disable_web_page_preview = $true
  }
  Invoke-RestMethod -Method Post -Uri $uri -Body $body | Out-Null
}

$RepoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot
$localStateDir = Join-Path $RepoRoot "DOCS\\linkedin\\.local"
$lastDigestPath = Join-Path $localStateDir "last_digest.json"
$approvalsStatePath = Join-Path $localStateDir "approvals_state.json"
$reminderStatePath = Join-Path $localStateDir "reminder_state.json"

Ensure-LocalDir $localStateDir

if (-not $TelegramToken -or -not $TelegramChatId) {
  Write-Err "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID"
  exit 1
}
Assert-DedicatedBot -Token $TelegramToken
if (-not (Test-Path $lastDigestPath)) {
  Write-Warn "Missing last digest state; nothing to remind."
  exit 0
}

$lastDigest = Get-Content $lastDigestPath | ConvertFrom-Json
$drafts = @($lastDigest.drafts)
if (-not $drafts -or $drafts.Count -eq 0) {
  Write-Info "No drafts in last digest."
  exit 0
}

$approvalState = @{
  date = $lastDigest.date
  decisions = @{}
}
if (Test-Path $approvalsStatePath) {
  try { $approvalState = Get-Content $approvalsStatePath | ConvertFrom-Json } catch {}
}

$decisions = @{}
if ($approvalState.date -eq $lastDigest.date -and $approvalState.decisions) {
  $decisions = $approvalState.decisions
}

$pending = $drafts.Count - ($decisions.PSObject.Properties.Count)
if ($pending -le 0) {
  Write-Info "No pending approvals."
  exit 0
}

$today = (Get-Date).ToString("yyyy-MM-dd")
$lastReminderDate = $null
if (Test-Path $reminderStatePath) {
  try { $lastReminderDate = (Get-Content $reminderStatePath | ConvertFrom-Json).lastReminderDate } catch {}
}

if ($lastReminderDate -eq $today) {
  Write-Info "Reminder already sent today."
  exit 0
}

$msg = "Reminder: $pending draft(s) still need review for $($lastDigest.date). Reply Approve # or Hold #."
Send-Telegram -Token $TelegramToken -ChatId $TelegramChatId -Text $msg

@{ lastReminderDate = $today } | ConvertTo-Json | Set-Content -Path $reminderStatePath -Encoding UTF8
Write-Info "Reminder sent."
