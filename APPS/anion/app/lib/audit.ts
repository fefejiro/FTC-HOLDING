import { createClient } from '@supabase/supabase-js';

type AuditAction =
  | 'billing.checkout_initiated'
  | 'billing.portal_initiated'
  | 'billing.subscription_updated'
  | 'billing.subscription_deleted';

type AuditEntry = {
  action: AuditAction;
  actorId?: string;
  actorRole?: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

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
