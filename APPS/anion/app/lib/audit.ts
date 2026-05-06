/**
 * Audit log writer.
 *
 * Uses the Supabase service-role client so writes bypass RLS.
 * Never throws — audit failures are logged to stderr but must not
 * block user-facing request handlers.
 */
import { createClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'booking.created'
  | 'booking.status_changed'
  | 'billing.checkout_initiated'
  | 'billing.portal_initiated'
  | 'billing.subscription_updated'
  | 'billing.subscription_deleted';

export interface AuditEntry {
  action: AuditAction;
  /** profile_id of the acting user; omit for system / webhook-triggered events. */
  actorId?: string;
  actorRole?: string;
  /** Top-level domain object type, e.g. 'booking', 'subscription'. */
  resourceType: string;
  /** Stable identifier for the affected record. */
  resourceId?: string;
  /** Any extra context that helps an auditor understand the event. */
  metadata?: Record<string, unknown>;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Write one audit log entry to `public.audit_logs`.
 * Fire-and-forget — callers should not await this if they don't want
 * audit latency to affect response time.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from('audit_logs').insert({
      action: entry.action,
      actor_id: entry.actorId ?? null,
      actor_role: entry.actorRole ?? null,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      metadata: entry.metadata ?? {},
    });
    if (error) {
      console.error('[audit] Insert error:', error.message);
    }
  } catch (err) {
    console.error('[audit] Unexpected error:', err instanceof Error ? err.message : err);
  }
}
