#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'aaaextkrfoqomzmjjkxe';
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${projectRef}.supabase.co`).replace(/\/+$/, '');
const subject = process.env.ANION_PHASE1_SUBJECT || 'Anion Phase 1 QA Live Classroom';
const bookingId = process.env.ANION_PHASE1_BOOKING_ID || '';
const startAt = process.env.ANION_PHASE1_START_AT || new Date(Date.now() + 60 * 60 * 1000).toISOString();
const durationMinutes = Number(process.env.ANION_PHASE1_DURATION_MINUTES || 60);
const outputDir = process.env.ANION_EVIDENCE_DIR || path.join(process.cwd(), 'test-results');

const roleEmails = {
  parent: process.env.ANION_PARENT_EMAIL || '',
  tutor: process.env.ANION_TUTOR_EMAIL || '',
  student: process.env.ANION_STUDENT_EMAIL || '',
};

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required.`);
}

function maskEmail(email) {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return '(invalid email)';
  return `${name.slice(0, 2)}***@${domain}`;
}

function getServiceRoleKeyFromCli() {
  const result = spawnSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--output-format', 'json'],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'supabase projects api-keys failed').trim());
  }

  const parsed = JSON.parse(result.stdout);
  const keys = Array.isArray(parsed?.keys) ? parsed.keys : Array.isArray(parsed) ? parsed : [];
  const serviceRole = keys.find((key) => key.id === 'service_role' && key.api_key)
    || keys.find((key) => key.name === 'service_role' && key.api_key)
    || keys.find((key) => key.type === 'secret' && key.secret_jwt_template?.role === 'service_role' && key.api_key);

  if (!serviceRole?.api_key) {
    throw new Error('Supabase service_role key was not returned by the CLI.');
  }

  return serviceRole.api_key;
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getServiceRoleKeyFromCli();

async function request(pathname, init = {}) {
  const response = await fetch(`${supabaseUrl}${pathname}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Supabase ${pathname} failed: HTTP ${response.status} ${text}`);
  }
  return body;
}

async function findAuthUser(email) {
  const direct = await request(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
  const directUsers = Array.isArray(direct?.users) ? direct.users : [];
  const directMatch = directUsers.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (directMatch) return directMatch;

  for (let page = 1; page <= 10; page += 1) {
    const listed = await request(`/auth/v1/admin/users?page=${page}&per_page=100`);
    const users = Array.isArray(listed?.users) ? listed.users : [];
    const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < 100) break;
  }

  return null;
}

async function upsertOne(table, row, onConflict) {
  const rows = await request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}&select=*`, {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  });
  if (!Array.isArray(rows) || !rows[0]) throw new Error(`No row returned from ${table} upsert.`);
  return rows[0];
}

async function updateBooking(row) {
  const rows = await request(`/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=*`, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!Array.isArray(rows) || !rows[0]) throw new Error(`Booking ${bookingId} was not found for update.`);
  return rows[0];
}

async function insertBooking(row) {
  const rows = await request('/rest/v1/bookings?select=*', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!Array.isArray(rows) || !rows[0]) throw new Error('No booking returned from insert.');
  return rows[0];
}

async function provisionRole(role, email) {
  const user = await findAuthUser(email);
  if (!user) {
    throw new Error(`${role} ${maskEmail(email)} is not in Supabase Auth yet. Sign in once with Google, then rerun this command.`);
  }

  const providers = Array.isArray(user.identities) ? user.identities.map((identity) => identity.provider) : [];
  if (!providers.includes('google')) {
    throw new Error(`${role} ${maskEmail(email)} exists but has no Google identity. Use a dedicated Google OAuth sign-in account.`);
  }

  const profile = await upsertOne(
    'profiles',
    {
      auth_user_id: user.id,
      display_name: user.user_metadata?.full_name || user.user_metadata?.name || `${role[0].toUpperCase()}${role.slice(1)} QA`,
      updated_at: new Date().toISOString(),
    },
    'auth_user_id',
  );
  await upsertOne('user_roles', { profile_id: profile.id, role }, 'profile_id,role');

  if (role === 'parent') {
    const parent = await upsertOne('parents', { profile_id: profile.id }, 'profile_id');
    return { user, profile, domain: parent };
  }

  if (role === 'student') {
    const student = await upsertOne('students', { profile_id: profile.id, grade_level: 'Phase 1 QA' }, 'profile_id');
    return { user, profile, domain: student };
  }

  const tutor = await upsertOne(
    'tutors',
    {
      profile_id: profile.id,
      headline: 'Anion Phase 1 QA Tutor',
      bio: 'Production QA tutor for authenticated video evidence.',
      subjects: ['Live Classroom QA'],
      hourly_rate_cents: 0,
    },
    'profile_id',
  );
  return { user, profile, domain: tutor };
}

async function main() {
  requireEnv('ANION_PARENT_EMAIL', roleEmails.parent);
  requireEnv('ANION_TUTOR_EMAIL', roleEmails.tutor);
  requireEnv('ANION_STUDENT_EMAIL', roleEmails.student);

  console.log('Provisioning Anion Phase 1 Google QA fixture');
  console.log(`Project: ${projectRef}`);
  console.log(`Parent: ${maskEmail(roleEmails.parent)}`);
  console.log(`Tutor: ${maskEmail(roleEmails.tutor)}`);
  console.log(`Student: ${maskEmail(roleEmails.student)}`);

  const parent = await provisionRole('parent', roleEmails.parent);
  const tutor = await provisionRole('tutor', roleEmails.tutor);
  const student = await provisionRole('student', roleEmails.student);

  await upsertOne('parent_student_links', { parent_id: parent.domain.id, student_id: student.domain.id }, 'parent_id,student_id');

  const bookingRow = {
    parent_id: parent.domain.id,
    tutor_id: tutor.domain.id,
    student_id: student.domain.id,
    subject,
    requested_start_at: startAt,
    duration_minutes: durationMinutes,
    notes: 'Production QA fixture for authenticated Google video evidence.',
    status: 'accepted',
    updated_at: new Date().toISOString(),
  };
  const booking = bookingId ? await updateBooking(bookingRow) : await insertBooking(bookingRow);

  fs.mkdirSync(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, `phase1-google-qa-fixture-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        projectRef,
        generatedAt: new Date().toISOString(),
        bookingId: booking.id,
        subject: booking.subject,
        roles: {
          parent: { email: maskEmail(roleEmails.parent), authUserId: parent.user.id, profileId: parent.profile.id, parentId: parent.domain.id },
          tutor: { email: maskEmail(roleEmails.tutor), authUserId: tutor.user.id, profileId: tutor.profile.id, tutorId: tutor.domain.id },
          student: { email: maskEmail(roleEmails.student), authUserId: student.user.id, profileId: student.profile.id, studentId: student.domain.id },
        },
      },
      null,
      2,
    ),
  );

  console.log('Provisioning complete.');
  console.log(`Booking ID: ${booking.id}`);
  console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);
  console.log('Run manual evidence with the same role emails and ANION_PHASE1_BOOKING_ID above.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
