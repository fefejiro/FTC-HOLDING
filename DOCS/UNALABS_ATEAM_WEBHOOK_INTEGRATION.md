# Una Labs → ATEAM Webhook Integration — Complete Setup Guide

**Status:** Ready to deploy  
**Last updated:** 2026-04-19  
**Purpose:** Wire post-payment intake (Stripe checkout completion) to ATEAM for automatic project scoping

---

## Overview

When a client completes Stripe checkout on unalabs.cloud:
1. **Stripe Worker** receives completion → writes project to Supabase → **calls ATEAM webhook**
2. **ATEAM Bridge** receives webhook → **calls Claude API** → generates project scope
3. **Claude** reads client intake data → generates 3 milestones + kickoff question
4. **ATEAM** writes milestones to Supabase → updates project status → **sends emails**
5. **Client** gets kickoff email with scope + milestones + dashboard link
6. **Mike** gets notification email with generated brief

Result: Real project scope in Supabase + client dashboard within seconds of payment.

---

## Files Changed/Created

### 1. **ATEAM Bridge Handler** (MODIFIED)
- **File:** `APPS/ATEAM/Server/bridge.js`
- **Changes:**
  - Replaced basic intake logging with full webhook handler
  - Added `POST /webhook/intake` endpoint with Authorization validation
  - Integrated with Anthropic API (Claude Sonnet 4.6)
  - Integrated with Supabase (fetch intake, write milestones, update status)
  - Integrated with Mailjet (client kickoff + Mike notification)
  - All async, responds immediately, processing runs in background

### 2. **Server Env Configuration** (MODIFIED)
- **File:** `APPS/ATEAM/Server/.env`
- **New vars added:**
  - `ANTHROPIC_API_KEY` — Claude API key
  - `SUPABASE_URL` — Supabase project URL
  - `SUPABASE_SERVICE_KEY` — Service role key (for writing)
  - `MAILJET_API_KEY` — Email service API key
  - `MAILJET_SECRET_KEY` — Email service secret
  - `ATEAM_KEY` — Shared secret (must match worker)

### 3. **Stripe Worker** (MODIFIED)
- **File:** `workers/stripe-api/src/index.ts`
- **Changes:**
  - Added `ATEAM_KEY` to `Env` interface
  - Updated webhook delivery to include `Authorization: Bearer ${ATEAM_KEY}` header
  - (No changes needed to deployment flow — deploy normally)

### 4. **Startup Script** (NEW)
- **File:** `APPS/ATEAM/start-una-webhook.ps1`
- **Purpose:** Start bridge + cloudflared tunnel for production setup
- **Usage:** Run from ATEAM directory

### 5. **Test Harness** (NEW)
- **File:** `APPS/ATEAM/test-una-webhook.js`
- **Purpose:** Simulate a Stripe webhook for testing
- **Usage:** `node test-una-webhook.js [url] [ateam_key]`

---

## Environment Variable Setup

### ALREADY SET (In ATEAM/Server/.env)
- `MAILJET_API_KEY` = `b42826c9a2cb400e51a1c9c0a6f3c4f0`
- `MAILJET_SECRET_KEY` = `bcc4463b71eb27a559ec35182bb8bc01`
- `SUPABASE_URL` = `https://aaaextkrfoqomzmjjkxe.supabase.co`

### NEED TO BE SET
Before running the bridge, add these to `APPS/ATEAM/Server/.env`:

#### 1. **Anthropic API Key** (Claude)
**How to get:**
```bash
# Go to https://console.anthropic.com/account/keys
# Create new API key
# Copy it
```

**Add to .env:**
```bash
ANTHROPIC_API_KEY=sk-ant-v2-YOUR_KEY_HERE
```

#### 2. **Supabase Service Role Key**
**How to get:**
```bash
# Go to https://app.supabase.com/project/aaaextkrfoqomzmjjkxe/settings/api
# Under "Project API keys", copy the SERVICE ROLE KEY (NOT anon key)
# This is needed to WRITE to Supabase
```

**Add to .env:**
```bash
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...YOUR_SERVICE_ROLE_KEY...
```

#### 3. **ATEAM Shared Secret**
**Choose a strong secret (or use a generated one):**
```bash
# Good example:
ATEAM_KEY=una_labs_webhook_sk_1708394857_secure_random_value

# Add it to both:
# 1. APPS/ATEAM/Server/.env
# 2. Worker secrets (see below)
```

---

## Worker Secret Setup

After setting `ATEAM_KEY` in the env files, deploy it to the worker:

```powershell
# From APPS/ATEAM/ directory
cd "C:\FTC HOLDING\APPS\ATEAM"

# The secret must match between:
# - APPS/ATEAM/Server/.env (ATEAM_KEY)
# - Worker secrets (ATEAM_KEY)

# Set the worker secret:
Set-Location "c:\FTC HOLDING\workers\stripe-api"
cmd /c "echo una_labs_webhook_sk_1708394857_secure_random_value" | npx wrangler secret put ATEAM_KEY

# Deploy the worker
npx wrangler deploy
```

**Verify worker was updated:**
```
✓ Uploaded 1 file (example text)
✓ Published your Worker
```

---

## Startup: Full Stack (Bridge + Tunnel)

### Step 1: Set env vars in ATEAM/Server/.env
Ensure these are set:
- `ANTHROPIC_API_KEY` ✓
- `SUPABASE_SERVICE_KEY` ✓
- `ATEAM_KEY` ✓
- `MAILJET_API_KEY` ✓
- `MAILJET_SECRET_KEY` ✓

### Step 2: Start the bridge with tunnel
```powershell
cd "C:\FTC HOLDING\APPS\ATEAM"
.\start-una-webhook.ps1
```

**Output should look like:**
```
Starting ATEAM bridge for Una Labs...
Waiting for bridge to start...
✓ Bridge started with PID 12345

Starting cloudflared tunnel...

2026-04-19 10:30:00 Tunnel ID: abc123def456...
2026-04-19 10:30:01 Route: https://xyz789.trycloudflare.com -> http://127.0.0.1:3001
2026-04-19 10:30:02 Listening on https://xyz789.trycloudflare.com
```

### Step 3: Get the tunnel URL
Copy the URL from the output. Example:
```
https://xyz789.trycloudflare.com
```

---

## Configure Worker Secret: UNALABS_NEW_PROJECT_WEBHOOK_URL

This tells the Stripe Worker where to send new subscription notifications.

```powershell
# From workers/stripe-api directory
Set-Location "c:\FTC HOLDING\workers\stripe-api"

# Set the webhook URL (append /webhook/intake to the tunnel URL)
cmd /c "echo https://xyz789.trycloudflare.com/webhook/intake" | npx wrangler secret put UNALABS_NEW_PROJECT_WEBHOOK_URL

# Deploy
npx wrangler deploy
```

**Verify:**
```powershell
npx wrangler secret list
# Output should show:
# UNALABS_NEW_PROJECT_WEBHOOK_URL (set)
```

---

## Testing: Run the Test Harness

### Test 1: Local bridge only (no tunnel)
```powershell
# Terminal 1: Start bridge (local only)
cd "C:\FTC HOLDING\APPS\ATEAM"
$env:ATEAM_KEY = "una_labs_webhook_sk_1708394857_secure_random_value"
node Server/bridge.js

# Terminal 2: Run test
cd "C:\FTC HOLDING\APPS\ATEAM"
node test-una-webhook.js http://localhost:3001/webhook/intake una_labs_webhook_sk_1708394857_secure_random_value
```

**Expected output:**
```
Status: 200 OK
Response: { "ok": true, "email": "test@example.com", "status": "processing" }

✓ Webhook delivered. Check:
  1. ATEAM logs for intake processing
  2. Supabase projects table for status change to 'scoping'
  3. Supabase milestones table for 3 new milestones
  4. Email inbox for kickoff email to test@example.com...
```

### Test 2: Via tunnel (full production path)
```powershell
# Run with tunnel URL
node test-una-webhook.js https://xyz789.trycloudflare.com/webhook/intake una_labs_webhook_sk_1708394857_secure_random_value
```

---

## Verify Success: Check All Outputs

### 1. **ATEAM Bridge Logs** (Terminal)
```
[ATEAM-INTAKE] New subscription: test@example.com — starter (monthly) — session cs_test_1713615000000
[ATEAM-INTAKE] Fetching intake data for intake_id=test_intake_1713615000000
[ATEAM-INTAKE] Calling Claude API for brief generation
[ATEAM-INTAKE] Writing 3 milestones to Supabase
[ATEAM-INTAKE] Updating project status to 'scoping'
[ATEAM-INTAKE] Sending kickoff email to test@example.com
[ATEAM-INTAKE] Sending notification to Mike
[ATEAM-INTAKE] ✓ Completed for test@example.com
```

### 2. **Supabase: projects table**
Run in Supabase SQL editor:
```sql
SELECT id, email, tier, status, created_at 
FROM projects 
WHERE email = 'test@example.com' 
ORDER BY created_at DESC LIMIT 1;
```

**Expected:**
- Status changed from `intake` → `scoping`

### 3. **Supabase: milestones table**
```sql
SELECT project_id, title, status, due_date 
FROM milestones 
WHERE project_id = (
  SELECT id FROM projects WHERE email = 'test@example.com' LIMIT 1
);
```

**Expected:** 3 rows with milestones generated by Claude

### 4. **Email: Kickoff to Client**
Check inbox for `test@example.com`:
- **Subject:** `Your starter project is being scoped — Una Labs`
- **Content:** Shows 3 milestones + clarifying question + link to dashboard

### 5. **Email: Notification to Mike**
Check inbox for `mike.fejiro@gmail.com`:
- **Subject:** `✓ Intake processed: test@example.com — starter`
- **Content:** Shows generated brief summary + intake_id + session_id for reference

---

## Production: Real Stripe Checkout

Once tested, the flow happens automatically:

1. **Customer completes checkout** on `unalabs.cloud/start/summary`
2. **Stripe payment processed** → trial begins
3. **Stripe webhook** calls Stripe Worker → `/api/checkout-success`
4. **Worker** verifies payment → runs activation → **posts to UNALABS_NEW_PROJECT_WEBHOOK_URL**
5. **ATEAM bridge** receives webhook → processes async
6. **Client sees** dashboard with milestones + gets kickoff email within seconds

**Timeline:**
- ✓ 0s: Checkout completes
- ✓ 1s: Customer redirected to confirmation page
- ✓ 2-3s: ATEAM receives webhook + starts Claude API call
- ✓ 5-10s: Claude returns brief → milestones written to Supabase
- ✓ 10-15s: Emails sent to client + Mike
- ✓ 15s: Client logs in to dashboard and sees milestones

---

## Troubleshooting

### Bridge won't start
```
ERROR: ATEAM_KEY is not set on the local bridge
```
**Fix:** Set `ATEAM_KEY` in `APPS/ATEAM/Server/.env`

### 401 Unauthorized on webhook
```
Status: 401 Unauthorized (unauthorized_key)
```
**Fix:** Ensure:
- ATEAM_KEY in `.env` matches worker ATEAM_KEY secret
- Header sent as `Authorization: Bearer YOUR_KEY`

### Claude API returns 401
```
Claude API error: 401 Unauthorized
```
**Fix:** Check `ANTHROPIC_API_KEY` is valid at https://console.anthropic.com/account/keys

### Supabase writes failing
```
Supabase fetch failed: 403
```
**Fix:** Check `SUPABASE_SERVICE_KEY` is the SERVICE ROLE key, not anon key

### Emails not sending
```
Mailjet not configured — skipping kickoff email
```
**Fix:** Verify `MAILJET_API_KEY` and `MAILJET_SECRET_KEY` in `.env`

---

## Architecture Diagram

```
┌─────────────────────────────────┐
│  Customer Stripe Checkout       │
│  unalabs.cloud/start/summary    │
└────────────────┬────────────────┘
                 │ Payment processed
                 ▼
┌─────────────────────────────────┐
│  Stripe Worker                  │
│  una-stripe-api.workers.dev     │
│  POST → writeProjectToSupabase  │
│  POST → ATEAM webhook           │
└────────────────┬────────────────┘
                 │ POST /webhook/intake
                 │ Authorization: Bearer ${ATEAM_KEY}
                 ▼
┌─────────────────────────────────┐
│  ATEAM Bridge (localhost:3001)   │
│  POST /webhook/intake           │
│  → Fetch intake from Supabase   │
│  → Call Claude API (Anthropic)  │
│  → Write milestones to Supabase │
│  → Update project status        │
│  → Send kickoff email (Mailjet) │
│  → Send Mike notification       │
└────────────────┬────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌──────────┐  ┌────────┐
│Supabase│  │  Mailjet │  │ Logs   │
│        │  │          │  │        │
│Milestones│ │Kickoff   │  │ATEAM   │
│Status   │ │Mike notif│  │Bridge  │
└────────┘  └──────────┘  └────────┘
```

---

## Deployment Checklist

- [ ] `ANTHROPIC_API_KEY` set in `APPS/ATEAM/Server/.env`
- [ ] `SUPABASE_SERVICE_KEY` set in `APPS/ATEAM/Server/.env`
- [ ] `ATEAM_KEY` set in `APPS/ATEAM/Server/.env`
- [ ] `ATEAM_KEY` set in worker secrets (`npx wrangler secret put ATEAM_KEY`)
- [ ] `UNALABS_NEW_PROJECT_WEBHOOK_URL` set in worker secrets (cloudflared tunnel URL + `/webhook/intake`)
- [ ] Worker deployed: `npx wrangler deploy`
- [ ] Bridge started: `.\start-una-webhook.ps1`
- [ ] Test harness run: `node test-una-webhook.js`
- [ ] Supabase verified: milestones table has 3 entries
- [ ] Emails verified: check inboxes
- [ ] Live payment test: customer completes checkout, receives kickoff email within 15s

---

## Post-Deployment

Once live:

1. **Monitor bridge logs** (Terminal running start-una-webhook.ps1)
2. **Monitor Supabase** for new milestones on each activation
3. **Monitor Mailjet** bounce/open rates on kickoff emails
4. **Monitor response times** (should be <20s from checkout to email)

If something fails:
- Check ATEAM bridge logs for error details
- Verify all env vars still set
- Check Supabase API keys haven't rotated
- Check Anthropic API quota (https://console.anthropic.com/usage)

---

## Questions or Issues?

Check:
1. Logs in ATEAM bridge terminal
2. Supabase error responses (check Network tab in browser)
3. Anthropic API status (https://status.anthropic.com)
4. Mailjet queue (https://app.mailjet.com/logs)
5. Worker logs: `npx wrangler tail`
