import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { validateCsrfRequest } from '@/app/lib/security/csrf';
import { enforceRateLimit } from '@/app/lib/security/rate-limit';
import { logger } from '@/app/lib/logger';
import { getOrCreateRequestId } from '@/app/lib/request-id';
import { resolveLessonParticipantRoleForUser } from '@/app/lib/bookings';
import type { DailyRoomTokenRequest } from '@/src/types/api/scaffolds';

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
    throw new Error(`Daily API ${method} ${path} failed ${res.status}: ${text}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  const route = '/api/daily/room';
  const start = Date.now();

  const csrfResult = validateCsrfRequest(req);
  if (!csrfResult.ok) {
    logger.warn({ route, requestId, code: csrfResult.code, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: csrfResult.code, message: csrfResult.message, requestId }, { status: 403 });
  }

  const rateLimit = await enforceRateLimit(req, { scope: 'daily-room-token', maxRequests: 30, windowMs: 60_000 });
  if (rateLimit.limited) {
    logger.warn({ route, requestId, code: 'RATE_LIMITED', latencyMs: Date.now() - start });
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
    logger.warn({ route, requestId, code: 'INVALID_DAILY_ROOM_REQUEST', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'INVALID_DAILY_ROOM_REQUEST', validationErrors, requestId }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    logger.warn({ route, requestId, code: 'UNAUTHENTICATED', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', requestId }, { status: 401 });
  }

  const payload = body as DailyRoomTokenRequest;
  let participantRole: 'student' | 'tutor';
  try {
    participantRole = await resolveLessonParticipantRoleForUser({
      bookingId: payload.bookingId,
      profileId: user.profileId,
      role: user.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Not authorized for this lesson.';
    logger.warn({ route, requestId, userId: user.profileId, code: 'LESSON_ACCESS_DENIED', message, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'LESSON_ACCESS_DENIED', message, requestId }, { status: 403 });
  }

  const roomName = `anion-${payload.bookingId}`;
  let roomUrl: string;

  const domain = process.env.DAILY_DOMAIN;
  if (!domain) {
    logger.error({ route, requestId, userId: user.profileId, code: 'DAILY_NOT_CONFIGURED', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'DAILY_NOT_CONFIGURED', message: 'DAILY_DOMAIN not set', requestId }, { status: 503 });
  }

  try {
    const existing = await dailyFetch(`/rooms/${roomName}`, 'GET');
    roomUrl = String(existing.url);
  } catch {
    const newRoom = await dailyFetch('/rooms', 'POST', {
      name: roomName,
      privacy: 'private',
      properties: {
        enable_recording: 'cloud',
        max_participants: 10,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
      },
    });
    roomUrl = String(newRoom.url);
  }

  try {
    const isOwner = participantRole === 'tutor';
    const tokenRes = await dailyFetch('/meeting-tokens', 'POST', {
      properties: {
        room_name: roomName,
        user_name: user.displayName,
        user_id: user.authUserId,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
      },
    });

    logger.info({ route, requestId, userId: user.profileId, latencyMs: Date.now() - start });
    const response = NextResponse.json({
      ok: true,
      roomUrl,
      token: String(tokenRes.token),
      roomName,
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    });
    response.headers.set('X-RateLimit-Limit', '30');
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Driver', rateLimit.driver);
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    logger.error({ route, requestId, userId: user.profileId, code: 'DAILY_API_ERROR', message: msg, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'DAILY_API_ERROR', requestId }, { status: 502 });
  }
}