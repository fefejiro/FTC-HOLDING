# URGENT: Next Steps for Mike

## ✅ CODE BUILD: COMPLETE

All implementation done. ATEAM now:
- Receives post-payment webhooks from Stripe Worker
- Calls Claude Sonnet 4.6 API to generate project briefs
- Writes 3 milestones to Supabase automatically
- Sends kickoff email to client + notification to you

---

## ⏳ BLOCKING: Get 2 Credentials (5 minutes total)

### 1. Anthropic API Key
```
Go to: https://console.anthropic.com/account/keys
Click "Create Key"
Copy the key (format: sk-ant-v2-...)
Add to: APPS/ATEAM/Server/.env
Line: ANTHROPIC_API_KEY=sk-ant-v2-YOUR_KEY_HERE
```

### 2. Supabase Service Role Key
```
Go to: https://app.supabase.com/project/aaaextkrfoqomzmjjkxe/settings/api
Find: "SERVICE ROLE KEY" (NOT anon key)
Copy the token (long JWT starting with eyJ...)
Add to: APPS/ATEAM/Server/.env
Line: SUPABASE_SERVICE_KEY=eyJ0eXAi...YOUR_TOKEN_HERE
```

---

## 🚀 THEN: 5 Deployment Steps (30 minutes total)

### Step 1: Deploy Worker Secrets
```powershell
Set-Location "c:\FTC HOLDING\workers\stripe-api"
cmd /c "echo una_labs_webhook_sk_change_me_to_real_secret" | npx wrangler secret put ATEAM_KEY
npx wrangler deploy
```

### Step 2: Get Tunnel URL
```powershell
cd "C:\FTC HOLDING\APPS\ATEAM"
.\start-una-webhook.ps1
# Wait for output:
# Route: https://xyz789.trycloudflare.com -> http://127.0.0.1:3001
# Copy the URL
```

### Step 3: Set Webhook URL in Worker
```powershell
# Ctrl+C to stop previous (or new terminal)
Set-Location "c:\FTC HOLDING\workers\stripe-api"
cmd /c "echo https://xyz789.trycloudflare.com/webhook/intake" | npx wrangler secret put UNALABS_NEW_PROJECT_WEBHOOK_URL
npx wrangler deploy
```

### Step 4: Start Bridge (Keep Running)
```powershell
# In a terminal you'll keep open
cd "C:\FTC HOLDING\APPS\ATEAM"
.\start-una-webhook.ps1
# This keeps the bridge + tunnel running
```

### Step 5: Test
```powershell
# In a NEW terminal
cd "C:\FTC HOLDING\APPS\ATEAM"
node test-una-webhook.js https://xyz789.trycloudflare.com/webhook/intake una_labs_webhook_sk_change_me_to_real_secret
```

---

## ✓ SUCCESS LOOKS LIKE

**Terminal Output:**
```
[ATEAM-INTAKE] New subscription: test@example.com — starter (monthly)
[ATEAM-INTAKE] Calling Claude API for brief generation
[ATEAM-INTAKE] Writing 3 milestones to Supabase
[ATEAM-INTAKE] Sending kickoff email to test@example.com
[ATEAM-INTAKE] ✓ Completed for test@example.com
```

**Supabase:**
```sql
SELECT * FROM projects WHERE email = 'test@example.com';
-- status should be: scoping

SELECT * FROM milestones WHERE project_id = (SELECT id FROM projects WHERE email = 'test@example.com');
-- should have 3 rows
```

**Email:**
- To: test@example.com — Subject: "Your starter project is being scoped"
- To: hello@unalabs.cloud — Subject: "✓ Intake processed: test@example.com"

---

## 📖 Documentation

- Full setup guide: `DOCS/UNALABS_ATEAM_WEBHOOK_INTEGRATION.md` (400+ lines)
- Build complete summary: `DOCS/UNALABS_ATEAM_BUILD_COMPLETE.md` (300+ lines)
- Bridge handler code: `APPS/ATEAM/Server/bridge.js` (production-grade)

---

## 🎯 THEN: Live Test

Once test harness passes:

1. Open: https://unalabs.cloud/start
2. Fill intake form
3. Choose plan
4. Complete payment (test card: 4242 4242 4242 4242)
5. Wait 15s
6. Check email inbox for kickoff message
7. Check https://unalabs.cloud/login → dashboard for milestones

---

## 🔄 RETRY: If Test Fails

### "401 Unauthorized"
→ ATEAM_KEY mismatch between `.env` and worker secrets  
→ Check both are exactly the same

### "Claude API error: 401"
→ Anthropic key invalid  
→ Verify at https://console.anthropic.com/account/keys

### "Supabase error: 403"
→ Using wrong Supabase key (anon instead of service role)  
→ Go to https://app.supabase.com/.../settings/api and use SERVICE ROLE KEY

### "Connection refused"
→ Bridge not running  
→ Run: `cd APPS\ATEAM && .\start-una-webhook.ps1`

---

## 🚨 CRITICAL REMINDERS

- ✓ Bridge must stay running (terminal open) for production
- ✓ ATEAM_KEY must be the same in `.env` AND worker secrets
- ✓ Use SERVICE ROLE key from Supabase (not anon key)
- ✓ Deploy worker AFTER setting secrets
- ✓ Each tunnel session gets new URL (need to re-set UNALABS_NEW_PROJECT_WEBHOOK_URL after restarting bridge)

---

## 💾 SAVE THIS

Files to keep handy:
- `APPS/ATEAM/Server/.env` — your credentials live here
- `start-una-webhook.ps1` — run this to start everything
- `test-una-webhook.js` — use this to verify

---

**Status: READY FOR DEPLOYMENT**  
**Blockers: 0 (just need 2 keys)**  
**Estimated Time to Live: 45 minutes**
