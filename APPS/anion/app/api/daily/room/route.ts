import { NextResponse } from 'next/server';
import type {
  DailyRoomTokenRequest,
  DailyRoomTokenResponse,
  PlaceholderErrorResponse,
} from '@/src/types/api/scaffolds';

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

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validatePayload(body);

  if (validationErrors.length > 0) {
    const response: PlaceholderErrorResponse = {
      ok: false,
      placeholder: true,
      code: 'INVALID_DAILY_ROOM_REQUEST',
      message: 'Malformed Daily room token request payload.',
      todo: 'Provide booking and participant context before token issuance.',
      validationErrors,
    };
    return NextResponse.json(response, { status: 400 });
  }

  const response: DailyRoomTokenResponse = {
    ok: false,
    placeholder: true,
    code: 'DAILY_TOKEN_ISSUANCE_NOT_IMPLEMENTED',
    message: 'Daily room token issuance is scheduled for M4.',
    todo: 'Verify booking access, mint Daily token, and return session metadata.',
  };

  return NextResponse.json(response, { status: 501 });
}
