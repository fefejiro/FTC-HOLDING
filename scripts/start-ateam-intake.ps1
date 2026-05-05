# start-ateam-intake.ps1
# Run this each session to wire ATEAM to the Una Labs intake webhook.
# Usage: .\scripts\start-ateam-intake.ps1
# Keep this terminal open — the bridge and tunnel stay alive while it runs.

$RepoRoot = Split-Path $PSScriptRoot -Parent
$BridgeDir = Join-Path $RepoRoot "APPS\ATEAM"
$WorkerDir = Join-Path $RepoRoot "workers\stripe-api"
$Cloudflared = Join-Path $RepoRoot "tmp-bin\cloudflared.exe"

Write-Host "`n[1/3] Starting ATEAM bridge..." -ForegroundColor Cyan
$bridge = Start-Process -FilePath "node" -ArgumentList "Server/bridge.js" `
  -WorkingDirectory $BridgeDir -PassThru -NoNewWindow
Write-Host "      Bridge PID: $($bridge.Id)" -ForegroundColor Green
Start-Sleep -Seconds 2

Write-Host "`n[2/3] Starting cloudflared tunnel..." -ForegroundColor Cyan
$tunnelOutput = Join-Path $env:TEMP "cloudflared-output.txt"
$tunnel = Start-Process -FilePath $Cloudflared `
  -ArgumentList "tunnel --url http://127.0.0.1:3001" `
  -RedirectStandardError $tunnelOutput -PassThru -NoNewWindow
Start-Sleep -Seconds 6

# Parse tunnel URL from output
$tunnelUrl = ""
for ($i = 0; $i -lt 10; $i++) {
  $content = Get-Content $tunnelOutput -Raw -ErrorAction SilentlyContinue
  if ($content -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
    $tunnelUrl = $Matches[0]
    break
  }
  Start-Sleep -Seconds 2
}

if (-not $tunnelUrl) {
  Write-Host "      Could not detect tunnel URL. Check output above." -ForegroundColor Red
  Write-Host "      Set the webhook URL manually:" -ForegroundColor Yellow
  Write-Host "      cmd /c `"echo https://YOUR-TUNNEL.trycloudflare.com/webhook/intake`" | npx wrangler secret put UNALABS_NEW_PROJECT_WEBHOOK_URL" -ForegroundColor Yellow
  exit 1
}

$webhookUrl = "$tunnelUrl/webhook/intake"
Write-Host "      Tunnel URL: $tunnelUrl" -ForegroundColor Green
Write-Host "      Webhook URL: $webhookUrl" -ForegroundColor Green

Write-Host "`n[3/3] Setting webhook secret in Cloudflare Worker..." -ForegroundColor Cyan
Set-Location $WorkerDir
cmd /c "echo $webhookUrl" | npx wrangler secret put UNALABS_NEW_PROJECT_WEBHOOK_URL

Write-Host "`n✓ ATEAM intake wire is live." -ForegroundColor Green
Write-Host "  Briefs saved to: APPS\ATEAM\intake-briefs\" -ForegroundColor White
Write-Host "  Log file:        APPS\ATEAM\intake-log.jsonl" -ForegroundColor White
Write-Host "`n  Press Ctrl+C to stop.`n" -ForegroundColor Gray

# Keep script alive while bridge and tunnel run
try {
  Wait-Process -Id $bridge.Id
} catch {
  Write-Host "`nBridge stopped." -ForegroundColor Yellow
}
