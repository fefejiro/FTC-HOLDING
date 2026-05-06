import { NextResponse } from 'next/server';
import type {
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  PlaceholderErrorResponse,
} from '@/src/types/api/scaffolds';

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];
  const payload = body as Partial<BillingCheckoutRequest> | null;

  if (!payload || typeof payload !== 'object') {
    return ['Body must be a JSON object.'];
  }
  if (!payload.bookingId) {
    errors.push('bookingId is required.');
  }
  if (!payload.planId) {
    errors.push('planId is required.');
  }
  if (!payload.successUrl) {
    errors.push('successUrl is required.');
  }
  if (!payload.cancelUrl) {
    errors.push('cancelUrl is required.');
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
      code: 'INVALID_BILLING_CHECKOUT_REQUEST',
      message: 'Malformed billing checkout payload.',
      todo: 'Provide booking and plan context before Stripe checkout creation.',
      validationErrors,
    };
    return NextResponse.json(response, { status: 400 });
  }

  const response: BillingCheckoutResponse = {
    ok: false,
    placeholder: true,
    code: 'BILLING_CHECKOUT_NOT_IMPLEMENTED',
    message: 'Stripe checkout session creation is scheduled for M3.',
    todo: 'Create Stripe Checkout Session, persist intent in Supabase, and return URL.',
  };

  return NextResponse.json(response, { status: 501 });
}
