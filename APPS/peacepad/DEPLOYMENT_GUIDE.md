# PeacePad - Deployment Guide (Dev → Production)

## 📋 **Current Status: Steps 1-5 Complete ✅**

- ✅ Step 1: CORS security fixed
- ✅ Step 2: NODE_ENV=production set in PeacePadAI  
- ✅ Step 3: VAPID keys generated
- ✅ Step 4: DATABASE_URL verified for dev
- ✅ Step 5: CUSTOM_DOMAINS set

## 🚀 **NEXT: Steps 6-8 (Deploy & Test)**

---

## Step 6: Deploy PeacePad-Development to dev.peacepad.ca

### In THIS Repl (PeacePad-Development):

1. **Click "Deploy" button** (top right toolbar)
   - OR: Tools → Deployments → Create Deployment

2. **Choose "Autoscale Deployment"** (recommended)
   - Perfect for testing and scaling
   - Cost-effective (scales to zero when idle)

3. **Configure Deployment**
   - Name: `PeacePad-Dev`
   - Region: Any (default is fine)
   - Machine type: Starter tier

4. **Verify Secrets Carry Over**
   - DATABASE_URL ✅
   - OPENAI_API_KEY ✅
   - CUSTOM_DOMAINS=dev.peacepad.ca ✅

5. **Wait for Deployment** (~2-5 minutes)
   - Check logs in deployment dashboard
   - Look for: `[Auth] Registering strategy: replitauth:dev.peacepad.ca`

---

## Step 7: Test Both Environments (Isolation Verification)

### Test Development (dev.peacepad.ca):
```
1. Open https://dev.peacepad.ca
2. Click "Sign in with Replit"
3. Authorize your Replit account
4. Complete onboarding (or skip with guest mode)
5. Test: Send a message → tone analysis should work
6. ✅ Data stored in DEV database (separate from production)
```

### Test Production (peacepad.ca):
```
1. Open https://peacepad.ca
2. Click "Sign in with Replit"
3. Authorize your Replit account
4. Complete onboarding
5. Test: Send a message → should use REAL AI (not mocks)
6. ✅ Data stored in PRODUCTION database
```

### Verify Isolation:
- ✅ Dev users ≠ Production users (different accounts)
- ✅ Dev data separate from production
- ✅ Each environment has independent partnerships/expenses
- ✅ No CORS errors in browser console

---

## Step 8: Lessons Learned & Future Deployments

### Key Setup Notes:
1. **Environment Isolation Works!**
   - Each Repl has its own DATABASE_URL
   - Dev and prod operate independently
   - Users are completely isolated

2. **CORS Security Matters**
   - Production restricted to peacepad.ca
   - Development allows all origins
   - Check `server/index.ts` lines 34-42

3. **Database Schema Deployment**
   - Run `npm run db:push` after code changes
   - Ensures all tables/columns sync to database
   - Safe operation (doesn't delete data)

4. **Common Gotchas:**
   - Port 5000 must be available (kill old processes if needed)
   - Vite HMR errors are normal (reload browser)
   - Secrets take effect after workflow restart
   - Check logs for OAuth domain registration

### For Future Deployments:
```
1. Make code changes in workspace
2. Commit to git (optional but recommended)
3. Push database schema: npm run db:push
4. Restart workflow to load new code
5. Test locally first (this Repl)
6. Deploy to dev.peacepad.ca via Replit UI
7. Test at dev.peacepad.ca
8. Sync code to PeacePadAI production Repl
9. Deploy PeacePadAI to peacepad.ca
10. Test at peacepad.ca
```

---

## ✅ **Important: Git Is NOT Required for Publishing!**

**Good News:** Replit publishing works independently of Git/GitHub sync. You can publish directly from your workspace.

**How it works:**
1. Replit takes a **snapshot** of your current workspace
2. Deploys that snapshot to production
3. Creates a separate production database automatically
4. Updates are easy: just click "Publish" again

---

## 📚 **Step-by-Step Publishing Instructions**

### **Step 1: Locate the Publish Button**

**Option A: Top Toolbar** (Easiest)
- Look at the **top of your Replit workspace**
- You should see a **"Publish"** or **"Deploy"** button
- Click it to open the publishing interface

**Option B: Left Sidebar**
- Open the left tool dock
- Click on **"Publishing"** or **"Deployments"**
- This opens the same publishing interface

---

### **Step 2: Choose Deployment Type**

When the publishing interface opens, you'll see deployment options. Choose:

**✅ RECOMMENDED: Autoscale Deployment**

**Why Autoscale?**
- Perfect for web applications (like PeacePad)
- Automatically scales based on number of users
- Scales down to zero when idle (cost-effective)
- Handles your 100-user beta testing easily
- Can scale up if you get more users

**Other Options (Not Recommended for Now):**
- ❌ **Reserved VM:** More expensive, always running (overkill for beta)
- ❌ **Static:** Only for static sites (PeacePad needs a backend)
- ❌ **Scheduled:** For cron jobs (not web apps)

---

### **Step 3: Configure Deployment Settings**

You'll be asked to configure several settings:

#### **A. Deployment Name**
- Enter: `PeacePad` or `peacepad-production`
- This is just for your reference in the dashboard

#### **B. Machine Type/Power**
- **For Beta (100 users):** Start with **Starter** or **Basic** tier
- You can upgrade later if needed
- Autoscale will handle load automatically

#### **C. Environment Variables (Secrets)**

**IMPORTANT:** Your secrets should automatically carry over:
- ✅ `OPENAI_API_KEY` - For AI tone analysis
- ✅ `MAILJET_API_KEY` - For email notifications
- ✅ `MAILJET_SECRET_KEY` - For email authentication
- ✅ `DATABASE_URL` - Auto-created for production database

**If they don't appear:**
1. Click "Add Secret" or "Environment Variables"
2. They should be available to select from your workspace secrets
3. Make sure all 3 are checked/enabled

#### **D. Run Command**

The run command tells Replit how to start your app in production.

**Recommended Production Command:**
```bash
npm run dev
```

**OR if you want a production build:**
```bash
npm start
```

**Note:** Since your app uses `npm run dev` in development, stick with that unless you have a separate production start script.

#### **E. Build Command (Optional)**

This runs before starting your app. Usually:
```bash
npm install
```

This ensures all dependencies are installed before running.

---

### **Step 4: Domain Configuration**

#### **Option 1: Use Replit's Default Domain (Quick Start)**
- Replit will give you a URL like: `peacepad.replit.app`
- This works immediately
- Good for testing before configuring custom domain

#### **Option 2: Configure Custom Domain (peacepad.ca)**

After publishing, you'll need to:

1. **In Replit Dashboard:**
   - Go to your deployment settings
   - Find "Custom Domain" section
   - Enter: `peacepad.ca`
   - Replit will give you DNS records to add

2. **In Your Domain Registrar (where you bought peacepad.ca):**
   - Add the DNS records Replit provides
   - Usually a CNAME or A record
   - Wait 5-60 minutes for DNS propagation

3. **For Development Subdomain:**
   - You can also add `dev.peacepad.ca` pointing to your dev workspace
   - OR keep using the Replit dev URL

---

### **Step 5: Click Publish!**

1. Review all settings
2. Click the **"Publish"** or **"Deploy"** button
3. Wait 2-5 minutes for deployment

**What Happens:**
- ✅ Replit builds your app
- ✅ Creates production database (PostgreSQL via Neon)
- ✅ Copies your secrets to production
- ✅ Starts your server
- ✅ Configures HTTPS/TLS automatically
- ✅ Makes your app live at the deployment URL

---

### **Step 6: Verify Deployment**

Once deployment is complete:

#### **A. Check Deployment Status**
- Dashboard should show: **"Running"** or **"Active"**
- Click on the deployment to see logs

#### **B. Visit Your App**
- Open the deployment URL (e.g., `peacepad.replit.app`)
- You should see the PeacePad onboarding screen

#### **C. Test Critical Pages**
Visit these URLs to confirm they work:
- ✅ `/` - Landing page
- ✅ `/privacy` - Privacy Policy (required for Play Store!)
- ✅ `/terms` - Terms of Service
- ✅ `/chat` - Messaging (after login)
- ✅ Try logging in with Replit Auth

#### **D. Check Database**
- Create a test account
- Try sending a message
- Verify data is saving to production database

---

## 🔍 **Troubleshooting Common Issues**

### **Issue 1: "Build Failed" Error**

**Cause:** Missing dependencies or build errors

**Fix:**
1. Check the build logs in Replit dashboard
2. Make sure `package.json` has all dependencies
3. Try building locally first: `npm install && npm run dev`
4. If it works locally, try publishing again

---

### **Issue 2: "Database Connection Error"**

**Cause:** Production database not created or wrong DATABASE_URL

**Fix:**
1. Check deployment logs for database errors
2. Verify `DATABASE_URL` secret is set
3. Wait a few minutes (database creation can take 1-2 minutes)
4. Restart the deployment if needed

---

### **Issue 3: "Cannot Access /privacy or /terms"**

**Cause:** Routes not configured correctly

**Fix:**
1. These pages exist in your codebase (`client/src/pages/privacy.tsx` and `terms.tsx`)
2. Routes are registered in `App.tsx`
3. Should work automatically after deployment
4. If not, check deployment logs for errors

---

### **Issue 4: "OpenAI API Not Working"**

**Cause:** `OPENAI_API_KEY` not set in production

**Fix:**
1. Go to deployment settings
2. Check "Environment Variables" section
3. Add `OPENAI_API_KEY` if missing
4. Redeploy after adding

---

### **Issue 5: "App is Slow or Timing Out"**

**Cause:** Cold start (Autoscale scales to zero when idle)

**Fix:**
1. First request after idle may take 10-30 seconds (cold start)
2. This is normal for Autoscale deployments
3. Once running, subsequent requests are fast
4. If too slow, consider upgrading to Reserved VM (but more expensive)

---

## 📊 **After Deployment Checklist**

Once deployed, verify:

- [ ] App loads at production URL
- [ ] `/privacy` page is accessible
- [ ] `/terms` page is accessible  
- [ ] Can create account and login
- [ ] Messages can be sent and received
- [ ] Calendar events save correctly
- [ ] Expenses track properly
- [ ] AI tone analysis works (requires OPENAI_API_KEY)
- [ ] Email notifications work (requires Mailjet keys)
- [ ] App icons display correctly
- [ ] Mobile responsive (test on phone)

---

## 🔄 **Updating Your Published App**

To deploy updates:

1. Make changes in your Replit workspace (development)
2. Test them thoroughly
3. Click **"Publish"** again
4. Replit creates a new snapshot and deploys it
5. Production database is **NOT** affected (data persists)

**Important:**
- Database schema changes are applied automatically
- User data is preserved
- No downtime (rolling update)

---

## 🌐 **Custom Domain Setup (peacepad.ca)**

After initial deployment with Replit URL, configure your custom domain:

### **Step 1: In Replit Dashboard**
1. Go to your deployment
2. Click "Settings" or "Configure"
3. Find "Custom Domains" section
4. Click "Add Custom Domain"
5. Enter: `peacepad.ca`

### **Step 2: Get DNS Records**
Replit will show you DNS records like:
```
Type: CNAME
Name: peacepad.ca (or @)
Value: your-deployment.replit.app
```

### **Step 3: Update DNS**
1. Go to your domain registrar (Namecheap, GoDaddy, etc.)
2. Find DNS settings for peacepad.ca
3. Add the CNAME record Replit provided
4. Save changes

### **Step 4: Wait for Propagation**
- DNS changes take 5-60 minutes
- Use [dnschecker.org](https://dnschecker.org/) to check status
- Once propagated, peacepad.ca will show your app!

### **Step 5: Verify SSL/HTTPS**
- Replit automatically configures HTTPS
- Visit `https://peacepad.ca`
- You should see the padlock icon (secure)

---

## 📝 **Production Database Notes**

### **How It Works:**
- **Development Database:** Used for testing (current workspace)
- **Production Database:** Created automatically on first deployment
- **Completely Separate:** No test data in production

### **Database Migrations:**
- Schema changes from development are applied to production
- Drizzle ORM handles this automatically
- User data is preserved during updates

### **Accessing Production Database:**
- **READ ONLY:** View data in Replit dashboard
- **Cannot Edit:** Production database is read-only for safety
- **Backups:** Automatic backups by Neon (Replit's database provider)

---

## 💰 **Cost Considerations**

### **Autoscale Deployment Pricing:**
- **Idle:** $0/month (scales to zero)
- **Active:** Pay only when users are active
- **Estimate for 100 beta users:** $5-20/month (very reasonable)

### **Database:**
- Included with Replit deployment
- No separate database hosting costs

### **Custom Domain:**
- Included with Replit (no extra charge)
- You just need to own peacepad.ca

---

## 🎯 **Next Steps After Deployment**

1. ✅ **Test Thoroughly:**
   - Run through all features
   - Try on mobile devices
   - Check all pages load

2. ✅ **Configure Custom Domain:**
   - Set up peacepad.ca
   - Update Play Store listing with new URL

3. ✅ **Generate Android Package:**
   - Use [PWABuilder.com](https://www.pwabuilder.com/)
   - Enter your production URL: `https://peacepad.ca`
   - Download .aab file

4. ✅ **Submit to Play Store:**
   - Upload .aab file
   - Add screenshots, descriptions
   - Set Privacy Policy URL: `https://peacepad.ca/privacy`
   - Submit for review

5. ✅ **Beta Testing:**
   - Share production URL with small group first (10-20 users)
   - Collect feedback
   - Fix critical bugs
   - Then share with full 100-user WhatsApp group

---

## 🆘 **Getting Help**

**If Deployment Fails:**
1. Check deployment logs in Replit dashboard
2. Look for error messages
3. Common issues: missing secrets, build errors, database connection
4. Contact Replit support if needed

**If Database Issues:**
1. Check `DATABASE_URL` is set correctly
2. Verify database is created (check Replit dashboard)
3. Review server logs for connection errors

**If Domain Issues:**
1. Verify DNS records are correct
2. Wait full 60 minutes for propagation
3. Use [dnschecker.org](https://dnschecker.org/) to debug

---

## ✅ **Summary: Publishing is Easy!**

**No Git Required:**
- ✅ Publishing works without Git/GitHub sync
- ✅ Replit takes snapshot of current workspace
- ✅ Deploy with one click

**What You Get:**
- ✅ Production app running on Replit cloud
- ✅ Automatic production database (PostgreSQL)
- ✅ HTTPS/TLS configured automatically
- ✅ Autoscaling based on traffic
- ✅ Easy updates (just publish again)

**Ready to Publish:**
1. Click "Publish" button in Replit
2. Choose Autoscale deployment
3. Configure settings (name, secrets, commands)
4. Click Deploy
5. Wait 2-5 minutes
6. Test at production URL
7. Configure custom domain (peacepad.ca)
8. Submit to Play Store!

---

**Contact:** peacepad@peacepad.ca  
**Last Updated:** October 31, 2025  
**Status:** Ready to deploy! 🚀
