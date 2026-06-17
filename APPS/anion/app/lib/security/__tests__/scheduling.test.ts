import assert from 'node:assert/strict';
import test from 'node:test';
import { getClassReminderStatus, getLessonJoinWindowStatus } from '../../bookings';
import { generateRecurringOccurrences } from '../../scheduling';

test('generateRecurringOccurrences creates eight weeks of Lagos recurring sessions in UTC', () => {
  const occurrences = generateRecurringOccurrences({
    daysOfWeek: [3, 5],
    startTime: '21:00',
    startDate: '2026-06-17',
    durationMinutes: 50,
    bufferMinutes: 10,
    timezone: 'Africa/Lagos',
  });

  assert.equal(occurrences.length, 16);
  assert.equal(occurrences[0].requestedStartAt, '2026-06-17T20:00:00.000Z');
  assert.equal(occurrences[0].durationMinutes, 50);
  assert.equal(occurrences[0].bufferMinutes, 10);
});

test('generateRecurringOccurrences honors an inclusive end date', () => {
  const occurrences = generateRecurringOccurrences({
    daysOfWeek: [3],
    startTime: '21:00',
    startDate: '2026-06-17',
    endDate: '2026-06-17',
    timezone: 'Africa/Lagos',
  });

  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].requestedStartAt, '2026-06-17T20:00:00.000Z');
});

test('generateRecurringOccurrences rejects unsupported timezones for PR1', () => {
  assert.throws(
    () => generateRecurringOccurrences({
      daysOfWeek: [3],
      startTime: '21:00',
      startDate: '2026-06-17',
      timezone: 'America/Toronto',
    }),
    /Africa\/Lagos/,
  );
});

test('getLessonJoinWindowStatus opens 10 minutes before class and closes 15 minutes after duration', () => {
  const requestedStartAt = '2026-06-17T20:00:00.000Z';
  const durationMinutes = 50;

  assert.deepEqual(
    getLessonJoinWindowStatus({
      requestedStartAt,
      durationMinutes,
      nowMs: Date.parse('2026-06-17T19:49:00.000Z'),
    }),
    {
      ok: false,
      code: 'CLASS_NOT_OPEN',
      message: 'Class is not open yet. You can join 10 minutes before the scheduled start.',
    },
  );

  assert.deepEqual(
    getLessonJoinWindowStatus({
      requestedStartAt,
      durationMinutes,
      nowMs: Date.parse('2026-06-17T19:50:00.000Z'),
    }),
    { ok: true },
  );

  assert.deepEqual(
    getLessonJoinWindowStatus({
      requestedStartAt,
      durationMinutes,
      nowMs: Date.parse('2026-06-17T21:05:00.000Z'),
    }),
    { ok: true },
  );

  assert.deepEqual(
    getLessonJoinWindowStatus({
      requestedStartAt,
      durationMinutes,
      nowMs: Date.parse('2026-06-17T21:06:00.000Z'),
    }),
    {
      ok: false,
      code: 'CLASS_ENDED',
      message: 'Class has ended. This room is no longer open.',
    },
  );
});

test('getClassReminderStatus reports the next class reminder checkpoint', () => {
  const requestedStartAt = '2026-06-17T20:00:00.000Z';

  assert.deepEqual(
    getClassReminderStatus({
      requestedStartAt,
      durationMinutes: 50,
      nowMs: Date.parse('2026-06-16T19:00:00.000Z'),
    }),
    {
      state: 'upcoming',
      label: 'Scheduled',
      message: 'Class starts in 1 day.',
      minutesUntilStart: 1500,
      nextReminderLabel: '24 hours before class',
    },
  );

  assert.deepEqual(
    getClassReminderStatus({
      requestedStartAt,
      durationMinutes: 50,
      nowMs: Date.parse('2026-06-17T18:30:00.000Z'),
    }),
    {
      state: 'upcoming',
      label: 'Scheduled',
      message: 'Class starts in 1 hour 30 minutes.',
      minutesUntilStart: 90,
      nextReminderLabel: '1 hour before class',
    },
  );

  assert.deepEqual(
    getClassReminderStatus({
      requestedStartAt,
      durationMinutes: 50,
      nowMs: Date.parse('2026-06-17T19:30:00.000Z'),
    }),
    {
      state: 'due-soon',
      label: 'Reminder due soon',
      message: 'Class starts in 30 minutes.',
      minutesUntilStart: 30,
      nextReminderLabel: '10 minutes before class',
    },
  );

  assert.deepEqual(
    getClassReminderStatus({
      requestedStartAt,
      durationMinutes: 50,
      nowMs: Date.parse('2026-06-17T19:55:00.000Z'),
    }),
    {
      state: 'join-open',
      label: 'Join window open',
      message: 'Class starts in 5 minutes. Tutor and student can join now.',
      minutesUntilStart: 5,
      nextReminderLabel: null,
    },
  );
});
