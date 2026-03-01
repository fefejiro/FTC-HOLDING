# PeacePad Automation Scripts

This folder contains automation scripts to streamline your dev-to-prod workflow.

## 📜 **Available Scripts**

### **1. deploy-check.sh**
Pre-deployment verification script that checks:
- ✅ Dependencies installed
- ✅ TypeScript compiles
- ✅ Environment variables configured
- ✅ Git status
- ✅ Critical files exist
- ✅ Version updated

**Usage:**
```bash
./scripts/deploy-check.sh
```

**When to use:**
- Before deploying to production
- After making significant changes
- To verify environment is configured correctly

---

### **2. deploy-to-prod.sh**
Automated deployment helper that:
- Auto-detects if you're in dev or prod environment
- Commits and pushes changes (dev)
- Pulls latest code and installs dependencies (prod)
- Runs pre-deployment checks

**Usage:**
```bash
./scripts/deploy-to-prod.sh
```

**In Development (dev branch):**
- Commits your changes
- Pushes to GitHub dev branch
- Reminds you to create PR

**In Production (main branch):**
- Runs deploy-check.sh
- Pulls from GitHub main branch
- Installs dependencies
- Reminds you to click Publish

---

### **3. bump-version.ts**
Automated version bumping for changelog.

**Usage:**
```bash
# Patch version (1.2.0 → 1.2.1) - Bug fixes
npx tsx scripts/bump-version.ts patch "Fixed AI integration bug"

# Minor version (1.2.0 → 1.3.0) - New features
npx tsx scripts/bump-version.ts minor "Added calendar sync"

# Major version (1.2.0 → 2.0.0) - Breaking changes
npx tsx scripts/bump-version.ts major "Complete platform redesign"

# Multiple changes in one version
npx tsx scripts/bump-version.ts patch "Fixed AI bug" "Improved performance"
```

**What it does:**
- Automatically increments version number
- Updates WhatsNewModal.tsx with new entry
- Infers change type (feature/improvement/bugfix)
- Sets current date
- Reminds you to commit and deploy

---

## 🚀 **Quick Workflow Examples**

### **Deploying a Bug Fix**

```bash
# 1. Make your code changes in dev environment
# ...

# 2. Bump version and update changelog
npx tsx scripts/bump-version.ts patch "Fixed AI tone analysis"

# 3. Run checks
./scripts/deploy-check.sh

# 4. Deploy to dev
./scripts/deploy-to-prod.sh
# (commits, pushes to GitHub dev branch)

# 5. Test on dev.peacepad.ca

# 6. Create PR on GitHub: dev → main

# 7. In production Repl:
./scripts/deploy-to-prod.sh
# (pulls from main, installs deps)

# 8. Click Publish button in Replit
```

### **Quick Emergency Hotfix**

If you need to fix a critical bug directly in production:

```bash
# In PeacePadAI (production Repl)

# 1. Make the fix directly

# 2. Bump version
npx tsx scripts/bump-version.ts patch "Hotfix: Critical security issue"

# 3. Run checks
./scripts/deploy-check.sh

# 4. Commit and push
git add .
git commit -m "Hotfix: Critical security issue"
git push origin main

# 5. Also push to dev to keep in sync
git checkout dev
git merge main
git push origin dev
git checkout main

# 6. Click Publish button
```

---

## 💡 **Tips**

1. **Always run deploy-check.sh before deploying**
   - Catches environment issues early
   - Verifies secrets are configured
   - Checks TypeScript compiles

2. **Use bump-version.ts for every release**
   - Keeps changelog up to date
   - Users see what's new
   - Maintains semantic versioning

3. **Test in dev first**
   - Never deploy untested code
   - Use mock AI in dev (free)
   - Separate databases prevent accidents

4. **Keep Git clean**
   - Commit often with descriptive messages
   - Use branches (dev vs main)
   - Review changes before pushing

---

## 🔧 **Troubleshooting**

### **Script Permission Denied**
```bash
chmod +x scripts/*.sh
```

### **TSX Not Found**
```bash
npm install  # Ensure dependencies are installed
```

### **Git Errors**
```bash
# Check your branch
git branch

# Check remote
git remote -v

# Pull latest first
git pull origin <your-branch>
```

---

## 📚 **Related Documentation**

- **DEV_TO_PROD_WORKFLOW.md** - Complete dev-to-prod workflow guide
- **GIT_WORKFLOW.md** - Git branching strategy and best practices
- **replit.md** - Project overview and architecture

---

**These scripts save time and reduce human error in deployments!** 🎯
