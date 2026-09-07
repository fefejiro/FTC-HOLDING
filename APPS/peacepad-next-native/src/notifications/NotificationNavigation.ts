import type * as Notifications from "expo-notifications";

type NotificationData = Record<string, unknown>;

/**
 * Call notifications are navigation hints only. Authentication, family
 * authorization, and the current call state are still re-checked by the
 * calls screen/runtime before any media is opened.
 */
export function isIncomingCallNotificationResponse(
  response: Notifications.NotificationResponse | null | undefined
): boolean {
  const data = response?.notification.request.content.data;
  return typeof data === "object"
    && data !== null
    && (data as NotificationData).type === "incoming-call";
}
