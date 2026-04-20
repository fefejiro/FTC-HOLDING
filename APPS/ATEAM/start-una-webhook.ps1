# Start ATEAM bridge for Una Labs webhook integration
# This script:
# 1. Starts the ATEAM bridge server on localhost:3001
# 2. Exposes it via cloudflared tunnel for external access
# 3. Prints the tunnel URL for configuration in the worker

# Set ATEAM_KEY secret (must match the value in worker secrets)
$env:ATEAM_KEY = "una_labs_webhook_secret_key_change_this"

# Set ATEAM_BRIDGE_PORT to 3001 for Una Labs integration
$env:ATEAM_BRIDGE_PORT = "3001"

Write-Host "Starting ATEAM bridge for Una Labs..." -ForegroundColor Cyan

# Start the bridge in a new window (non-blocking)
$bridgeProcess = Start-Process -NoNewWindow -PassThru node -ArgumentList "Server/bridge.js" -WorkingDirectory (Get-Location)

# Wait for bridge to start
Write-Host "Waiting for bridge to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Check if bridge started successfully
if ($bridgeProcess.HasExited) {
    Write-Host "ERROR: Bridge process exited immediately. Check Server/.env configuration." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Bridge started with PID $($bridgeProcess.Id)" -ForegroundColor Green
Write-Host ""

# Start cloudflared tunnel
Write-Host "Starting cloudflared tunnel..." -ForegroundColor Cyan
Write-Host ""

& "..\..\tmp-bin\cloudflared.exe" tunnel --url http://127.0.0.1:3001

Write-Host ""
Write-Host "Tunnel stopped. To update the worker:" -ForegroundColor Yellow
Write-Host "  npx wrangler secret put UNALABS_NEW_PROJECT_WEBHOOK_URL" -ForegroundColor White
Write-Host "  (paste the tunnel URL from above + /webhook/intake)" -ForegroundColor Gray
Write-Host ""
Write-Host "Example:" -ForegroundColor Gray
Write-Host "  https://abc123.trycloudflare.com/webhook/intake" -ForegroundColor Gray
