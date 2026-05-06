import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { validateCsrfRequest } from '@/app/lib/security/csrf';
import { enforceRateLimit } from '@/app/lib/security/rate-limit';
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
  const csrfResult = validateCsrfRequest(req);
  if (!csrfResult.ok) {
    return NextResponse.json(
      { ok: false, code: csrfResult.code, message: csrfResult.message },
      { status: 403 },
    );
  }

  const rateLimit = await enforceRateLimit(req, {
    scope: 'daily-room-token',
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (rateLimit.limited) {
    const response = NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', message: 'Too many room token requests.' },
      { status: 429 },
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    response.headers.set('X-RateLimit-Limit', '30');
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Driver', rateLimit.driver);
    return response;
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validatePayload(body);

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_DAILY_ROOM_REQUEST', validationErrors },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });
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
    return NextResponse.json({ ok: false, code: 'BOOKING_NOT_FOUND' }, { status: 404 });
  }
  if (booking.status !== 'accepted') {
    return NextResponse.json(
      { ok: false, code: 'BOOKING_NOT_ACCEPTED', message: 'Room is only available for accepted bookings.' },
      { status: 403 },
    );
  }

  // Daily.co: get or create room (idempotent — use bookingId as room name)
  const roomName = `anion-${payload.bookingId}`;
  let roomUrl: string;

  const domain = process.env.DAILY_DOMAIN;
  if (!domain) {
    return NextResponse.json({ ok: false, code: 'DAILY_NOT_CONFIGURED', message: 'DAILY_DOMAIN not set' }, { status: 503 });
  }

  try {
    // Try to get existing room first
    const existing = await dailyFetch(`/rooms/${roomName}`, 'GET');
    roomUrl = String(existing.url);
  } catch {
    // Room doesn't exist — create it
    const newRoom = await dailyFetch('/rooms', 'POST', {
      name: roomName,
      privacy: 'private',
      properties: {
        enable_recording: 'cloud',
        max_participants: 10,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3, // expires in 3 hours
      },
    });
    roomUrl = String(newRoom.url);
  }

  // Issue a meeting token for the participant
  const isOwner = payload.participantRole === 'tutor';
  const tokenRes = await dailyFetch('/meeting-tokens', 'POST', {
    properties: {
      room_name: roomName,
      user_name: user.displayName,
      user_id: user.authUserId,
      is_owner: isOwner,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 3,
    },
  });

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
}
