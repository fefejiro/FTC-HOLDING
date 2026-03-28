/**
 * Server-Sent Events (SSE) broadcast module.
 * Maintains a registry of connected operator browsers and pushes events
 * to all of them instantly — no polling needed.
 *
 * Events emitted:
 *   request:new      — a customer just submitted a job
 *   request:updated  — a job status changed (accepted / en_route / completed)
 *   incident:new     — Ontario 511 found a new Ottawa-area incident
 */

import type { Response } from 'express';

const clients = new Set<Response>();

export function sseAdd(res: Response): void {
  clients.add(res);
}

export function sseRemove(res: Response): void {
  clients.delete(res);
}

export function sseBroadcast(event: string, data: unknown): void {
  if (clients.size === 0) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of Array.from(clients)) {
    try {
      res.write(msg);
    } catch {
      // Client already disconnected — remove from registry
      clients.delete(res);
    }
  }
}

export function sseClientCount(): number {
  return clients.size;
}
