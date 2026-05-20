# M1 Closure — Execution Guide for Client Handover

**Objective:** Close M1 (auth + role routing) and deploy to production for client use.  
**Timeline:** Today (2026-05-21)  
**Scope:** Auth wiring, RLS policies, role dashboards verified end-to-end.

---

## Step 1: Apply Supabase Migrations (M1 Foundation)

**Goal:** Apply the two core M1 migrations to production Supabase.

### Option A: Via Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/sql/new)
2. Create **New Query**
3. Paste the contents of **`APPS/anion/supabase/migrations/20260505_000001_init_foundation.sql`**
4. Click **Run** (wait for ✅ success)
5. Go back to **New Query**
6. Paste the contents of **`APPS/anion/supabase/migrations/20260506_000002_auth_rls.sql`**
7. Click **Run** (wait for ✅ success)
8. Verify in **Table Editor**: Check that `profiles`, `user_roles`, `students`, `parents`, `tutors` all exist

### Option B: Via Supabase CLI (if installed)

```bash
supabase login  # Authenticate with your Supabase account
supabase link --project-ref aaaextkrfoqomzmjjkxe  # Link to production project
supabase db push  # Applies all migrations in supabase/migrations/
```

**Status check after applying migrations:**
- [ ] `profiles` table exists
- [ ] `user_roles` table exists
- [ ] RLS policies enabled on both tables
- [ ] No SQL errors in execution log

---

## Step 2: Verify RLS Policies

**Goal:** Confirm that row-level security is enforced correctly.

### Manual Check in Dashboard

1. Go to **Table Editor** → `profiles`
2. Click **⚙️ Settings** → **RLS** 
3. Verify two policies exist:
   - `profiles_select_own` (select, authenticated)
   - `user_roles_select_own` (select, authenticated)
4. Status should show: **RLS enabled (2 policies)**

### Test RLS in Action

1. Sign in with a test account: `test-parent@example.com`
2. Open browser DevTools → **Console**
3. Run this query to verify RLS works:
   ```javascript
   const { data, error } = await supabase
     .from('profiles')
     .select('*');
   console.log(data);  // Should show ONLY your own profile, not all profiles
   ```
4. If RLS is working, you'll see 1 row (your own profile)
5. If RLS is broken, you'll see all profiles (security issue!)

**Status check:**
- [ ] RLS policies visible in dashboard
- [ ] Test user sees only their own profile
- [ ] No error messages in auth flow

---

## Step 3: Test Auth Flow End-to-End

**Goal:** Verify the full signup → callback → dashboard flow works in production.

### Test Case 1: Parent Signup & Redirect

1. Go to `https://anion.unalabs.cloud` (production URL)
2. Click **Sign In**
3. Enter a test email: `test-parent-1@example.com`
4. Click **Send Magic Link**
5. ✅ Should show: "Check your email for a magic link"
6. Open your email inbox (or check test email provider)
7. Click the magic link from Supabase
8. ✅ Should redirect to `/parent` dashboard
9. Verify page loads without console errors

### Test Case 2: Tutor Signup & Redirect

1. Go to `https://anion.unalabs.cloud`
2. Click **Sign In**
3. Enter: `test-tutor-1@example.com`
4. Click **Send Magic Link**
5. Open email and click magic link
6. ✅ Should redirect to `/tutor` dashboard

### Test Case 3: Admin Signup & Redirect

1. Repeat with `test-admin-1@example.com`
2. ✅ Should redirect to `/admin` dashboard

**Known Issue:** You'll need to manually assign roles to the test users. See **Step 4** below.

**Status check:**
- [ ] Parent account created and redirects to `/parent`
- [ ] Tutor account created and redirects to `/tutor`
- [ ] Admin account created and redirects to `/admin`
- [ ] No console errors on any dashboard
- [ ] Magic links expire correctly (test old links)

---

## Step 4: Manually Assign Roles to Test Users

**Goal:** Create role entries so test users can access the correct dashboards.

### Via Supabase Dashboard SQL

1. Go to [SQL Editor](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/sql/new)
2. Run this query to see all created users and their profiles:
   ```sql
   select p.id, p.display_name, p.auth_user_id
   from public.profiles p
   order by p.created_at desc;
   ```
3. Note the `id` of each profile you want to assign a role to.
4. For each profile, run:
   ```sql
   -- Assign "parent" role
   insert into public.user_roles (profile_id, role)
   values ('[PROFILE_ID_HERE]', 'parent');

   -- Or for tutor:
   insert into public.user_roles (profile_id, role)
   values ('[PROFILE_ID_HERE]', 'tutor');

   -- Or for admin:
   insert into public.user_roles (profile_id, role)
   values ('[PROFILE_ID_HERE]', 'admin');
   ```

### Alternative: Via Dashboard Table Editor

1. Go to **Table Editor** → `user_roles`
2. Click **Insert Row**
3. Fill in:
   - **profile_id**: (select from dropdown)
   - **role**: (select: `parent`, `tutor`, `admin`, or `student`)
4. Click **Save**
5. Repeat for each test user

**Status check:**
- [ ] At least 1 parent test account has role assigned
- [ ] At least 1 tutor test account has role assigned
- [ ] At least 1 admin test account has role assigned

---

## Step 5: Verify Dashboards Load Without Errors

**Goal:** Ensure no console errors or unhandled rejections on any role dashboard.

### Chrome DevTools Workflow

1. Sign in with parent account
2. Open **DevTools** (F12)
3. Go to **Console** tab
4. Filter to show only **Errors** (red)
5. ✅ Should be **0 errors**
6. Refresh the page and verify again
7. Repeat for `/tutor` and `/admin` pages

### What to look for:

```
❌ BAD (these must be fixed):
- "Cannot read properties of undefined"
- "Supabase client init failed"
- "RLS policy violation"
- Uncaught Promise Rejections (red)

✅ OK (these are normal):
- "Failed to load https://api.example.com" (if external APIs not configured)
- "Fetch error 401" (if features not yet wired)
```

**Status check:**
- [ ] `/parent` dashboard: 0 errors
- [ ] `/tutor` dashboard: 0 errors
- [ ] `/admin` dashboard: 0 errors
- [ ] No unhandled promise rejections

---

## Step 6: Cross-Browser Validation

**Goal:** Ensure app works in major browsers (M1 scope).

### Test Devices/Browsers

| Device | Browser | Status |
|--------|---------|--------|
| Desktop | Chrome v128+ | ☐ |
| Desktop | Firefox v123+ | ☐ |
| Desktop | Safari v17+ (if Mac) | ☐ |
| Mobile | Chrome iOS (iPhone) | ☐ |
| Mobile | Safari iOS | ☐ |
| Mobile | Chrome Android | ☐ |

### Quick Test per Browser

1. Go to `https://anion.unalabs.cloud`
2. Sign in
3. Verify redirect to correct dashboard
4. Refresh page
5. Session persists (no redirect to login)
6. Open DevTools/Console
7. No errors

**Status check:**
- [ ] At least 2 browsers tested (Chrome + 1 other)
- [ ] Mobile tested (iPhone or Android)
- [ ] Session persistence works across refresh

---

## Step 7: Deployment to Production Worker

**Goal:** Deploy the latest app build to Cloudflare Workers.

### Terminal Command

```bash
cd "C:\FTC HOLDING\APPS\anion"
npm run build
npm run deploy:worker
```

### Expected Output

```
✅ Uploaded to Cloudflare
📝 Worker deployed to https://anion.unalabs.cloud
🔍 Verify: https://anion.unalabs.cloud/api/health → {"ok":true}
```

### Verification

```bash
curl https://anion.unalabs.cloud/api/health
# Should return: {"ok":true,"service":"anion-web","timestamp":"..."}
```

**Status check:**
- [ ] Build succeeded (`npm run build`)
- [ ] Deployment succeeded (`npm run deploy:worker`)
- [ ] Health check returns 200
- [ ] Production app is live at `https://anion.unalabs.cloud`

---

## Step 8: No Secret Keys Leaked

**Goal:** Confirm no test/staging Stripe/Supabase keys are hardcoded in git.

### Git Scan

```bash
cd "C:\FTC HOLDING"
git grep -E "pk_test|sk_test|pk_live|sk_live|service_role" -- "APPS/anion/" || echo "✅ No test keys found"
```

### Expected Output

```
✅ No test keys found
```

### If keys ARE found

- Revoke them immediately in Stripe/Supabase dashboards
- Remove from code
- Create a new commit
- Push to GitHub

**Status check:**
- [ ] No `pk_test` or `sk_test` keys in repo
- [ ] No `service_role` key exposed in client code

---

## Step 9: Document Env Vars & Secrets (for Client Comms)

**Goal:** Provide client with a clear list of what's configured.

### Create HANDOFF-ENV-SUMMARY.md

```markdown
# Anion M1 Production — Environment Summary

**Deployment Date:** 2026-05-21  
**Version:** [worker version from CF dashboard]  
**URL:** https://anion.unalabs.cloud

## Configured Secrets (Set via Cloudflare Workers)

- ✅ `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key for client-side auth
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — Server-only key (never expose to client)

## NOT YET Configured (M2-M5 later)

- ☐ Stripe live keys (M3)
- ☐ Daily.co API key (M4)

## Test Accounts Ready

| Email | Role | Password | Status |
|-------|------|----------|--------|
| test-parent@example.com | Parent | [user sets via magic link] | ✅ Ready |
| test-tutor@example.com | Tutor | [user sets via magic link] | ✅ Ready |
| test-admin@example.com | Admin | [user sets via magic link] | ✅ Ready |

## Known Limitations (M1)

1. **No Booking System Yet** (M2) — You cannot request lessons
2. **No Billing** (M3) — Subscription/payment flows not live
3. **No Live Video** (M4) — Daily.co classroom not wired
4. **No Student Profiles** (M2) — Parent cannot manage linked students yet

These are coming in **Phase 2** (planned for next week).

## What IS Working (M1)

- ✅ Email signup with magic links
- ✅ Role-based dashboard routing
- ✅ Session persistence across page refresh
- ✅ Basic profile structure (ready for Phase 2)

## Support

For issues, email: [your-support-email]
```

**Status check:**
- [ ] Document created
- [ ] Test account emails listed
- [ ] Limitations clearly marked
- [ ] Next phase timeline communicated

---

## Checklist — Completion Status

| Phase | Task | Status | Blocker? |
|-------|------|--------|----------|
| 1 | Apply M1 migrations | ☐ | |
| 2 | Verify RLS policies | ☐ | |
| 3 | Test auth flow (parent) | ☐ | |
| 4 | Test auth flow (tutor) | ☐ | |
| 5 | Test auth flow (admin) | ☐ | |
| 6 | Assign roles to test accounts | ☐ | |
| 7 | Verify dashboards (no errors) | ☐ | |
| 8 | Cross-browser test | ☐ | |
| 9 | Deploy to production | ☐ | |
| 10 | Verify health endpoint | ☐ | |
| 11 | Scan for leaked keys | ☐ | |
| 12 | Document env summary | ☐ | |

---

## Next: Schedule Client Walkthrough

Once all steps above are ✅ complete, schedule a **30-minute walkthrough** with the client:

1. **Homepage walkthrough** (2 min)
   - Show app URL
   - Explain login flow
   
2. **Auth demo** (5 min)
   - Sign in as parent
   - Receive magic link
   - Show dashboard
   
3. **Role navigation** (5 min)
   - Sign out
   - Sign in as tutor (show different dashboard)
   - Sign in as admin (show admin area)

4. **Q&A + Sign-off** (3 min)
   - "Does M1 work as expected for your initial setup?"
   - Get client thumbs-up

5. **Preview Phase 2** (10 min)
   - Show roadmap: M2 (bookings), M3 (billing), M4 (video)
   - Discuss timeline

---

**Owner:** You  
**Target Completion:** End of day, 2026-05-21  
**Success Criteria:** All ✅ checkboxes filled, client sign-off captured
