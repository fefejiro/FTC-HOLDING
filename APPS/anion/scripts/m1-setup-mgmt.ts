#!/usr/bin/env npx tsx
/**
 * M1 Setup - Uses Supabase Management API to Execute Migrations
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = 'aaaextkrfoqomzmjjkxe';
const PROJECT_URL = `https://${PROJECT_ID}.supabase.co`;
const MANAGEMENT_URL = `https://api.supabase.com`;
const ACCESS_TOKEN = process.env.SUPABASE_API_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ SUPABASE_API_TOKEN not set');
  process.exit(1);
}

async function executeSqlViaManagementApi(sql: string): Promise<boolean> {
  try {
    const response = await fetch(`${MANAGEMENT_URL}/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.status === 200 || response.status === 201) {
      return true;
    }

    if (response.status !== 401 && response.status !== 403) {
      const text = await response.text();
      console.log(`    Response: ${response.status} - ${text.substring(0, 100)}`);
      return false;
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\n🚀 M1 Setup - Management API\n');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`URL: ${PROJECT_URL}\n`);

  // Step 1: Apply migrations
  console.log('Step 1️⃣  Applying M1 Migrations via Management API...\n');

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrations = [
    '20260505_000001_init_foundation.sql',
    '20260506_000002_auth_rls.sql',
  ];

  let successCount = 0;

  for (const mig of migrations) {
    const filePath = path.join(migrationsDir, mig);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`  ⏳ ${mig}...`);
    const success = await executeSqlViaManagementApi(sql);

    if (success) {
      console.log(`  ✅ Applied`);
      successCount++;
    } else {
      console.log(`  ⚠️  Could not apply via API (will need manual execution)`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('M1 SETUP — NEXT STEPS');
  console.log('='.repeat(80) + '\n');

  if (successCount === 2) {
    console.log('✅ MIGRATIONS APPLIED AUTOMATICALLY!\n');
    console.log('Continue with:\n');
  } else {
    console.log('⚠️  Migrations require manual execution in Supabase Dashboard.\n');
    console.log('Follow these steps:\n');
  }

  console.log('Step 1: Verify Tables Exist');
  console.log(`  Go to: ${PROJECT_URL}/editor?schema=public`);
  console.log('  Check that you see: profiles, user_roles, students, parents, tutors\n');

  console.log('Step 2: Create Test Auth Users');
  console.log(`  Go to: ${PROJECT_URL}/auth/users`);
  console.log('  Click [+ Create a new user] and add:\n');
  console.log('    test-parent-m1@example.com (password: TestPassword2026!Parent)');
  console.log('    test-tutor-m1@example.com (password: TestPassword2026!Tutor)');
  console.log('    test-admin-m1@example.com (password: TestPassword2026!Admin)\n');
  console.log('  Make sure to check "Auto Confirm"  for each.\n');

  console.log('Step 3: Get Profile IDs');
  console.log(`  Go to: ${PROJECT_URL}/editor?schema=public&table=profiles`);
  console.log('  Note the UUID for each profile created.\n');

  console.log('Step 4: Assign Roles');
  console.log(`  Go to: ${PROJECT_URL}/editor?schema=public&table=user_roles`);
  console.log('  Click [Insert Row] for each:');
  console.log('    • profile_id: [parent_uuid], role: parent');
  console.log('    • profile_id: [tutor_uuid], role: tutor');
  console.log('    • profile_id: [admin_uuid], role: admin\n');

  console.log('Step 5: Test Auth Flow');
  console.log('  Go to: https://anion.unalabs.cloud');
  console.log('  Click "Sign In"');
  console.log('  Enter: test-parent-m1@example.com');
  console.log('  Click "Send Magic Link"');
  console.log('  Check your email and click the link');
  console.log('  ✅ Should redirect to /parent dashboard');
  console.log('  ✅ Open DevTools (F12) → Console → should show 0 errors\n');

  console.log('Step 6: Verify RLS Works');
  console.log('  While signed in, open DevTools Console and run:');
  console.log('  ```');
  console.log('  const { data } = await supabase.from("profiles").select("*");');
  console.log('  console.log(data);');
  console.log('  ```');
  console.log('  ✅ Should see ONLY your profile row (RLS working)');
  console.log('  ❌ If you see all profiles, RLS is broken\n');

  console.log('Step 7: Test Other Roles');
  console.log('  Repeat steps 5-6 with:');
  console.log('    • test-tutor-m1@example.com → should go to /tutor');
  console.log('    • test-admin-m1@example.com → should go to /admin\n');

  console.log('='.repeat(80) + '\n');

  if (successCount === 2) {
    console.log('✅ Migrations applied! Continue with Step 1 above.\n');
  } else {
    console.log('⚠️  Manual migration steps listed above.\n');
    console.log('If you need the SQL to copy-paste:\n');
    console.log('  Run: npx tsx scripts/m1-setup-manual.ts\n');
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
