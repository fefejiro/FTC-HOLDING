param(
  [string]$TelegramToken,
  [string]$TelegramChatId,
  [switch]$NoPersist
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[info] $msg" -ForegroundColor Cyan }

if (-not $TelegramToken) {
  $TelegramToken = Read-Host "Telegram bot token"
}
if (-not $TelegramChatId) {
  $TelegramChatId = Read-Host "Telegram chat id"
}

$env:TELEGRAM_BOT_TOKEN = $TelegramToken
$env:TELEGRAM_CHAT_ID = $TelegramChatId

Write-Info "Set session env vars."

if (-not $NoPersist) {
  Write-Info "Persisting env vars for future shells..."
  setx TELEGRAM_BOT_TOKEN "$TelegramToken" | Out-Null
  setx TELEGRAM_CHAT_ID "$TelegramChatId" | Out-Null
  Write-Info "Done. Open a new PowerShell window to pick up persisted values."
}
