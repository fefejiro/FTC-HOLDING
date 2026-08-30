import type { NotificationResponse } from "expo-notifications";
import { isIncomingCallNotificationResponse } from "./NotificationNavigation";

function response(data: Record<string, unknown>): NotificationResponse {
  return {
    actionIdentifier: "expo.notifications.default",
    notification: {
      date: Date.now(),
      request: {
        identifier: "notification-1",
        content: { data } as never,
        trigger: null
      }
    }
  } as NotificationResponse;
}

describe("isIncomingCallNotificationResponse", () => {
  it("accepts the native incoming-call payload", () => {
    expect(isIncomingCallNotificationResponse(response({ type: "incoming-call", callId: "call-1" }))).toBe(true);
  });

  it("rejects unrelated notifications and missing responses", () => {
    expect(isIncomingCallNotificationResponse(response({ type: "message" }))).toBe(false);
    expect(isIncomingCallNotificationResponse(undefined)).toBe(false);
    expect(isIncomingCallNotificationResponse(null)).toBe(false);
  });
});
