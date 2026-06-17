import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260616_000020_whiteboard_events_mvp.sql'),
  'utf8',
);

test('whiteboard migration creates booking-scoped event storage with MVP event types', () => {
  assert.match(migration, /create table if not exists public\.whiteboard_events/);
  assert.match(migration, /booking_id uuid not null references public\.bookings\(id\)/);
  assert.match(migration, /author_role text not null check \(author_role in \('student', 'tutor'\)\)/);
  assert.match(migration, /event_type text not null check \(event_type in \('stroke', 'erase', 'clear'\)\)/);
  assert.match(migration, /payload jsonb not null/);
});

test('whiteboard migration enables RLS for assigned tutor and student only', () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /whiteboard_events_select_assigned_student_tutor/);
  assert.match(migration, /whiteboard_events_insert_assigned_student_tutor/);
  assert.match(migration, /b\.student_id = public\.current_student_id\(\)/);
  assert.match(migration, /b\.tutor_id = public\.current_tutor_id\(\)/);
  assert.match(migration, /author_profile_id = public\.current_profile_id\(\)/);
});

test('whiteboard migration registers realtime changes for live canvas sync', () => {
  assert.match(migration, /alter publication supabase_realtime add table public\.whiteboard_events/);
});
