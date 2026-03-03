# 🚀 PeacePad Production Readiness - Complete Checklist

## ⚠️ CRITICAL FIXES REQUIRED

### 1. **SECURITY: Fix CORS Configuration** ⚠️ HIGH PRIORITY
**Current Issue**: CORS allows ANY origin (`origin: true`)
**Risk**: Security vulnerability - any website can make requests to your API

**File**: `server/index.ts` line 31-34

**Current Code**:
```typescript
app.use(cors({
  origin: true,  // ❌ INSECURE - allows any origin
  credentials: true,
}));
```

**FIX Required**:
```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://peacepad.ca', 'https://www.peacepad.ca']
    : true,
  credentials: true,
}));
```

---

### 2. **VAPID Keys for Push Notifications** ⚠️ HIGH PRIORITY
**Current Issue**: Using development fallback VAPID keys
**File**: `server/push-notifications.ts` line 7-8

**Required Environment Variables**:
```bash
VAPID_PUBLIC_KEY=<generate with: npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<generate with: npx web-push generate-vapid-keys>
VAPID_EMAIL=mailto:support@peacepad.ca
```

**Action**: Run this command and add to secrets:
```bash
npx web-push generate-vapid-keys
```

---

### 3. **SEO: Missing VITE_BASE_URL** ⚠️ MEDIUM PRIORITY
**Current Issue**: Canonical URLs fall back to window.location
**Impact**: SEO metadata won't have proper canonical URLs

**Required Environment Variable**:
```bash
VITE_BASE_URL=https://peacepad.ca
```

---

### 4. **File Uploads Directory Persistence** ⚠️ MEDIUM PRIORITY
**Current Issue**: `uploads/` directory created at runtime
**Risk**: Files may be lost on deployment restarts

**Solution**: Ensure `/uploads` is persisted in Replit deployment settings
OR use Replit Object Storage for production file storage

**Affected Files**:
- `/uploads/chat/` - Chat attachments
- `/uploads/receipts/` - Expense receipts  
- `/uploads/profiles/` - User profile images
- `/uploads/recordings/` - Call recordings

---

### 5. **Admin Authorization Not Implemented** ⚠️ MEDIUM PRIORITY
**File**: `server/routes.ts` line 3793
**Issue**: TODO comment - admin endpoints lack proper authorization

**Current Code**:
```typescript
// TODO: Before production launch, implement proper role-based authorization (admin flag or allowlist)
```

**Affected Endpoints**:
- `GET /api/admin/feedback`
- `GET /api/admin/users`
- Others in admin section

**Risk**: Anyone can access admin endpoints without proper auth

---

## ✅ REQUIRED ENVIRONMENT VARIABLES (Production)

### Core Application
```bash
NODE_ENV=production                    # ⚠️ CRITICAL - Enables real AI calls
PORT=5000                              # Default is fine
```

### Database
```bash
DATABASE_URL=<production database URL>
PGHOST=<production host>
PGPORT=<production port>
PGDATABASE=<production database>
PGUSER=<production user>
PGPASSWORD=<production password>
```

### Authentication
```bash
SESSION_SECRET=<generate strong random string>
PUBLIC_BASE_URL=https://api.peacepad.ca
APP_ORIGINS=https://peacepad.ca,https://www.peacepad.ca
CORS_ALLOWED_ORIGINS=https://peacepad.ca,https://www.peacepad.ca
OIDC_CLIENT_ID=<optional; required only if OIDC login routes are enabled>
OIDC_ISSUER_URL=https://replit.com/oidc # Optional, defaults to Replit issuer
```

### AI Services
```bash
OPENAI_API_KEY=<your OpenAI key>
# OR if using Replit AI Integrations:
AI_INTEGRATIONS_OPENAI_API_KEY=<auto-populated>
AI_INTEGRATIONS_OPENAI_BASE_URL=<auto-populated>
```

### Email Service
```bash
MAILJET_API_KEY=<your key>
MAILJET_SECRET_KEY=<your secret>
```

### Push Notifications (Generate these!)
```bash
VAPID_PUBLIC_KEY=<generate>
VAPID_PRIVATE_KEY=<generate>
VAPID_EMAIL=mailto:support@peacepad.ca
```

### SEO
```bash
VITE_BASE_URL=https://peacepad.ca
```

### Optional (Safety Plan Encryption)
```bash
SAFETY_PLAN_MASTER_KEY=<32-byte hex string>
```

---

## 🚫 DO NOT SET IN PRODUCTION

```bash
❌ ALLOW_DEV_AI=true         # Forces dev mode
❌ BUILD_MODE=true            # Only for local APK builds
❌ PLAY_STORE_BUILD=true     # Only for local APK builds
```

---

## 🔧 CODE FIXES NEEDED

### Fix 1: Update CORS Configuration
**File**: `server/index.ts`

Replace lines 30-34 with:
```typescript
// Enable CORS with credentials for authentication
// Production: restrict to peacepad.ca only
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://peacepad.ca', 'https://www.peacepad.ca']
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
```

### Fix 2: Add VITE_BASE_URL to Build
**File**: `.env` (create if doesn't exist)

```bash
VITE_BASE_URL=https://peacepad.ca
```

---

## 🧪 VERIFICATION CHECKLIST

After deployment, verify:

### 1. Production Mode Active
```bash
# In production Repl console, check:
echo $NODE_ENV
# Should output: production
```

### 2. AI Calls Working (Not Mocked)
Check logs for:
```
[Tone Analysis] Dev mode check: false
[Tone Analysis] NODE_ENV: production
```

### 3. CORS Working
Test from browser console on peacepad.ca:
```javascript
fetch('/api/version').then(r => r.json()).then(console.log)
// Should work without CORS errors
```

### 4. Push Notifications
- Subscribe to notifications
- Send test push
- Should receive on device

### 5. File Uploads
- Upload profile picture
- Upload expense receipt  
- Verify files persist after redeployment

### 6. Authentication
- Login with Replit Auth
- Verify session persists
- Check user profile shows correct data

---

## 🎯 DEPLOYMENT STEPS (In Order)

1. **Fix CORS in code** (server/index.ts)
2. **Generate VAPID keys** (`npx web-push generate-vapid-keys`)
3. **Set all environment variables** in PeacePadAI Repl secrets
4. **Sync code from dev** (`git pull origin main`)
5. **Push database schema** (`npm run db:push`)
6. **Restart workflow** to apply changes
7. **Verify all checks** from checklist above
8. **Deploy/Publish**

---

## 📊 PRODUCTION vs DEV DIFFERENCES

| Setting | Development | Production |
|---------|------------|------------|
| NODE_ENV | development | production |
| CORS Origin | Any (true) | peacepad.ca only |
| AI Calls | Mocked (free) | Real OpenAI ($) |
| VAPID Keys | Dev fallback | Generated keys |
| File Storage | Local uploads/ | Persistent storage |
| Error Logging | Verbose | Optimized |
| Domain | dev.peacepad.ca | peacepad.ca |

---

## 🔒 SECURITY NOTES

1. **Never commit secrets** to git
2. **Use environment variables** for all sensitive data
3. **CORS must restrict origins** in production
4. **Session cookies** already secured (httpOnly, secure in prod)
5. **CSP headers** already configured correctly
6. **File upload validation** already implemented

---

## ⚡ PERFORMANCE NOTES

1. **AI cost optimization** - Dev mode uses mocks, production uses real API
2. **Database connection pooling** - Already configured  
3. **Static file serving** - Production uses optimized static serving
4. **Session store** - Uses PostgreSQL for persistence
