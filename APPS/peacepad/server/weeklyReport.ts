import { db } from './db';
import { users, partnerships, messages, feedback } from '@shared/schema';
import { sendWeeklyReport } from './email';
import { testMonitor } from './testMonitor';
import { count, sql, and, gte, eq } from 'drizzle-orm';
import type { Feedback } from '@shared/schema';

/**
 * Weekly Consolidated Report System
 * 
 * Automatically sends a weekly email every Monday at 9:00 AM with:
 * - User statistics (total, new, active)
 * - Activity metrics (messages, feedback)
 * - System health (P1/P2 errors)
 * - Bug/suggestion counts
 * - API performance data
 */

export async function generateAndSendWeeklyReport() {
  try {
    console.log('[Weekly Report] Generating weekly report...');

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    // Get user statistics
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult?.count || 0;

    const [newUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, weekStart));
    const newUsers = newUsersResult?.count || 0;

    // Get active users (users who sent messages this week)
    const activeUsersResult = await db
      .selectDistinct({ senderId: messages.senderId })
      .from(messages)
      .where(gte(messages.timestamp, weekStart));
    const activeUsers = activeUsersResult.length;

    // Get partnership count
    const [partnershipsResult] = await db.select({ count: count() }).from(partnerships);
    const totalPartnerships = partnershipsResult?.count || 0;

    // Get message count
    const [messagesResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(gte(messages.timestamp, weekStart));
    const totalMessages = messagesResult?.count || 0;

    // Get feedback statistics
    const [totalFeedbackResult] = await db
      .select({ count: count() })
      .from(feedback)
      .where(gte(feedback.createdAt, weekStart));
    const totalFeedback = totalFeedbackResult?.count || 0;

    const [newBugsResult] = await db
      .select({ count: count() })
      .from(feedback)
      .where(and(
        eq(feedback.type, 'bug'),
        gte(feedback.createdAt, weekStart)
      ));
    const newBugs = newBugsResult?.count || 0;

    const [newSuggestionsResult] = await db
      .select({ count: count() })
      .from(feedback)
      .where(and(
        eq(feedback.type, 'suggestion'),
        gte(feedback.createdAt, weekStart)
      ));
    const newSuggestions = newSuggestionsResult?.count || 0;

    // Get recent critical bugs
    const recentBugs = await db
      .select()
      .from(feedback)
      .where(and(
        eq(feedback.type, 'bug'),
        gte(feedback.createdAt, weekStart)
      ))
      .orderBy(sql`${feedback.createdAt} DESC`)
      .limit(5);

    // Get error statistics from testMonitor
    const summary = testMonitor.getSummary();
    const totalP1Errors = summary.issues.P1;
    const totalP2Errors = summary.issues.P2;

    // Get top API endpoints
    const topAPIEndpoints = summary.apiStats
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(stat => ({
        endpoint: stat.endpoint,
        avgResponseTime: stat.avg,
        callCount: stat.count
      }));

    // Send the report
    const reportData = {
      weekStart,
      weekEnd,
      totalUsers,
      newUsers,
      activeUsers,
      totalPartnerships,
      totalMessages,
      totalP1Errors,
      totalP2Errors,
      totalFeedback,
      newBugs,
      newSuggestions,
      topAPIEndpoints,
      recentBugs: recentBugs.map((bug: Feedback) => ({
        type: bug.type,
        description: bug.description,
        severity: bug.severity || undefined,
        createdAt: bug.createdAt
      }))
    };

    await sendWeeklyReport(reportData);
    console.log('[Weekly Report] Successfully sent weekly report');
    
    return true;
  } catch (error) {
    console.error('[Weekly Report] Failed to generate/send weekly report:', error);
    return false;
  }
}

// Track last sent report to prevent duplicates
let lastReportSentDate: string | null = null;

// Initialize weekly report scheduler
export function initializeWeeklyReportScheduler() {
  console.log('[Weekly Report] Scheduler initialized - will send reports every Monday at 9:00 AM');

  // Check every 15 minutes if it's time to send the report
  setInterval(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
    const hour = now.getHours();
    
    // Monday at 9:00 AM (check if hour is 9, meaning 9:00-9:59 AM)
    if (dayOfWeek === 1 && hour === 9) {
      // Generate unique date string for today (YYYY-MM-DD)
      const todayDate = now.toISOString().split('T')[0];
      
      // Only send if we haven't already sent today
      if (lastReportSentDate !== todayDate) {
        console.log('[Weekly Report] Triggering Monday 9:00 AM report...');
        generateAndSendWeeklyReport()
          .then(success => {
            if (success) {
              lastReportSentDate = todayDate;
              console.log('[Weekly Report] Successfully sent and marked as sent for', todayDate);
            }
          })
          .catch(err => {
            console.error('[Weekly Report] Error in scheduled report:', err);
          });
      }
    }
  }, 15 * 60 * 1000); // Check every 15 minutes

  console.log('[Weekly Report] Next report will be sent on Monday at 9:00 AM');
}
