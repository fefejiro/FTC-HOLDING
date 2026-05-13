import type { SupabaseClient } from "@ftc/supabase";

type GardenEmailPayload = {
  to: string;
  subject: string;
  text: string;
};

function normalizeEmail(value: string): string {
  return String(value || "").trim().toLowerCase();
}

// Save or upsert a push subscription for the current user/profile/email
export async function saveGardenPushSubscription(
  supabase: SupabaseClient,
  {
    userId,
    userEmail,
    subscription
  }: {
    userId: string;
    userEmail: string;
    subscription: {
      endpoint: string;
      keys?: { p256dh?: string; auth?: string };
      userAgent?: string;
    };
  }
): Promise<{ pushReady: boolean }> {
  if (!subscription?.endpoint) throw new Error("Missing push endpoint");
  const { endpoint, keys, userAgent } = subscription;
  const { p256dh, auth } = keys || {};
  // Upsert by endpoint
  const { error } = await supabase
    .from("garden_cleaners_notification_subscriptions")
    .upsert(
      [{
        user_id: userId || null,
        email: userEmail || null,
        endpoint,
        p256dh: p256dh || null,
        auth: auth || null,
        user_agent: userAgent || null,
        updated_at: new Date().toISOString(),
      }],
      { onConflict: "endpoint" }
    );
  if (error) throw new Error(error.message || "Failed to save push subscription");
  return { pushReady: true };
}

// List notifications for the current user/email/profile, newest first, safe limit
export async function listGardenNotifications(
  supabase: SupabaseClient,
  userEmail: string,
  userId: string,
  limit: number = 30
): Promise<Record<string, unknown>[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const { data, error } = await supabase
    .from("garden_cleaners_notifications")
    .select("*")
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error(error.message || "Failed to list notifications");
  return data || [];
}

// Mark a notification as read for the current user/email/profile
export async function markGardenNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  userEmail: string,
  userId: string
): Promise<void> {
  if (!notificationId) throw new Error("Missing notification_id");
  const { error } = await supabase
    .from("garden_cleaners_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .or(`user_id.eq.${userId},email.eq.${userEmail}`);
  if (error) throw new Error(error.message || "Failed to mark notification as read");
}

export async function sendGardenPortalEmail(payload: GardenEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = normalizeEmail(payload.to);

  if (!apiKey || !to) {
    return;
  }

  const from = process.env.GARDEN_CLEANERS_ADMIN_EMAIL_FROM || "Garden Cleaners <noreply@gardencleaners.ca>";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: payload.subject,
      text: payload.text
    })
  });
}
