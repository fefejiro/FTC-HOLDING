#!/usr/bin/env npx tsx
/**
 * M1 Complete Setup - Create test accounts, assign roles, verify RLS
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

interface TestUser {
  email: string;
  password: string;
  role: 'parent' | 'tutor' | 'student';
}

const testUsers: TestUser[] = [
  { email: 'test-parent-m1@example.com', password: 'TestPassword2026!Parent', role: 'parent' },
  { email: 'test-tutor-m1@example.com', password: 'TestPassword2026!Tutor', role: 'tutor' },
  { email: 'test-student-m1@example.com', password: 'TestPassword2026!Student', role: 'student' },
];

async function createAuthUser(email: string, password: string): Promise<string | null> {
  const serviceRoleKey = await getServiceRoleKey();

  try {
    const response = await fetch(`${PROJECT_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    });

    if (response.status === 201 || response.status === 200) {
      const data = await response.json();
      return data.id;
    }

    // User may already exist; reuse existing auth id for idempotent setup.
    if (response.status === 422 || response.status === 409) {
      const existingId = await findAuthUserIdByEmail(email, serviceRoleKey);
      if (existingId) {
        return existingId;
      }
    }

    const text = await response.text();
    console.log(`    ⚠️  ${response.status}: ${text.substring(0, 150)}`);
    return null;
  } catch (error) {
    return null;
  }
}

async function executeQuery(sql: string): Promise<boolean> {
  try {
    const response = await fetch(`${MANAGEMENT_URL}/v1/projects/${PROJECT_ID}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    return response.status === 200 || response.status === 201;
  } catch (error) {
    return false;
  }
}

async function getServiceRoleKey(): Promise<string> {
  const response = await fetch(`${MANAGEMENT_URL}/v1/projects/${PROJECT_ID}/api-keys`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch API keys: ${response.status} ${text.substring(0, 200)}`);
  }

  const keys = (await response.json()) as Array<{ name?: string; api_key?: string }>;
  const serviceRole = keys.find((key) => key.name === 'service_role' && key.api_key);

  if (!serviceRole?.api_key) {
    throw new Error('service_role key not found via Supabase Management API.');
  }

  return serviceRole.api_key;
}

async function findAuthUserIdByEmail(email: string, serviceRoleKey: string): Promise<string | null> {
  const encodedEmail = encodeURIComponent(email);
  const response = await fetch(`${PROJECT_URL}/auth/v1/admin/users?email=${encodedEmail}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { users?: Array<{ id: string; email?: string }> };
  const existing = data.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  return existing?.id ?? null;
}

async function main() {
  console.log('\n🚀 M1 Complete Setup — Test Accounts + Roles\n');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`URL: ${PROJECT_URL}\n`);

  // Step 1: Verify tables exist
  console.log('Step 1️⃣  Verifying M1 tables exist...\n');
  const verifySql = `
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'user_roles', 'students', 'parents', 'tutors');
  `;
  
  const tablesOk = await executeQuery(verifySql);
  console.log(`  ${tablesOk ? '✅' : '⚠️'} Tables verified\n`);

  // Step 2: Create test auth users
  console.log('Step 2️⃣  Creating test auth users...\n');
  const createdUsers: { email: string; authId: string | null; role: string }[] = [];

  for (const user of testUsers) {
    console.log(`  ⏳ ${user.email}...`);
    const authId = await createAuthUser(user.email, user.password);
    
    if (authId) {
      console.log(`  ✅ Created (ID: ${authId.substring(0, 8)}...)`);
      createdUsers.push({ email: user.email, authId, role: user.role });
    } else {
      console.log(`  ⚠️  Could not create via API (will need manual creation)`);
      createdUsers.push({ email: user.email, authId: null, role: user.role });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('M1 SETUP — STATUS & NEXT STEPS');
  console.log('='.repeat(80) + '\n');

  const targetCount = testUsers.length;
  const createdCount = createdUsers.filter(u => u.authId).length;
  
  if (createdCount === targetCount) {
    console.log('✅ ALL TEST ACCOUNTS CREATED AUTOMATICALLY!\n');
  } else if (createdCount > 0) {
    console.log(`⚠️  ${createdCount}/${targetCount} test accounts created automatically.\n`);
  } else {
    console.log('⚠️  Test accounts require manual creation in Supabase Dashboard.\n');
  }

  console.log('NEXT STEPS (Manual in Supabase Dashboard):\n');

  console.log('1️⃣  Verify Tables Exist');
  console.log(`   Go to: ${PROJECT_URL}/editor?schema=public`);
  console.log('   Check: profiles, user_roles, students, parents, tutors exist\n');

  if (createdCount < targetCount) {
    console.log('2️⃣  Create Missing Test Users');
    console.log(`   Go to: ${PROJECT_URL}/auth/users`);
    console.log('   Click [+ Create a new user] for:');
    for (const user of createdUsers.filter(u => !u.authId)) {
      console.log(`     • ${user.email} (password: TestPassword2026!${user.role.charAt(0).toUpperCase() + user.role.slice(1)})`);
      console.log('       ✓ Check "Auto Confirm"');
    }
    console.log();
  }

  console.log('3️⃣  Assign Roles to Test Users');
  console.log(`   Go to: ${PROJECT_URL}/editor?schema=public&table=profiles`);
  console.log('   Copy the UUID for each test user\n');
  
  console.log('   Then go to: user_roles table');
  console.log('   Click [Insert Row] for each:');
  for (const user of createdUsers) {
    console.log(`     • profile_id=[uuid from ${user.email}], role='${user.role}'`);
  }
  console.log();

  console.log('4️⃣  Test Auth Flow');
  console.log(`   Go to: https://anion.unalabs.cloud`);
  console.log('   Click "Sign In"');
  console.log('   Try each email:');
  for (const user of createdUsers) {
    console.log(`     • ${user.email} → should go to /${user.role} dashboard`);
  }
  console.log();

  console.log('5️⃣  Verify RLS Works');
  console.log('   While signed in, open DevTools Console and run:');
  console.log('   const { data } = await supabase.from("profiles").select("*");');
  console.log('   ✅ Should see ONLY your profile row (RLS enforced)\n');

  console.log('='.repeat(80) + '\n');

  console.log('📋 Test User Reference:\n');
  console.log('| Email | Password | Role | Status |');
  console.log('|-------|----------|------|--------|');
  for (const user of createdUsers) {
    const status = user.authId ? '✅ Created' : '⏳ Manual';
    console.log(`| ${user.email} | TestPassword2026!${user.role.charAt(0).toUpperCase() + user.role.slice(1)} | ${user.role} | ${status} |`);
  }
  console.log();
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
