#!/usr/bin/env npx tsx
/**
 * M1 Setup Helper - Prepares migrations and test data
 * 
 * Since Supabase CLI is not available, this script:
 * 1. Reads M1 migrations
 * 2. Outputs SQL for dashboard execution
 * 3. Logs setup instructions
 */

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = 'aaaextkrfoqomzmjjkxe';
const PROJECT_URL = `https://${PROJECT_ID}.supabase.co`;

const migrations = [
  '20260505_000001_init_foundation.sql',
  '20260506_000002_auth_rls.sql',
];

async function main() {
  console.log('\n🚀 M1 Setup Helper\n');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`URL: ${PROJECT_URL}\n`);

  // Read migrations
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationContents: { [key: string]: string } = {};

  console.log('📋 Reading M1 Migrations:\n');
  for (const mig of migrations) {
    const filePath = path.join(migrationsDir, mig);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      migrationContents[mig] = content;
      console.log(`  ✅ ${mig} (${content.split('\n').length} lines)`);
    } else {
      console.log(`  ❌ ${mig} not found at ${filePath}`);
      process.exit(1);
    }
  }

  // Output instructions
  console.log('\n' + '='.repeat(80));
  console.log('MANUAL EXECUTION STEPS');
  console.log('='.repeat(80) + '\n');

  console.log('Step 1: Go to Supabase Dashboard');
  console.log(`  URL: ${PROJECT_URL}/project/${PROJECT_ID}/sql/new\n`);

  console.log('Step 2: Run Migration #1 (Foundation)\n');
  console.log('  Copy & paste this SQL:\n');
  console.log('---8<--- START COPY ---8<---\n');
  console.log(migrationContents[migrations[0]]);
  console.log('\n---8<--- END COPY ---8<---\n');
  console.log('  Then click [Run]\n');
  console.log('  ✅ You should see tables: profiles, user_roles, students, parents, tutors\n');

  console.log('Step 3: Run Migration #2 (RLS Policies)\n');
  console.log('  Copy & paste this SQL:\n');
  console.log('---8<--- START COPY ---8<---\n');
  console.log(migrationContents[migrations[1]]);
  console.log('\n---8<--- END COPY ---8<---\n');
  console.log('  Then click [Run]\n');
  console.log('  ✅ You should see: RLS enabled on profiles and user_roles\n');

  // Test account creation instructions
  console.log('Step 4: Create Test Accounts\n');
  console.log('  Go to: ' + PROJECT_URL + '/auth/users\n');
  console.log('  Click [+ Create a new user] and add:\n');
  console.log('    Email: test-parent-m1@example.com');
  console.log('    Password: TestPassword2026!Parent');
  console.log('    Auto Confirm: ✓ Yes\n');
  console.log('    Email: test-tutor-m1@example.com');
  console.log('    Password: TestPassword2026!Tutor');
  console.log('    Auto Confirm: ✓ Yes\n');
  console.log('    Email: test-admin-m1@example.com');
  console.log('    Password: TestPassword2026!Admin');
  console.log('    Auto Confirm: ✓ Yes\n');

  // Role assignment instructions
  console.log('Step 5: Assign Roles\n');
  console.log('  Go to: ' + PROJECT_URL + `/editor?schema=public&search=${encodeURIComponent('user_roles')}\n`);
  console.log('  Get profile IDs:\n');
  console.log(`    Go to: ${PROJECT_URL}/editor?schema=public&table=profiles\n`);
  console.log('    Note the ID for each user\n');
  console.log('  Then in user_roles table, insert:\n');
  console.log('    profile_id: [parent_id], role: parent');
  console.log('    profile_id: [tutor_id], role: tutor');
  console.log('    profile_id: [admin_id], role: admin\n');

  // Verification
  console.log('Step 6: Test Auth Flow\n');
  console.log('  Go to: https://anion.unalabs.cloud\n');
  console.log('  Sign in as test-parent-m1@example.com with password TestPassword2026!Parent\n');
  console.log('  ✅ Should redirect to /parent dashboard');
  console.log('  ✅ Open DevTools (F12) → Console → Should have 0 errors\n');

  console.log('Step 7: Verify RLS\n');
  console.log('  After signing in, run in DevTools Console:\n');
  console.log('    const { data, error } = await supabase.from("profiles").select("*");');
  console.log('    console.log(data);  // Should show ONLY your own profile\n');
  console.log('  ✅ If RLS works, you see 1 row (your profile)');
  console.log('  ❌ If RLS broken, you see all profiles\n');

  console.log('='.repeat(80) + '\n');
  console.log('✅ All steps prepared. Follow the steps above in order.\n');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
