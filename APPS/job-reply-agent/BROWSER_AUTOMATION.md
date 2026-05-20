# Auto-Apply with Authenticated Browser

## Why This Matters
- **Problem:** Headless/fresh browser launches trigger bot detection (captcha, CF challenges)
- **Solution:** Connect to your already-authenticated browser session via remote debugging port

## Setup (One-time)

### Option 1: Use the batch script (Recommended)
1. Run: `scripts/launch-chrome-debug.bat`
2. Chrome will launch with remote debugging enabled on port 9222
3. Keep this window open while auto-apply runs
4. Sign in to Indeed (or any site you need)

### Option 2: Manual launch
```powershell
# Windows PowerShell
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

### Option 3: If you already have Chrome open
Close all Chrome windows, then launch with the debug port (Options 1 or 2).
Chrome can only open once with the same debugging port.

## Running Auto-Apply

```powershell
# Terminal 1: Launch Chrome with debug port
.\scripts\launch-chrome-debug.bat

# Terminal 2: Run auto-apply
cd "C:\FTC HOLDING\APPS\job-reply-agent"
npx tsx scripts/apply-top2-indeed.ts
```

The script will:
1. Try to connect to your Chrome session on localhost:9222
2. Use your existing authenticated session (cookies, etc.)
3. Complete applications without bot detection

## Troubleshooting

**"No existing browser found, launching fresh instance"**
- Confirm Chrome is running with `--remote-debugging-port=9222`
- Check: Visit `http://localhost:9222` in any browser to verify debugging port is open

**Still getting captcha**
- Make sure you're signed into Indeed in the Chrome window before running auto-apply
- The script uses your authenticated session from that window

**Chrome won't launch with debug port**
- Close all Chrome windows first (including background tasks)
- Close other Chromium-based browsers (Edge, Brave, etc.)
- Then re-launch with `--remote-debugging-port=9222`
