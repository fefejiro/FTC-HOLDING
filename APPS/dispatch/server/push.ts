import webpush from 'web-push';
import { db } from './db';
import { operators } from './schema';
import { eq } from 'drizzle-orm';

let pushInitialized = false;

export function initPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:mike@unalabs.cloud';

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not set — web push disabled');
    return;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  pushInitialized = true;
  console.log('[push] Web push initialized');
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function sendToOperator(
  operatorId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (!pushInitialized) {
    console.warn('[push] Push not initialized, skipping notification');
    return;
  }

  const [operator] = await db
    .select({ vapidSub: operators.vapidSub, fcmToken: operators.fcmToken })
    .from(operators)
    .where(eq(operators.id, operatorId));

  if (!operator) {
    console.warn(`[push] Operator ${operatorId} not found`);
    return;
  }

  if (operator.vapidSub) {
    try {
      await webpush.sendNotification(
        operator.vapidSub as webpush.PushSubscription,
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        }),
      );
      console.log(`[push] Web push sent to operator ${operatorId}`);
    } catch (err: unknown) {
      console.error(`[push] Web push failed for operator ${operatorId}:`, err);
    }
  } else {
    console.log(`[push] No push subscription for operator ${operatorId}`);
  }
}

export async function sendToAllActiveOperators(
  payload: { title: string; body: string; data?: Record<string, unknown> },
): Promise<{ sent: number; skipped: number }> {
  if (!pushInitialized) {
    console.warn('[push] Push not initialized, skipping notifications');
    return { sent: 0, skipped: 0 };
  }

  const activeOperators = await db
    .select({ id: operators.id, vapidSub: operators.vapidSub })
    .from(operators)
    .where(eq(operators.active, true));

  const withSub = activeOperators.filter((op) => op.vapidSub);
  const skipped = activeOperators.length - withSub.length;

  await Promise.allSettled(
    withSub.map((op) => sendToOperator(op.id, payload)),
  );

  return { sent: withSub.length, skipped };
}
