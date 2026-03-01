# PeacePad Development Deployment Setup Checklist

This guide walks you through creating a separate development deployment for `dev.peacepad.ca`.

---

## Prerequisites

- ✅ Production deployment running at `peacepad.ca`
- ✅ Access to Replit dashboard
- ✅ DNS control for `dev.peacepad.ca`
- ✅ Neon database account (for separate dev database)

---

## Step 1: Fork This Replit Project

1. **In Replit**, click the three dots menu on this project
2. Select **"Fork Repl"**
3. Name it: `PeacePad-Development`
4. Click **Fork**

This creates an independent copy for development.

⚠️ **IMPORTANT - Security First:**
After forking, **immediately scrub all inherited secrets** to prevent production credentials from leaking:
1. Go to **Tools** → **Secrets**
2. Delete all secrets (they were copied from production)
3. You'll add dev-specific secrets in Step 3

---

## Step 2: Create Development Database

### Option A: Using Neon (Recommended)

1. Go to [Neon Console](https://console.neon.tech)
2. Click **"New Project"**
3. Name: `PeacePad-Development`
4. Select same region as production
5. Click **Create Project**
6. Copy the connection string (starts with `postgresql://`)

### Option B: Using Replit PostgreSQL

1. In the dev Repl, go to **Tools** → **Database**
2. Click **Add PostgreSQL**
3. Wait for database to provision
4. Connection details will be auto-populated in secrets

---

## Step 3: Configure Environment Variables

In the **dev deployment**, set these environment secrets:

### Required Secrets

```
DATABASE_URL
```
- Value: Connection string from Step 2
- Example: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/peacepad_dev`

```
CUSTOM_DOMAINS
```
- Value: `dev.peacepad.ca`
- ⚠️ **Important**: Only the dev domain, NOT production domains

```
SESSION_SECRET
```
- Value: Generate a new random string (different from production!)
- Generate with: `openssl rand -base64 32` (in terminal)
- Or use: https://randomkeygen.com/

```
OPENAI_API_KEY
```
- Value: Your OpenAI API key
- Can use same as production OR use a separate dev key with lower limits

### Optional Secrets

```
PGPASSWORD
PGUSER
PGDATABASE
PGHOST
PGPORT
```
- These are auto-populated by Replit if using Replit PostgreSQL
- For Neon, extract from DATABASE_URL if needed

---

## Step 4: Initialize Development Database

In the dev Repl terminal:

```bash
# Install dependencies (if not already)
npm install

# Push database schema to dev database
npm run db:push
```

If you get a data-loss warning:
```bash
npm run db:push --force
```

⚠️ **Before using --force:**
- This is safe on a **fresh** dev database (no production data)
- If the dev DB has test data you want to keep, back it up first
- In Neon: Use the console to create a snapshot before force-pushing
- In Replit PostgreSQL: Export data first if needed

**Note:** Replit Auth will auto-register the dev domain strategy when you first access `/api/login`. Check server logs for:
```
[Auth] Dynamically registering strategy for allowed domain: dev.peacepad.ca
[Auth] Strategy registered: replitauth:dev.peacepad.ca
```

---

## Step 5: Configure DNS for dev.peacepad.ca

### In Your DNS Provider (e.g., Namecheap, Cloudflare, GoDaddy)

1. Add a new **CNAME record**:
   - **Type**: CNAME
   - **Name**: `dev` (or `dev.peacepad.ca` depending on provider)
   - **Value**: Your dev Repl's URL (e.g., `peacepad-development.yourusername.repl.co`)
   - **TTL**: 300 (5 minutes)

2. Wait 5-10 minutes for DNS propagation

### In Replit Deployment Settings

1. Go to your dev Repl
2. Click **Deploy** → **Publishing**
3. Under **Custom Domains**, add: `dev.peacepad.ca`
4. Click **Add domain**
5. Wait for SSL certificate to provision (~5 minutes)

---

## Step 6: Deploy Development Environment

1. In the dev Repl, click **Deploy**
2. Click **Publish**
3. Review any schema conflicts (should be none for first deploy)
4. Click **Submit**
5. Wait for deployment to complete

---

## Step 7: Verify Development Deployment

### Test Checklist

- [ ] Visit `https://dev.peacepad.ca` - Page loads without errors
- [ ] Click **Login** - OAuth flow works
- [ ] **Check deployment logs** - Confirm auth strategy registered:
  ```
  [Auth] Dynamically registering strategy for allowed domain: dev.peacepad.ca
  [Auth] Strategy registered: replitauth:dev.peacepad.ca
  ```
- [ ] Create test account - Registration works
- [ ] Create test partnership - Partnership system works
- [ ] Add test expense - Expense tracking works
- [ ] Check browser console - No errors
- [ ] Verify database - Data appears in dev database (not production!)

### Verify Environment Isolation

- [ ] Login on `dev.peacepad.ca` → Should NOT be logged in on `peacepad.ca`
- [ ] Check dev database → Should have separate data from production
- [ ] Test data on dev → Should NOT appear on production

---

## Step 8: Production Deployment - Update CUSTOM_DOMAINS

**⚠️ Critical**: Update production to remove dev domains

### In Production Repl

1. Go to production Repl secrets
2. Update `CUSTOM_DOMAINS` to: `peacepad.ca,support.peacepad.ca`
3. Remove `dev.peacepad.ca` and `api.peacepad.ca` from production
4. Redeploy production

This ensures production only authenticates for production domains.

---

## Step 9: Development Workflow

### Daily Development Flow

1. **Code changes** → Make in dev Repl
2. **Test locally** → Use dev.peacepad.ca
3. **Database migrations** → Test with `npm run db:push` on dev
4. **Deploy to dev** → Test with real users (if needed)
5. **When stable** → Merge code to production Repl
6. **Deploy production** → After thorough testing on dev

### Syncing Changes from Dev to Production

**Option A: Manual Copy (Simple)**
1. Copy changed files from dev to production Repl
2. Test in production
3. Deploy production

**Option B: Git Workflow (Recommended)**
1. Push dev Repl to GitHub
2. Pull changes in production Repl
3. Test and deploy production

---

## Troubleshooting

### Issue: "Unknown authentication strategy"

**Cause**: CUSTOM_DOMAINS not set correctly

**Fix**: 
- Verify `CUSTOM_DOMAINS=dev.peacepad.ca` (no extra spaces, commas)
- Restart deployment

### Issue: Database connection failed

**Cause**: DATABASE_URL incorrect or database not accessible

**Fix**:
- Verify DATABASE_URL format: `postgresql://user:pass@host/database`
- Check database is running (Neon console or Replit database panel)
- Test connection with: `npx drizzle-kit studio`

### Issue: Session cookies shared between prod and dev

**Cause**: Cookie domain misconfigured

**Fix**:
- This shouldn't happen with separate deployments
- Verify you're using different SESSION_SECRET for each
- Clear browser cookies and test again

### Issue: DNS not working for dev.peacepad.ca

**Cause**: DNS propagation delay or incorrect CNAME

**Fix**:
- Wait 15-30 minutes for DNS propagation
- Test with: `nslookup dev.peacepad.ca`
- Verify CNAME points to correct Repl URL

---

## Security Checklist

After setup, verify:

- [ ] Dev and production use different SESSION_SECRET
- [ ] Dev and production use different databases
- [ ] CUSTOM_DOMAINS configured separately for each environment
- [ ] No production API keys in dev environment (or use separate keys)
- [ ] Test data cannot leak to production
- [ ] Production cookies don't work on dev domain

---

## Maintenance

### Regular Tasks

- **Weekly**: Check dev database size, purge old test data
- **Monthly**: Rotate SESSION_SECRET on dev (if handling sensitive test data)
- **Before major releases**: Sync production database schema to dev (anonymized data only)
- **Before schema changes**: Create database snapshot in case rollback is needed

### Database Snapshot Workflow

**Before running `npm run db:push --force` on dev:**

1. **For Neon databases:**
   - Go to Neon Console → Your dev project
   - Click **Restore** → **Create snapshot**
   - Name it: `pre-schema-change-YYYY-MM-DD`
   - This allows rollback if something breaks

2. **For Replit PostgreSQL:**
   - Export critical test data first (if any)
   - Or accept that you can rebuild from schema

3. **After successful schema push:**
   - Test all features
   - If everything works, you can delete the snapshot after a few days

### Backup Strategy

- **Production**: Daily automated backups (Neon/Replit) - **NEVER SKIP**
- **Development**: Snapshots before major schema changes (optional but recommended)
- **Both environments**: Test backup restoration quarterly to ensure recovery works

---

## Complete! 🎉

You now have:
- ✅ Isolated development environment at `dev.peacepad.ca`
- ✅ Separate databases for prod and dev
- ✅ Secure authentication on both environments
- ✅ Safe testing environment that can't break production

**Next Steps:**
- Add test data to dev environment
- Invite team members to dev deployment
- Set up monitoring for both environments
