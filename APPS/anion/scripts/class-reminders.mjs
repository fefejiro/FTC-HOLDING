#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'aaaextkrfoqomzmjjkxe';
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${projectRef}.supabase.co`).replace(/\/+$/, '');
const lookaheadHours = Number(process.env.ANION_REMINDER_LOOKAHEAD_HOURS || 25);
const toleranceMinutes = Number(process.env.ANION_REMINDER_TOLERANCE_MINUTES || 10);
const sendEnabled = process.env.ANION_REMINDER_SEND === '1';
const resendApiKey = process.env.RESEND_API_KEY || '';
const fromEmail = process.env.ANION_REMINDER_FROM_EMAIL || '';

const reminderCheckpoints = [
  { key: '24h', minutesBeforeStart: 24 * 60, label: '24 hours before class' },
  { key: '1h', minutesBeforeStart: 60, label: '1 hour before class' },
  { key: '10m', minutesBeforeStart: 10, label: '10 minutes before class' },
];

function getServiceRoleKeyFromCli() {
  if (!/^[a-z0-9]+$/.test(projectRef)) {
    throw new Error('SUPABASE_PROJECT_REF contains unexpected characters.');
  }

  const args = ['supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'];
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `npx ${args.join(' ')}`], { encoding: 'utf8' })
    : spawnSync('npx', args, { encoding: 'utf8' });

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

function requireEmailConfigIfSending() {
  if (!sendEnabled) return;
  if (!resendApiKey) throw new Error('RESEND_API_KEY is required when ANION_REMINDER_SEND=1.');
  if (!fromEmail) throw new Error('ANION_REMINDER_FROM_EMAIL is required when ANION_REMINDER_SEND=1.');
}

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

function inFilter(values) {
  return `in.(${values.map((value) => String(value).replace(/[(),]/g, '')).join(',')})`;
}

function minutesUntil(startAt, nowMs) {
  return Math.round((new Date(startAt).getTime() - nowMs) / 60_000);
}

function dueCheckpoint(booking, nowMs) {
  const minutes = minutesUntil(booking.requested_start_at, nowMs);
  if (minutes < 0) return null;
  return reminderCheckpoints.find(
    (checkpoint) => Math.abs(minutes - checkpoint.minutesBeforeStart) <= toleranceMinutes,
  ) ?? null;
}

async function profileRowsForDomainRows(table, ids) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const rows = await request(`/rest/v1/${table}?select=id,profile_id&id=${encodeURIComponent(inFilter(uniqueIds))}`);
  return new Map((rows ?? []).map((row) => [row.id, row.profile_id]));
}

async function profileDetails(profileIds) {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const rows = await request(`/rest/v1/profiles?select=id,auth_user_id,display_name&id=${encodeURIComponent(inFilter(uniqueIds))}`);
  return new Map((rows ?? []).map((row) => [row.id, row]));
}

async function authEmail(authUserId) {
  if (!authUserId) return null;
  const user = await request(`/auth/v1/admin/users/${encodeURIComponent(authUserId)}`);
  return user?.email ?? null;
}

async function sendEmail({ to, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Resend failed for ${to}: HTTP ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function reminderMessage({ booking, checkpoint, role, displayName }) {
  const start = new Date(booking.requested_start_at).toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Toronto',
  });

  return {
    subject: `Anion class reminder: ${booking.subject} starts ${checkpoint.label}`,
    html: [
      `<p>Hello ${displayName || role},</p>`,
      `<p>This is your Anion reminder for <strong>${booking.subject}</strong>.</p>`,
      `<p><strong>Start:</strong> ${start}</p>`,
      `<p><strong>Duration:</strong> ${booking.duration_minutes} minutes</p>`,
      `<p>Please open your Anion dashboard before class. The lesson room opens 10 minutes before start time.</p>`,
    ].join(''),
  };
}

async function run() {
  requireEmailConfigIfSending();

  const now = new Date(process.env.ANION_REMINDER_NOW || Date.now());
  const nowMs = now.getTime();
  const windowStart = new Date(nowMs - toleranceMinutes * 60_000).toISOString();
  const windowEnd = new Date(nowMs + lookaheadHours * 60 * 60_000).toISOString();

  const bookings = await request(
    `/rest/v1/bookings?select=id,parent_id,tutor_id,student_id,subject,requested_start_at,duration_minutes,status&status=eq.accepted&requested_start_at=gte.${encodeURIComponent(windowStart)}&requested_start_at=lte.${encodeURIComponent(windowEnd)}&order=requested_start_at.asc`,
  );

  const dueBookings = (bookings ?? [])
    .map((booking) => ({ booking, checkpoint: dueCheckpoint(booking, nowMs) }))
    .filter((entry) => entry.checkpoint);

  const tutorProfileById = await profileRowsForDomainRows('tutors', dueBookings.map((entry) => entry.booking.tutor_id));
  const studentProfileById = await profileRowsForDomainRows('students', dueBookings.map((entry) => entry.booking.student_id));
  const profiles = await profileDetails([
    ...tutorProfileById.values(),
    ...studentProfileById.values(),
  ]);

  const reminders = [];
  for (const { booking, checkpoint } of dueBookings) {
    const recipients = [
      { role: 'tutor', profileId: tutorProfileById.get(booking.tutor_id) },
      { role: 'student', profileId: studentProfileById.get(booking.student_id) },
    ];

    for (const recipient of recipients) {
      const profile = profiles.get(recipient.profileId);
      const email = await authEmail(profile?.auth_user_id);
      if (!email) continue;

      const message = reminderMessage({
        booking,
        checkpoint,
        role: recipient.role,
        displayName: profile?.display_name,
      });

      const result = {
        bookingId: booking.id,
        checkpoint: checkpoint.key,
        role: recipient.role,
        to: email,
        subject: message.subject,
        sent: false,
      };

      if (sendEnabled) {
        await sendEmail({ to: email, ...message });
        result.sent = true;
      }

      reminders.push(result);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode: sendEnabled ? 'send' : 'dry-run',
    now: now.toISOString(),
    windowStart,
    windowEnd,
    bookingsChecked: bookings?.length ?? 0,
    reminders,
  }, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
