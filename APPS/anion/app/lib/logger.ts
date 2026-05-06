/**
 * Structured JSON logger for Anion server-side API routes.
 *
 * Every log line is a single JSON object written to stdout/stderr so that
 * Cloudflare Workers log drains and log-query tools (e.g. Grafana, Datadog,
 * `jq`) can parse and filter without regex fragility.
 *
 * Fields present on every log line:
 *   timestamp  – ISO-8601 UTC instant
 *   level      – "info" | "warn" | "error"
 *   route      – API route path (e.g. "/api/billing/checkout")
 *   requestId  – Correlation ID (UUID) propagated from x-request-id header
 *                or generated at request ingress
 *
 * Optional but recommended fields:
 *   userId     – Authenticated user's profileId (never auth token / email)
 *   code       – Application-level error code string
 *   latencyMs  – Wall-clock duration for the full request or sub-operation
 *
 * Extra ad-hoc fields are accepted via the spread — keep them safe (no
 * secrets, no PII beyond userId).
 */

export type LogLevel = 'info' | 'warn' | 'error';

export type LogFields = {
  route: string;
  requestId: string;
  userId?: string;
  code?: string;
  latencyMs?: number;
  [key: string]: unknown;
};

function emit(level: LogLevel, fields: LogFields): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...fields,
  };

  // Cloudflare Workers runtime routes console.error to the error stream;
  // info/warn both go to stdout in Node and to the standard Workers log.
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info:  (fields: LogFields) => emit('info',  fields),
  warn:  (fields: LogFields) => emit('warn',  fields),
  error: (fields: LogFields) => emit('error', fields),
} as const;
