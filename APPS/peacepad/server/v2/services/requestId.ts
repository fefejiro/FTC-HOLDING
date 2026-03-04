import crypto from "crypto";

export const V2_REQUEST_ID_HEADER = "x-request-id";
export const V2_REQUEST_ID_LOCALS_KEY = "v2RequestId";

const REQUEST_ID_MAX_LENGTH = 128;
const REQUEST_ID_ALLOWED_PATTERN = /^[A-Za-z0-9._:-]+$/;

export function resolveRequestId(rawValue: string | undefined): string {
  const normalized = rawValue?.trim();
  if (
    normalized &&
    normalized.length <= REQUEST_ID_MAX_LENGTH &&
    REQUEST_ID_ALLOWED_PATTERN.test(normalized)
  ) {
    return normalized;
  }
  return crypto.randomUUID();
}

export function readRequestId(locals: Record<string, unknown> | undefined): string | undefined {
  const value = locals?.[V2_REQUEST_ID_LOCALS_KEY];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return undefined;
}
