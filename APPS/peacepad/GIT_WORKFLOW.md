# PeacePad: Git Workflow Guide

## 🎯 **Current Problem**

You mentioned:
> "I am using GitHub sync sometimes in dev and sometimes in prod so both are updated with changes made. Not good I guess lol."

**You're right** - this can cause conflicts! Let's fix it with a proper branch-based workflow.

---

## ✅ **Recommended Git Workflow**

### **Branch Strategy**

```
main (production)
  └── dev (development/staging)
```

- **`main` branch** = Production code (peacepad.ca)
- **`dev` branch** = Development code (dev.peacepad.ca / PeacePad-Development)

---

## 🔄 **Step-by-Step Workflow**

### **1. Initial Setup (One-Time)**

In your **PeacePad-Development** Repl:
```bash
# Create dev branch
git checkout -b dev

# Push dev branch to GitHub
git push -u origin dev

# Verify branches
git branch -a
```

In your **PeacePadAI** (Production) Repl:
```bash
# Stay on main branch
git checkout main

# Pull latest
git pull origin main
```

---

### **2. Daily Development Workflow**

#### **In PeacePad-Development (dev branch):**

```bash
# Make sure you're on dev branch
git checkout dev

# Make your code changes...
# (edit files, test features, etc.)

# Stage changes
git add .

# Commit with descriptive message
git commit -m "Fix: AI integration - update to GPT-4o-mini"

# Push to GitHub
git push origin dev
```

---

### **3. Deploying to Production**

When ready to deploy tested code to production:

#### **Option A: Merge via GitHub (Recommended)**

1. Go to GitHub.com
2. Create a **Pull Request**: `dev` → `main`
3. Review changes
4. Merge PR
5. In **PeacePadAI** Repl:
   ```bash
   git checkout main
   git pull origin main
   npm install  # Update dependencies
   ```
6. Click **Publish** button

#### **Option B: Merge Locally**

In **PeacePadAI** Repl:
```bash
# Make sure you're on main
git checkout main

# Merge dev into main
git merge dev

# Push to GitHub
git push origin main

# Update dependencies
npm install
```

---

### **4. Handling Hotfixes (Emergency Production Fixes)**

If you need to fix a critical bug directly in production:

```bash
# In PeacePadAI (Production)
git checkout main

# Create hotfix branch
git checkout -b hotfix/critical-bug

# Make the fix...

# Commit
git commit -am "Hotfix: Critical AI integration bug"

# Merge back to main
git checkout main
git merge hotfix/critical-bug

# Push to GitHub
git push origin main

# IMPORTANT: Also merge to dev so it stays in sync
git checkout dev
git merge main
git push origin dev
```

---

## 📊 **Visual Workflow**

```
Development Flow:
┌─────────────────────┐
│ PeacePad-Development│
│ (dev branch)        │
└──────────┬──────────┘
           │
           │ 1. Code & Test
           │ 2. git push origin dev
           │
           ▼
    ┌──────────────┐
    │   GitHub     │
    │  dev branch  │
    └──────┬───────┘
           │
           │ 3. Create PR: dev → main
           │ 4. Review & Merge
           │
           ▼
    ┌──────────────┐
    │   GitHub     │
    │  main branch │
    └──────┬───────┘
           │
           │ 5. git pull origin main
           │ 6. Click Publish
           │
           ▼
┌──────────────────────┐
│    PeacePadAI        │
│ (main branch - PROD) │
└──────────────────────┘
```

---

## 🔐 **Environment-Specific Configuration**

### **Development (.env in PeacePad-Development)**
```bash
# .env file
NODE_ENV=development
USE_REAL_AI=false  # Use mock AI to save costs
DATABASE_URL=<dev_database_url>
AI_INTEGRATIONS_OPENAI_API_KEY=<key>
MAILJET_API_KEY=<key>
MAILJET_SECRET_KEY=<key>
```

### **Production (.env in PeacePadAI)**
```bash
# Replit Secrets (not .env file!)
# Set these in Secrets panel:
DATABASE_URL=<production_database_url>  # Different from dev!
AI_INTEGRATIONS_OPENAI_API_KEY=<key>
MAILJET_API_KEY=<key>
MAILJET_SECRET_KEY=<key>

# DO NOT SET:
# NODE_ENV (leave unset)
# USE_REAL_AI (code auto-detects based on environment)
```

---

## 🚨 **Common Pitfalls to Avoid**

### **1. DON'T Push to Main from Dev Repl**
```bash
# ❌ BAD (in PeacePad-Development):
git checkout main
git push origin main

# ✅ GOOD (in PeacePad-Development):
git checkout dev
git push origin dev
```

### **2. DON'T Push to Dev from Prod Repl**
```bash
# ❌ BAD (in PeacePadAI):
git checkout dev
git push origin dev

# ✅ GOOD (in PeacePadAI):
git checkout main
git push origin main
```

### **3. DON'T Forget to Pull Before Making Changes**
```bash
# ✅ ALWAYS do this first:
git pull origin <your-branch>
```

---

## 🛠️ **Automated Helpers**

### **Check Current Setup**
```bash
# See which branch you're on
git branch

# See your remote URL
git remote -v

# See recent commits
git log --oneline -5
```

### **Quick Status Check**
```bash
# See what's changed
git status

# See what's different from GitHub
git fetch
git status
```

---

## 📋 **Deployment Checklist**

Use this before deploying to production:

```bash
# Run pre-deployment checks
chmod +x scripts/deploy-check.sh
./scripts/deploy-check.sh
```

This script checks:
- ✅ Dependencies installed
- ✅ TypeScript compiles
- ✅ Environment variables configured
- ✅ Git status clean
- ✅ Version updated

---

## 🎯 **Quick Reference Commands**

### **Development (PeacePad-Development)**
```bash
git checkout dev
git pull origin dev
# ... make changes ...
git add .
git commit -m "Your message"
git push origin dev
```

### **Production (PeacePadAI)**
```bash
git checkout main
git pull origin main
npm install
# Click Publish button in Replit
```

### **Version Bump**
```bash
# Auto-update version in WhatsNewModal.tsx
npx tsx scripts/bump-version.ts patch "Fixed AI integration bug"
```

---

## 🔄 **Syncing Strategy Summary**

| Repl | Branch | When to Sync | Command |
|------|--------|--------------|---------|
| **PeacePad-Development** | `dev` | After every feature/fix | `git push origin dev` |
| **PeacePadAI** | `main` | After testing in dev | `git pull origin main` |

**Golden Rule**: 
- Development always pushes to `dev`
- Production always pulls from `main`
- Never cross the streams! 👻

---

## 💡 **Pro Tips**

1. **Commit Often**: Small, frequent commits are better than large ones
2. **Descriptive Messages**: Use format like "Fix: AI tone analysis" or "Feature: Calendar sync"
3. **Test Before Merging**: Always test in dev before merging to main
4. **Review Changes**: Use `git diff` before committing to avoid accidents

---

**This workflow keeps dev and prod separate while maintaining clean Git history!** 🎯
