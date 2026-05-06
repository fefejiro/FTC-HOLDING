import { randomUUID } from 'crypto';

/**
 * Returns the inbound x-request-id header value if present,
 * otherwise generates a fresh UUID v4.
 *
 * Using the inbound header allows upstream proxies / API gateways to
 * correlate logs across services without any additional configuration.
 */
export function getOrCreateRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? randomUUID();
}
