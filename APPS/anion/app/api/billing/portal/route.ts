import { NextResponse } from 'next/server';
import type {
  BillingPortalRequest,
  BillingPortalResponse,
  PlaceholderErrorResponse,
} from '@/src/types/api/scaffolds';

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];
  const payload = body as Partial<BillingPortalRequest> | null;

  if (!payload || typeof payload !== 'object') {
    return ['Body must be a JSON object.'];
  }
  if (!payload.accountId) {
    errors.push('accountId is required.');
  }
  if (!payload.returnUrl) {
    errors.push('returnUrl is required.');
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
      code: 'INVALID_BILLING_PORTAL_REQUEST',
      message: 'Malformed billing portal payload.',
      todo: 'Provide account context before creating Stripe portal session.',
      validationErrors,
    };
    return NextResponse.json(response, { status: 400 });
  }

  const response: BillingPortalResponse = {
    ok: false,
    placeholder: true,
    code: 'BILLING_PORTAL_NOT_IMPLEMENTED',
    message: 'Stripe billing portal session creation is scheduled for M3.',
    todo: 'Create Stripe billing portal session and return portal URL.',
  };

  return NextResponse.json(response, { status: 501 });
}
