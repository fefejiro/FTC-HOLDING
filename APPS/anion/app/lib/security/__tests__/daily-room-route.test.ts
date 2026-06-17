import test from 'node:test';
import assert from 'node:assert/strict';
import { createDailyRoomPostHandler } from '@/app/api/daily/room/handler';
import type { CurrentUser } from '@/app/lib/auth/getCurrentUser';

type HandlerOverrides = Parameters<typeof createDailyRoomPostHandler>[0];

const baseUser: CurrentUser = {
  authUserId: 'auth-user-1',
  email: 'tutor@example.test',
  profileId: 'profile-1',
  displayName: 'Tutor One',
  role: 'tutor',
  roles: ['tutor'],
};

const quietLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function dailyRequest(body: unknown) {
  return new Request('https://anion.test/api/daily/room', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://anion.test',
      'sec-fetch-site': 'same-origin',
      'x-request-id': 'test-request-id',
    },
    body: JSON.stringify(body),
  });
}

function createHandler(overrides: HandlerOverrides = {}) {
  const handler = createDailyRoomPostHandler({
    getCurrentUser: async () => baseUser,
    validateCsrfRequest: () => ({ ok: true }),
    enforceRateLimit: async () => ({
      limited: false,
      count: 1,
      remaining: 29,
      retryAfterSeconds: 60,
      resetAt: Date.now() + 60_000,
      driver: 'memory',
    }),
    resolveLessonParticipantRoleForUser: async () => 'tutor',
    getLessonJoinWindowStatusForBooking: async () => ({ ok: true }),
    dailyFetch: async (path) => {
      if (path.startsWith('/rooms/')) {
        return { url: 'https://anion.daily.co/anion-booking-1' };
      }
      return { token: 'daily-token' };
    },
    env: {
      DAILY_API_KEY: 'daily-key',
      DAILY_DOMAIN: 'anion.daily.co',
    } as unknown as NodeJS.ProcessEnv,
    now: () => Date.parse('2026-05-26T12:00:00.000Z'),
    logger: quietLogger,
    ...overrides,
  });

  return handler;
}

test('daily room rejects invalid request bodies with 400', async () => {
  const response = await createHandler()(dailyRequest({ bookingId: 'booking-1' }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'INVALID_DAILY_ROOM_REQUEST');
  assert.deepEqual(body.validationErrors, ['participantRole is required.']);
});

test('daily room rejects unauthenticated users with 401', async () => {
  const response = await createHandler({
    getCurrentUser: async () => null,
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'UNAUTHENTICATED');
});

test('daily room rejects unauthorized lesson access with 403', async () => {
  const response = await createHandler({
    resolveLessonParticipantRoleForUser: async () => {
      throw new Error('You are not allowed to access this lesson.');
    },
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'LESSON_ACCESS_DENIED');
});

test('daily room rejects participant role mismatch with 403', async () => {
  const response = await createHandler({
    resolveLessonParticipantRoleForUser: async () => 'student',
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'LESSON_ACCESS_DENIED');
});

test('daily room rejects join attempts before the lesson window opens', async () => {
  const response = await createHandler({
    getLessonJoinWindowStatusForBooking: async () => ({
      ok: false,
      code: 'CLASS_NOT_OPEN',
      message: 'Class is not open yet. You can join 10 minutes before the scheduled start.',
    }),
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'CLASS_NOT_OPEN');
});

test('daily room rejects join attempts after the lesson window closes', async () => {
  const response = await createHandler({
    getLessonJoinWindowStatusForBooking: async () => ({
      ok: false,
      code: 'CLASS_ENDED',
      message: 'Class has ended. This room is no longer open.',
    }),
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'CLASS_ENDED');
});

test('daily room rejects parent access with 403', async () => {
  const response = await createHandler({
    getCurrentUser: async () => ({ ...baseUser, role: 'parent', displayName: 'Parent One' }),
    resolveLessonParticipantRoleForUser: async () => 'student',
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'student' }));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'LESSON_ACCESS_DENIED');
});

test('daily room returns 503 when Daily config is missing', async () => {
  const response = await createHandler({
    env: {
      DAILY_DOMAIN: 'anion.daily.co',
    } as unknown as NodeJS.ProcessEnv,
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'DAILY_NOT_CONFIGURED');
});

test('daily room returns 502 when Daily API fails', async () => {
  const response = await createHandler({
    dailyFetch: async () => {
      throw new Error('Daily API unavailable');
    },
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'DAILY_API_ERROR');
});

test('daily room returns room URL and token for authorized tutor', async () => {
  const response = await createHandler()(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.roomUrl, 'https://anion.daily.co/anion-booking-1');
  assert.equal(body.token, 'daily-token');
  assert.equal(body.roomName, 'anion-booking-1');
  assert.equal(body.expiresAt, '2026-05-26T15:00:00.000Z');
});

test('daily room retries without cloud recording when Daily plan rejects recording', async () => {
  const calls: Array<{ path: string; method: string; body?: unknown }> = [];
  const response = await createHandler({
    dailyFetch: async (path, method, body) => {
      calls.push({ path, method, body });
      if (path.startsWith('/rooms/') && method === 'GET') {
        throw new (class extends Error {
          status = 404;
          constructor() {
            super('Daily API GET /rooms/anion-booking-1 failed 404');
            this.name = 'DailyApiError';
          }
        })();
      }
      if (path === '/rooms' && method === 'POST' && calls.filter((call) => call.path === '/rooms').length === 1) {
        throw new (class extends Error {
          status = 400;
          constructor() {
            super("Daily API POST /rooms failed 400: property 'enable_recording' cannot be set to that value with your current plan");
            this.name = 'DailyApiError';
          }
        })();
      }
      if (path === '/rooms' && method === 'POST') {
        return { url: 'https://anion.daily.co/anion-booking-1' };
      }
      return { token: 'daily-token' };
    },
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(calls.filter((call) => call.path === '/rooms').length, 2);
  for (const call of calls.filter((item) => item.path === '/rooms')) {
    assert.equal((call.body as { properties?: { max_participants?: number } }).properties?.max_participants, 2);
  }
});

test('daily room creates one-on-one Daily rooms with a two participant cap', async () => {
  const calls: Array<{ path: string; method: string; body?: unknown }> = [];
  const response = await createHandler({
    dailyFetch: async (path, method, body) => {
      calls.push({ path, method, body });
      if (path.startsWith('/rooms/') && method === 'GET') {
        throw new (class extends Error {
          status = 404;
          constructor() {
            super('Daily API GET /rooms/anion-booking-1 failed 404');
            this.name = 'DailyApiError';
          }
        })();
      }
      if (path === '/rooms' && method === 'POST') {
        return { url: 'https://anion.daily.co/anion-booking-1' };
      }
      return { token: 'daily-token' };
    },
  })(dailyRequest({ bookingId: 'booking-1', participantRole: 'tutor' }));
  const body = await response.json();
  const createRoomCall = calls.find((call) => call.path === '/rooms' && call.method === 'POST');

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(createRoomCall);
  assert.equal((createRoomCall.body as { properties?: { max_participants?: number } }).properties?.max_participants, 2);
});

test('daily room returns room URL and token for authorized student', async () => {
  const response = await createHandler({
    getCurrentUser: async () => ({ ...baseUser, role: 'student', displayName: 'Student One' }),
    resolveLessonParticipantRoleForUser: async () => 'student',
  })(dailyRequest({ bookingId: 'booking-2', participantRole: 'student' }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.roomName, 'anion-booking-2');
  assert.equal(body.token, 'daily-token');
});
