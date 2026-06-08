import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { validateCsrfRequest } from '@/app/lib/security/csrf';
import { enforceRateLimit } from '@/app/lib/security/rate-limit';
import { logger } from '@/app/lib/logger';
import { getOrCreateRequestId } from '@/app/lib/request-id';
import { resolveLessonParticipantRoleForUser } from '@/app/lib/bookings';
import { isLocalDemoEnabled } from '@/app/lib/local-demo';
import type { CurrentUser } from '@/app/lib/auth/getCurrentUser';
import type { DailyRoomTokenRequest } from '@/src/types/api/scaffolds';

type DailyFetch = (path: string, method: string, body?: unknown) => Promise<Record<string, unknown>>;

class DailyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'DailyApiError';
  }
}

type DailyRoomHandlerDeps = {
  getCurrentUser: () => Promise<CurrentUser | null>;
  validateCsrfRequest: typeof validateCsrfRequest;
  enforceRateLimit: typeof enforceRateLimit;
  resolveLessonParticipantRoleForUser: typeof resolveLessonParticipantRoleForUser;
  dailyFetch: DailyFetch;
  env: NodeJS.ProcessEnv;
  now: () => number;
  logger: typeof logger;
};

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];
  const payload = body as Partial<DailyRoomTokenRequest> | null;
  if (!payload || typeof payload !== 'object') return ['Body must be a JSON object.'];
  if (!payload.bookingId) errors.push('bookingId is required.');
  if (!payload.participantRole) {
    errors.push('participantRole is required.');
  } else if (!['student', 'tutor'].includes(payload.participantRole)) {
    errors.push("participantRole must be 'student' or 'tutor'.");
  }
  return errors;
}

const DAILY_API_BASE = 'https://api.daily.co/v1';

async function dailyFetch(path: string, method: string, body?: unknown) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error('DAILY_API_KEY not configured');

  const res = await fetch(`${DAILY_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new DailyApiError(`Daily API ${method} ${path} failed ${res.status}: ${text}`, res.status);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

export function createDailyRoomPostHandler(overrides: Partial<DailyRoomHandlerDeps> = {}) {
  const deps: DailyRoomHandlerDeps = {
    getCurrentUser,
    validateCsrfRequest,
    enforceRateLimit,
    resolveLessonParticipantRoleForUser,
    dailyFetch,
    env: process.env,
    now: Date.now,
    logger,
    ...overrides,
  };

  return async function dailyRoomPost(req: Request) {
    const requestId = getOrCreateRequestId(req);
    const route = '/api/daily/room';
    const start = deps.now();

    const csrfResult = deps.validateCsrfRequest(req);
    if (!csrfResult.ok) {
      deps.logger.warn({ route, requestId, code: csrfResult.code, latencyMs: deps.now() - start });
      return NextResponse.json({ ok: false, code: csrfResult.code, message: csrfResult.message, requestId }, { status: 403 });
    }

    const rateLimit = await deps.enforceRateLimit(req, { scope: 'daily-room-token', maxRequests: 30, windowMs: 60_000 });
    if (rateLimit.limited) {
      deps.logger.warn({ route, requestId, code: 'RATE_LIMITED', latencyMs: deps.now() - start });
      const response = NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many room token requests.', requestId }, { status: 429 });
      response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
      response.headers.set('X-RateLimit-Limit', '30');
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Driver', rateLimit.driver);
      return response;
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const validationErrors = validatePayload(body);
    if (validationErrors.length > 0) {
      deps.logger.warn({ route, requestId, code: 'INVALID_DAILY_ROOM_REQUEST', latencyMs: deps.now() - start });
      return NextResponse.json({ ok: false, code: 'INVALID_DAILY_ROOM_REQUEST', validationErrors, requestId }, { status: 400 });
    }

    const user = await deps.getCurrentUser();
    if (!user) {
      deps.logger.warn({ route, requestId, code: 'UNAUTHENTICATED', latencyMs: deps.now() - start });
      return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', requestId }, { status: 401 });
    }

    if (user.role !== 'student' && user.role !== 'tutor') {
      const message = 'Live lessons are available to the assigned student and tutor only.';
      deps.logger.warn({ route, requestId, userId: user.profileId, code: 'LESSON_ACCESS_DENIED', message, latencyMs: deps.now() - start });
      return NextResponse.json({ ok: false, code: 'LESSON_ACCESS_DENIED', message, requestId }, { status: 403 });
    }

    const payload = body as DailyRoomTokenRequest;
    let participantRole: 'student' | 'tutor';
    try {
      participantRole = await deps.resolveLessonParticipantRoleForUser({
        bookingId: payload.bookingId,
        profileId: user.profileId,
        role: user.role,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Not authorized for this lesson.';
      deps.logger.warn({ route, requestId, userId: user.profileId, code: 'LESSON_ACCESS_DENIED', message, latencyMs: deps.now() - start });
      return NextResponse.json({ ok: false, code: 'LESSON_ACCESS_DENIED', message, requestId }, { status: 403 });
    }

    if (participantRole !== payload.participantRole) {
      const message = 'Requested participant role does not match your lesson access.';
      deps.logger.warn({ route, requestId, userId: user.profileId, code: 'LESSON_ACCESS_DENIED', message, latencyMs: deps.now() - start });
      return NextResponse.json({ ok: false, code: 'LESSON_ACCESS_DENIED', message, requestId }, { status: 403 });
    }

    const roomName = `anion-${payload.bookingId}`;
    let roomUrl: string;

    const domain = deps.env.DAILY_DOMAIN;
    const apiKey = deps.env.DAILY_API_KEY;
    if (isLocalDemoEnabled() && deps.env.ANION_LOCAL_VIDEO_MODE === 'demo') {
      deps.logger.info({ route, requestId, userId: user.profileId, localMode: true, latencyMs: deps.now() - start });
      return NextResponse.json({
        ok: true,
        localMode: true,
        roomUrl: `local-demo://${roomName}`,
        roomName,
        expiresAt: new Date(deps.now() + 3 * 60 * 60 * 1000).toISOString(),
      });
    }

    if (!domain || !apiKey) {
      const missing = [!domain ? 'DAILY_DOMAIN' : null, !apiKey ? 'DAILY_API_KEY' : null].filter(Boolean).join(', ');
      deps.logger.error({ route, requestId, userId: user.profileId, code: 'DAILY_NOT_CONFIGURED', missing, latencyMs: deps.now() - start });
      return NextResponse.json({ ok: false, code: 'DAILY_NOT_CONFIGURED', message: `${missing} not set`, requestId }, { status: 503 });
    }

    try {
      try {
        const existing = await deps.dailyFetch(`/rooms/${roomName}`, 'GET');
        roomUrl = String(existing.url);
      } catch (error) {
        if (!(error instanceof DailyApiError) || error.status !== 404) {
          throw error;
        }

        const newRoom = await deps.dailyFetch('/rooms', 'POST', {
          name: roomName,
          privacy: 'private',
          properties: {
            enable_recording: 'cloud',
            max_participants: 10,
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor(deps.now() / 1000) + 60 * 60 * 3,
          },
        });
        roomUrl = String(newRoom.url);
      }

      const isOwner = participantRole === 'tutor';
      const tokenRes = await deps.dailyFetch('/meeting-tokens', 'POST', {
        properties: {
          room_name: roomName,
          user_name: user.displayName,
          user_id: user.authUserId,
          is_owner: isOwner,
          exp: Math.floor(deps.now() / 1000) + 60 * 60 * 3,
        },
      });

      deps.logger.info({ route, requestId, userId: user.profileId, latencyMs: deps.now() - start });
      const response = NextResponse.json({
        ok: true,
        roomUrl,
        token: String(tokenRes.token),
        roomName,
        expiresAt: new Date(deps.now() + 3 * 60 * 60 * 1000).toISOString(),
      });
      response.headers.set('X-RateLimit-Limit', '30');
      response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
      response.headers.set('X-RateLimit-Driver', rateLimit.driver);
      return response;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown';
      deps.logger.error({ route, requestId, userId: user.profileId, code: 'DAILY_API_ERROR', message: msg, latencyMs: deps.now() - start });
      return NextResponse.json({ ok: false, code: 'DAILY_API_ERROR', requestId }, { status: 502 });
    }
  };
}
