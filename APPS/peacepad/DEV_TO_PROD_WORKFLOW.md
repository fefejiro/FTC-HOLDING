# PeacePad: Dev-to-Prod Workflow Guide

## 🏗️ **Your Current Setup**

Based on your Replit dashboard, you have:
- **PeacePad-Development** - Development/staging environment (dev.peacepad.ca)
- **PeacePadAI** - Production environment (peacepad.ca)

This two-Repl approach is **excellent** for safety and testing!

---

## 💰 **Cost-Saving AI Configuration (UPDATED)**

Your code **already has AI cost-saving built in**! 

### **How It Works:**

The AI system uses mock (free) responses when:
- `NODE_ENV` is NOT "production" **AND**
- `ALLOW_DEV_AI` environment variable is NOT set

Otherwise, it uses real OpenAI API (paid).

### **To Save Costs in Development:**

**Option 1: Automatic (Recommended)**
```bash
# In PeacePad-Development Repl Secrets
# Simply DON'T set ALLOW_DEV_AI
# Leave NODE_ENV unset (defaults to development)
# Result: FREE mock AI responses
```

**Option 2: Force Production Mode for Testing**
```bash
# In PeacePad-Development Repl Secrets
# Set ALLOW_DEV_AI=true
# Result: Uses REAL OpenAI (costs money, but gets actual ChatGPT)
```

### **Production Configuration:**

```bash
# In PeacePadAI Repl Secrets panel
# REQUIRED: Set AI_INTEGRATIONS_OPENAI_API_KEY (uses shared Replit integration)
# REQUIRED: Set ONE of these to enable real AI:
#   - NODE_ENV=production (recommended)
#   OR
#   - ALLOW_DEV_AI=true
# 
# ⚠️ WARNING: If you DON'T set one of these, production will use MOCK AI!
# Result: Real ChatGPT AI for production users
```

**Check AI Mode in Logs:**
```
[Tone Analysis] ✓ Using MOCK analysis (dev mode enabled)  ← FREE
[Tone Analysis] NOT in dev mode, using real OpenAI API...  ← PAID
```

**Summary:**
| Environment | NODE_ENV | ALLOW_DEV_AI | Result |
|-------------|----------|--------------|--------|
| **Dev (saves money)** | unset or development | unset | ✅ **FREE mock AI** |
| **Dev (test real AI)** | unset or development | true | 💰 **PAID real AI** |
| **Prod (correct)** | production | unset | ✅ **PAID real AI** |
| **Prod (also works)** | unset | true | ✅ **PAID real AI** |
| **Prod (WRONG!)** | unset | unset | ⚠️ **MOCK AI - USERS GET FAKE RESPONSES!** |

---

## ⚡ **Automated Deployment Scripts (NEW!)**

I've created automation scripts to make deployment easier:

### **Quick Deployment**
```bash
# Automated deployment helper (detects environment)
chmod +x scripts/deploy-to-prod.sh
./scripts/deploy-to-prod.sh
```

### **Pre-Deployment Checks**
```bash
# Run before deploying to catch issues early
chmod +x scripts/deploy-check.sh
./scripts/deploy-check.sh
```

### **Version Bumping**
```bash
# Auto-update version in WhatsNewModal.tsx
npx tsx scripts/bump-version.ts patch "Fixed AI integration bug"
npx tsx scripts/bump-version.ts minor "Added calendar sync feature"
npx tsx scripts/bump-version.ts major "Complete UI redesign"
```

---

## ✅ **Recommended Workflow**

### **1. Development Phase (PeacePad-Development)**

**Code & Test Here:**
```bash
# Your dev environment auto-uses:
- Mock AI responses (FREE - no OpenAI costs)
- Development database (separate from production)
- Debug logging enabled
- Testing/mock data for features
```

**Environment Variables:**
- Use Replit's **Secrets** tab for sensitive data
- **DO NOT set** `AI_INTEGRATIONS_OPENAI_API_KEY` (saves money - uses free mock AI!)
- **DO NOT set** `NODE_ENV` (defaults to development - enables free mock AI)
- **DO NOT set** `ALLOW_DEV_AI` (leaving unset enables free mock AI)
- Set development database URL

**⚠️ NOTE:** Production has DIFFERENT requirements! See "Production Configuration" section below.

**Testing Checklist:**
- [ ] Test all new features thoroughly
- [ ] Verify AI tone analysis works with real messages
- [ ] Check mobile responsiveness
- [ ] Test with real co-parent workflows
- [ ] Review browser console for errors
- [ ] Test Conch Mode audio/WebRTC

---

### **2. Code Transfer (Dev → Prod)**

**🎯 BEST PRACTICE: Use Git Branches (See GIT_WORKFLOW.md for details)**

```bash
# In PeacePad-Development (dev branch)
git checkout dev
git add .
git commit -m "Fix: AI integration - update to GPT-4o-mini"
git push origin dev

# Create Pull Request on GitHub: dev → main
# Review & merge PR

# In PeacePadAI (main branch)
git checkout main
git pull origin main
npm install
```

**Quick Deployment Script (Automated):**
```bash
# In PeacePad-Development
./scripts/deploy-to-prod.sh  # Detects you're on dev, pushes to GitHub

# In PeacePadAI
./scripts/deploy-to-prod.sh  # Detects you're on main, pulls & installs
```

**Manual Copy-Paste (For Quick Hotfixes):**

For small urgent changes:
1. Open both Repls side-by-side
2. Copy changed files from Dev → Prod
3. Run `npm install` in Prod
4. Test thoroughly before publishing

---

### **3. Production Deployment (PeacePadAI)**

**Pre-Deployment Checklist:**
- [ ] Update `changelog` in `WhatsNewModal.tsx` with version number
- [ ] Verify all secrets are set in Production Repl
- [ ] Check database migrations are ready
- [ ] Review `.env` differences between dev/prod

**Environment Configuration:**
```bash
# Production secrets (set via Replit Secrets tab):
- DATABASE_URL (production database - different from dev!)
- AI_INTEGRATIONS_OPENAI_API_KEY (uses Replit's shared key)
- MAILJET_API_KEY
- MAILJET_SECRET_KEY
- NODE_ENV=production (REQUIRED for real AI - see Cost-Saving section above)
  OR ALLOW_DEV_AI=true (alternative to enable real AI)
```

**Deploy:**
1. Click **Publish** button in PeacePadAI Repl
2. Select **Autoscale Deployment** (handles traffic spikes)
3. Configure custom domain: `peacepad.ca`
4. Set machine power based on usage
5. Monitor logs after deployment

---

### **4. Post-Deployment Validation**

**Smoke Tests on Production:**
- [ ] Visit https://peacepad.ca
- [ ] Test login/authentication
- [ ] Send a test message and verify AI analysis appears
- [ ] Test Conch Mode (audio/WebRTC)
- [ ] Check expense tracking
- [ ] Verify calendar events load
- [ ] Test mobile responsiveness

**Monitor:**
```bash
# In PeacePadAI Repl, check:
- Server logs for errors
- Database connection status
- OpenAI API call success rate
- WebSocket connections
```

---

## 🔒 **Environment-Specific Configuration**

### **Development (dev.peacepad.ca)**
```javascript
// Feature flags for testing
const ENABLE_DEBUG_LOGGING = true;
const USE_MOCK_DATA = false; // Always use real APIs
const STRICT_VALIDATION = false; // More lenient for testing
```

### **Production (peacepad.ca)**
```javascript
// Production-ready settings
const ENABLE_DEBUG_LOGGING = false;
const USE_MOCK_DATA = false; // Never use mock data
const STRICT_VALIDATION = true; // Enforce all validations
```

---

## 📊 **Database Management**

### **Separate Databases Are Critical:**

**Development Database:**
- Safe for testing destructive operations
- Can reset/seed data freely
- Use test partnerships and messages

**Production Database:**
- Contains real user data
- Never test on production DB
- Always backup before migrations

### **Migration Workflow:**
```bash
# 1. Test migration in Development
npm run db:push

# 2. Verify data integrity
# Check that all tables, columns are correct

# 3. Apply to Production
# In PeacePadAI Repl:
npm run db:push

# 4. Monitor for errors
# Watch logs for database connection issues
```

---

## 🐛 **Issue Resolution**

### **If Dev and Prod Behave Differently:**

**Check These Common Causes:**

1. **Environment Variables**
   - Are secrets identical in both Repls?
   - **CRITICAL:** Is `NODE_ENV=production` set in prod? (Required for real AI!)
   - Or is `ALLOW_DEV_AI=true` set in prod? (Alternative for real AI)
   - Without ONE of these, production will use MOCK AI!

2. **Package Versions**
   - Run `npm install` in both Repls
   - Verify `package-lock.json` is identical

3. **Database Schema**
   - Dev and Prod databases must match
   - Run migrations in both environments

4. **Cached Data**
   - Clear browser cache
   - Restart both Repls

5. **OpenAI API Keys**
   - Both should use `AI_INTEGRATIONS_OPENAI_API_KEY`
   - Verify key is valid and has credits

---

## 🚀 **Quick Deploy Commands**

### **Development Testing:**
```bash
# Start dev server
npm run dev

# Test AI integration
curl -X POST http://localhost:5000/api/ai/analyze-tone \
  -H "Content-Type: application/json" \
  -d '{"message":"Testing AI"}'
```

### **Production Deploy:**
```bash
# Build production assets
npm run build

# Start production server
npm run start
```

---

## 📈 **Version Management**

### **Semantic Versioning:**
- **Major (1.x.x)**: Breaking changes, major features
- **Minor (x.1.x)**: New features, backwards-compatible
- **Patch (x.x.1)**: Bug fixes, small improvements

### **Update Changelog:**
```typescript
// client/src/components/WhatsNewModal.tsx
const changelog: ChangelogEntry[] = [
  {
    version: "1.2.1",
    date: "December 4, 2025",
    changes: [
      {
        type: "bugfix",
        title: "AI Tone Analysis Restored",
        description: "Fixed critical bug...",
      },
    ],
  },
  // Previous versions...
];
```

---

## 🎯 **Best Practices**

1. **Always Test in Dev First**
   - Never deploy untested code to production
   - Use real API calls, not mock data

2. **Keep Environments in Sync**
   - Same package versions
   - Same database schema
   - Different data only

3. **Document Breaking Changes**
   - Update changelog before deploying
   - Notify users of major updates

4. **Monitor Production**
   - Check logs after each deploy
   - Set up error alerts if possible

5. **Backup Before Major Changes**
   - Export production database
   - Keep previous Repl version snapshot

---

## 🔄 **Recent Fixes Applied**

### **What Was Fixed:**
1. ✅ Updated OpenAI model: `gpt-3.5-turbo` → `gpt-4o-mini`
2. ✅ Fixed NODE_ENV blocking tsx install (was set to "production" in dev)
3. ✅ Created automation scripts for deployment workflow
4. ✅ Documented cost-saving AI configuration

### **How to Deploy These Fixes to Production:**
```bash
# In PeacePadAI Repl:
1. Set NODE_ENV=production in Secrets tab (REQUIRED for real AI!)
2. Copy updated files:
   - server/routes.ts
   - server/emotionAnalyzer.ts
   - client/src/components/WhatsNewModal.tsx
   - scripts/* (new automation scripts)
   - GIT_WORKFLOW.md (new)
3. Run: npm install
4. Verify in logs: "[Tone Analysis] NOT in dev mode, using real OpenAI API..."
5. Click Publish button
6. Test AI on peacepad.ca - verify real ChatGPT responses appear
```

**⚠️ CRITICAL:** Production MUST have `NODE_ENV=production` (or `ALLOW_DEV_AI=true`) to enable real AI. Otherwise users get mock responses!

---

## 📞 **Need Help?**

If Dev and Prod still behave differently:
1. Check environment variables in both Repls
2. Verify database connections
3. Compare `package.json` versions
4. Review Replit deployment logs
5. Test with identical API requests

---

**Your two-Repl setup is excellent! This workflow will keep your production site stable while allowing safe development.**
