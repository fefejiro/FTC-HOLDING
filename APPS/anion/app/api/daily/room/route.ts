import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { logger } from '@/app/lib/logger';
import { getOrCreateRequestId } from '@/app/lib/request-id';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/app/lib/rate-limit';
import { withRetry } from '@/app/lib/retry';
import type { DailyRoomTokenRequest } from '@/src/types/api/scaffolds';

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];
  const payload = body as Partial<DailyRoomTokenRequest> | null;

  if (!payload || typeof payload !== 'object') {
    return ['Body must be a JSON object.'];
  }
  if (!payload.bookingId) {
    errors.push('bookingId is required.');
  }
  if (!payload.userId) {
    errors.push('userId is required.');
  }
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
  const ip = getClientIp(req);
  const rl = checkRateLimit(`daily-room:${ip}`, RATE_LIMITS.dailyRoom);

  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    logger.warn({ route, requestId, code: 'RATE_LIMITED', latencyMs: Date.now() - start });
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', retryAfter, requestId },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMITS.dailyRoom.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validatePayload(body);

  if (validationErrors.length > 0) {
    logger.warn({ route, requestId, code: 'INVALID_DAILY_ROOM_REQUEST', latencyMs: Date.now() - start });
    return NextResponse.json(
      { ok: false, code: 'INVALID_DAILY_ROOM_REQUEST', validationErrors, requestId },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    logger.warn({ route, requestId, code: 'UNAUTHENTICATED', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', requestId }, { status: 401 });
  }

  const payload = body as DailyRoomTokenRequest;

  // Verify the caller is a participant in the booking
  const supabase = await createServerClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, tutor_id, status')
    .eq('id', payload.bookingId)
    .single();

  if (!booking) {
    logger.warn({ route, requestId, userId: user.profileId, code: 'BOOKING_NOT_FOUND', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'BOOKING_NOT_FOUND', requestId }, { status: 404 });
  }
  if (booking.status !== 'accepted') {
    logger.warn({ route, requestId, userId: user.profileId, code: 'BOOKING_NOT_ACCEPTED', latencyMs: Date.now() - start });
    return NextResponse.json(
      { ok: false, code: 'BOOKING_NOT_ACCEPTED', message: 'Room is only available for accepted bookings.', requestId },
      { status: 403 },
    );
  }

  // Daily.co: get or create room (idempotent — use bookingId as room name)
  const roomName = `anion-${payload.bookingId}`;
  let roomUrl: string;

  const domain = process.env.DAILY_DOMAIN;
  if (!domain) {
    logger.error({ route, requestId, userId: user.profileId, code: 'DAILY_NOT_CONFIGURED', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'DAILY_NOT_CONFIGURED', message: 'DAILY_DOMAIN not set', requestId }, { status: 503 });
  }

  try {
    // Try to get existing room first
    const existing = await withRetry(
      () => dailyFetch(`/rooms/${roomName}`, 'GET'),
      { label: `daily.getRoom(${roomName})` },
    );
    roomUrl = String(existing.url);
  } catch {
    // Room doesn't exist — create it
    const newRoom = await withRetry(
      () =>
        dailyFetch('/rooms', 'POST', {
          name: roomName,
          privacy: 'private',
          properties: {
            enable_recording: 'cloud',
            max_participants: 10,
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3, // expires in 3 hours
          },
        }),
      { label: `daily.createRoom(${roomName})` },
    );
    roomUrl = String(newRoom.url);
  }

  try {
    // Issue a meeting token for the participant
    const isOwner = payload.participantRole === 'tutor';
    const tokenRes = await withRetry(
      () =>
        dailyFetch('/meeting-tokens', 'POST', {
          properties: {
            room_name: roomName,
            user_name: user.displayName,
            user_id: user.authUserId,
            is_owner: isOwner,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
          },
        }),
      { label: `daily.meetingToken(${roomName})` },
    );

    logger.info({ route, requestId, userId: user.profileId, latencyMs: Date.now() - start });
    return NextResponse.json({
      ok: true,
      roomUrl,
      token: String(tokenRes.token),
      roomName,
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    logger.error({ route, requestId, userId: user.profileId, code: 'DAILY_API_ERROR', message: msg, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'DAILY_API_ERROR', requestId }, { status: 502 });
  }
}


