import { NextResponse } from 'next/server';
import type {
  PlaceholderErrorResponse,
  StripeWebhookEnvelope,
} from '@/src/types/api/scaffolds';

function validateEnvelope(body: unknown): string[] {
  const errors: string[] = [];
  const event = body as Partial<StripeWebhookEnvelope> | null;

  if (!event || typeof event !== 'object') {
    return ['Body must be a JSON object.'];
  }
  if (!event.id) {
    errors.push('id is required.');
  }
  if (!event.type) {
    errors.push('type is required.');
  }
  if (!event.data || typeof event.data !== 'object' || !event.data.object) {
    errors.push('data.object is required.');
  }

  return errors;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validateEnvelope(body);

  if (validationErrors.length > 0) {
    const response: PlaceholderErrorResponse = {
      ok: false,
      placeholder: true,
      code: 'INVALID_STRIPE_WEBHOOK_PAYLOAD',
      message: 'Malformed Stripe webhook payload.',
      todo: 'Pass Stripe-compatible event envelope with id, type, and data.object.',
      validationErrors,
    };
    return NextResponse.json(response, { status: 400 });
  }

  const response: PlaceholderErrorResponse = {
    ok: false,
    placeholder: true,
    code: 'STRIPE_WEBHOOK_NOT_IMPLEMENTED',
    message: 'Stripe webhook processing is scheduled for M3.',
    todo: 'Add signature verification, idempotency guard, and Supabase sync writes.',
  };

  return NextResponse.json(response, { status: 501 });
}
