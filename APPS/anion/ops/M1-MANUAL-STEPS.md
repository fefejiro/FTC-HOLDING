# M1 Setup — Manual Completion Steps

> **Status:** ✅ Migrations applied. 🔄 Test accounts & roles pending (manual).

---

## Step 1: Verify Tables Exist (1 min)

Open this link in your browser:
```
https://aaaextkrfoqomzmjjkxe.supabase.co/editor?schema=public
```

**Verify you see these tables:**
- ✅ `profiles`
- ✅ `user_roles`
- ✅ `students`
- ✅ `parents`
- ✅ `tutors`
- ✅ `parent_student_links`

If all exist, continue.

---

## Step 2: Create Test Auth User #1 — Parent (2 min)

Go to:
```
https://aaaextkrfoqomzmjjkxe.supabase.co/auth/users
```

Click **[+ Create a new user]**

Fill in:
- **Email:** `test-parent-m1@example.com`
- **Password:** `TestPassword2026!Parent`
- **✓ Auto Confirm** — CHECK THIS BOX

Click **[Create user]**

**Result:** You should see the user appear in the list with a UUID (copy this UUID somewhere).

---

## Step 3: Create Test Auth User #2 — Tutor (2 min)

Click **[+ Create a new user]** again

Fill in:
- **Email:** `test-tutor-m1@example.com`
- **Password:** `TestPassword2026!Tutor`
- **✓ Auto Confirm** — CHECK THIS BOX

Click **[Create user]**

**Note the UUID.**

---

## Step 4: Create Test Auth User #3 — Admin (2 min)

Click **[+ Create a new user]** again

Fill in:
- **Email:** `test-admin-m1@example.com`
- **Password:** `TestPassword2026!Admin`
- **✓ Auto Confirm** — CHECK THIS BOX

Click **[Create user]**

**Note the UUID.**

---

## Step 5: Get Profile IDs (2 min)

Now that auth users exist, Supabase has **automatically created profiles** for them.

Go to:
```
https://aaaextkrfoqomzmjjkxe.supabase.co/editor?schema=public&table=profiles
```

**You should see 3 new rows:**

| auth_user_id | display_name | id (UUID) |
|---|---|---|
| [parent auth id] | test-parent-m1@example.com | **COPY THIS** |
| [tutor auth id] | test-tutor-m1@example.com | **COPY THIS** |
| [admin auth id] | test-admin-m1@example.com | **COPY THIS** |

**Save these 3 UUIDs** — you'll need them in the next step.

---

## Step 6: Assign Roles (3 min)

Go to:
```
https://aaaextkrfoqomzmjjkxe.supabase.co/editor?schema=public&table=user_roles
```

Click **[Insert row]** (top right)

**Row 1 — Parent:**
- `profile_id` = [UUID from step 5 for parent]
- `role` = `parent` (type exactly)

Click **Save**

**Row 2 — Tutor:**
Click **[Insert row]** again
- `profile_id` = [UUID from step 5 for tutor]
- `role` = `tutor`

Click **Save**

**Row 3 — Admin:**
Click **[Insert row]** again
- `profile_id` = [UUID from step 5 for admin]
- `role` = `admin`

Click **Save**

**Verify:** You should now see 3 rows in `user_roles` table.

---

## Step 7: Test Auth Flow — Parent (2 min)

Open the app:
```
https://anion.unalabs.cloud
```

Click **[Sign In]**

Enter email: `test-parent-m1@example.com`

Click **[Send Magic Link]**

**Check your email** for the magic link. It may take 30 seconds to arrive.

Click the link in the email.

**Expected result:**
- ✅ Redirected to `/parent` dashboard
- ✅ Open DevTools (F12) → Console → should show **0 errors** (red messages)

---

## Step 8: Test Auth Flow — Tutor (2 min)

Sign out (or open an incognito window):
```
https://anion.unalabs.cloud
```

Click **[Sign In]**

Enter email: `test-tutor-m1@example.com`

Click **[Send Magic Link]**

Check your email for the link.

**Expected result:**
- ✅ Redirected to `/tutor` dashboard
- ✅ Open DevTools → Console → **0 errors**

---

## Step 9: Test Auth Flow — Admin (2 min)

Sign out again and repeat:

Enter email: `test-admin-m1@example.com`

**Expected result:**
- ✅ Redirected to `/admin` dashboard
- ✅ Open DevTools → Console → **0 errors**

---

## Step 10: Verify RLS Works (2 min)

While signed in as **parent**, open DevTools:

1. Go to https://anion.unalabs.cloud (signed in as parent)
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Copy and paste this code:

```javascript
const { data, error } = await supabase.from("profiles").select("*");
console.log("Result:", data);
console.log("Error:", error);
```

**Expected result:**
- ✅ `data` array shows **exactly 1 row** (your own profile)
- ✅ If you see 3 rows, RLS is broken

If good, sign in as tutor and repeat — should also see 1 row (theirs only).

---

## Summary

| Step | Task | Status |
|------|------|--------|
| 1 | Verify tables exist | ✅ |
| 2 | Create parent auth user | ⏳ Your turn |
| 3 | Create tutor auth user | ⏳ Your turn |
| 4 | Create admin auth user | ⏳ Your turn |
| 5 | Get profile UUIDs | ⏳ Your turn |
| 6 | Assign roles (3 inserts) | ⏳ Your turn |
| 7 | Test parent login | ⏳ Your turn |
| 8 | Test tutor login | ⏳ Your turn |
| 9 | Test admin login | ⏳ Your turn |
| 10 | Verify RLS enforcement | ⏳ Your turn |

**Total time: ~20 min**

Once complete, M1 is production-ready for client handoff! ✨
