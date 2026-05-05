param(
  [string]$TelegramToken = $env:TELEGRAM_BOT_TOKEN,
  [string]$TelegramChatId = $env:TELEGRAM_CHAT_ID
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }
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
  }
  Invoke-RestMethod -Method Post -Uri $uri -Body $body | Out-Null
}

function Answer-Callback {
  param(
    [string]$Token,
    [string]$CallbackId,
    [string]$Text
  )
  if (-not $Token -or -not $CallbackId) { return }
  $uri = "https://api.telegram.org/bot$Token/answerCallbackQuery"
  $body = @{
    callback_query_id = $CallbackId
    text = $Text
    show_alert = $false
  }
  Invoke-RestMethod -Method Post -Uri $uri -Body $body | Out-Null
}

$RepoRoot = Resolve-RepoRoot -StartPath $PSScriptRoot
$localStateDir = Join-Path $RepoRoot "DOCS\\linkedin\\.local"
$statePath = Join-Path $localStateDir "telegram_state.json"
$lastDigestPath = Join-Path $localStateDir "last_digest.json"
$approvalsStatePath = Join-Path $localStateDir "approvals_state.json"
$queuePath = Join-Path $RepoRoot "DOCS\\linkedin\\UNALABS_POST_QUEUE_LOG.md"

Ensure-LocalDir $localStateDir

if (-not $TelegramToken) { Write-Err "Missing TELEGRAM_BOT_TOKEN"; exit 1 }
if (-not (Test-Path $lastDigestPath)) { Write-Err "Missing last digest state: $lastDigestPath"; exit 1 }

$lastDigest = Get-Content $lastDigestPath | ConvertFrom-Json
$drafts = @($lastDigest.drafts)
if (-not $drafts -or $drafts.Count -eq 0) {
  Write-Err "No drafts found in last digest."
  exit 1
}

$approvalState = @{
  date = $lastDigest.date
  decisions = @{}
}
if (Test-Path $approvalsStatePath) {
  try {
    $existing = Get-Content $approvalsStatePath | ConvertFrom-Json
    if ($existing.date -eq $lastDigest.date) {
      $approvalState = $existing
    }
  } catch {}
}

$offset = 0
if (Test-Path $statePath) {
  try { $offset = (Get-Content $statePath | ConvertFrom-Json).lastUpdateId } catch { $offset = 0 }
}

$updatesUri = "https://api.telegram.org/bot$TelegramToken/getUpdates?timeout=5&offset=$offset"
try {
  $updates = Invoke-RestMethod -Uri $updatesUri -Method Get
} catch {
  if ($_.Exception.Message -match "409") {
    Write-Err "Telegram getUpdates conflict (409). Another bot process is polling. Stop the other poller and retry."
    exit 1
  }
  throw
}
if (-not $updates.ok) { Write-Err "Telegram getUpdates failed"; exit 1 }

if (-not $TelegramChatId) {
  $lastChat = $updates.result | Select-Object -Last 1
  if ($lastChat.message.chat.id) {
    Write-Info "Detected chat id: $($lastChat.message.chat.id)"
  } elseif ($lastChat.callback_query.message.chat.id) {
    Write-Info "Detected chat id: $($lastChat.callback_query.message.chat.id)"
  }
}

foreach ($update in $updates.result) {
  $offset = [int]$update.update_id + 1

  $action = $null
  $index = $null
  $chatId = $null

  if ($update.callback_query) {
    $data = $update.callback_query.data
    $chatId = $update.callback_query.message.chat.id
    if ($data -match "^(approve|hold):(\d+)$") {
      $action = $matches[1]
      $index = [int]$matches[2]
      Answer-Callback -Token $TelegramToken -CallbackId $update.callback_query.id -Text "Recorded"
    }
  } elseif ($update.message -and $update.message.text) {
    $text = $update.message.text.ToLower()
    $chatId = $update.message.chat.id
    if ($text -match "approve\s*#?\s*(\d+)") {
      $action = "approve"
      $index = [int]$matches[1]
    } elseif ($text -match "hold\s*#?\s*(\d+)") {
      $action = "hold"
      $index = [int]$matches[1]
    }
  }

  if (-not $action -or -not $index) { continue }
  if ($TelegramChatId -and ($chatId -ne [long]$TelegramChatId)) { continue }
  if ($index -lt 1 -or $index -gt $drafts.Count) { continue }

  $draft = $drafts[$index - 1]
  $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm")

  if ($action -eq "approve") {
    $entry = @"
## $timestamp - Approved Draft $index (Digest $($lastDigest.date))
Status: READY TO SCHEDULE

**Headline:** $($draft.headline)

**Post:**
$($draft.post)

**Alt:**
$($draft.alt)

**Image idea:** $($draft.imageIdea)

"@
    Add-Content -Path $queuePath -Value $entry
    Send-Telegram -Token $TelegramToken -ChatId $chatId -Text "Approved draft $index. Added to queue."
    $approvalState.decisions["$index"] = "approve"
  } else {
    Send-Telegram -Token $TelegramToken -ChatId $chatId -Text "Held draft $index. Kept in drafts."
    $approvalState.decisions["$index"] = "hold"
  }
}

$approvalState | ConvertTo-Json -Depth 6 | Set-Content -Path $approvalsStatePath -Encoding UTF8
@{ lastUpdateId = $offset } | ConvertTo-Json | Set-Content -Path $statePath -Encoding UTF8

Write-Info "Approvals check complete."
