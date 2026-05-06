import { db } from '../db';
import { users } from '@shared/schema';
import { sendPushNotification } from '../push-notifications';
import { and, isNotNull, lt, or, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const INACTIVITY_DAYS = 7;
const RE_ENGAGEMENT_COOLDOWN_DAYS = 7;

/**
 * Re-engagement push notification scheduler.
 *
 * Runs daily at 10 AM. Targets users who:
 *  - Have an active partnership (so there's someone to message)
 *  - Haven't opened the app in 7+ days
 *  - Haven't received a re-engagement push in the last 7 days
 */
export async function runReEngagementNotifications(): Promise<void> {
  try {
    console.log('[ReEngagement] Running re-engagement notification pass...');

    const now = new Date();
    const inactiveThreshold = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
    const cooldownThreshold = new Date(now.getTime() - RE_ENGAGEMENT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const candidates = await db
      .select({
        id: users.id,
        lastActiveAt: users.lastActiveAt,
        lastReEngagementAt: users.lastReEngagementAt,
      })
      .from(users)
      .where(
        and(
          isNotNull(users.activePartnershipId),
          // Inactive for at least 7 days
          or(
            isNull(users.lastActiveAt),
            lt(users.lastActiveAt, inactiveThreshold)
          ),
          // No re-engagement push sent in the last 7 days
          or(
            isNull(users.lastReEngagementAt),
            lt(users.lastReEngagementAt, cooldownThreshold)
          )
        )
      );

    console.log(`[ReEngagement] Found ${candidates.length} candidate(s)`);

    for (const candidate of candidates) {
      try {
        await sendPushNotification(candidate.id, {
          title: 'Check in with your co-parent',
          body: "You haven't opened PeacePad in a while. Even a quick message keeps things on track.",
          channel: 'general',
          data: { url: '/chat', type: 're_engagement' },
        });

        // Record send time
        await db
          .update(users)
          .set({ lastReEngagementAt: now })
          .where(sql`${users.id} = ${candidate.id}`);

        console.log(`[ReEngagement] Sent to user ${candidate.id}`);
      } catch (err) {
        console.warn(`[ReEngagement] Failed to notify user ${candidate.id}:`, err);
      }
    }

    console.log('[ReEngagement] Pass complete.');
  } catch (error) {
    console.error('[ReEngagement] Scheduler error:', error);
  }
}

// Track last run date to prevent duplicate sends within the same hour
let lastRunDate: string | null = null;

export function initializeReEngagementScheduler(): void {
  console.log('[ReEngagement] Scheduler initialized — will run daily at 10:00 AM');

  // Check every 15 minutes
  setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    if (hour === 10 && lastRunDate !== todayStr) {
      lastRunDate = todayStr;
      void runReEngagementNotifications();
    }
  }, 15 * 60 * 1000);
}
