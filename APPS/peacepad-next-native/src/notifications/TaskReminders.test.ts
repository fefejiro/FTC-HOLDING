import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { cancelScheduledCallReminder, cancelTaskReminder, scheduledCallReminderDate, scheduleScheduledCallReminder, scheduleTaskReminder, taskReminderDate } from "./TaskReminders";

describe("task reminders", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-01T00:00:00.000Z"));
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue("task-reminder-1");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses 9 AM local time only for a future due date", () => {
    expect(taskReminderDate("2026-09-03T12:00:00.000Z", new Date(2026, 8, 1, 8))).toEqual(new Date(2026, 8, 3, 9));
    expect(taskReminderDate("2026-09-01T12:00:00.000Z", new Date(2026, 8, 1, 10))).toBeUndefined();
    expect(taskReminderDate("not-a-date", new Date())).toBeUndefined();
  });

  it("schedules a device-only task reminder without creating a server write", async () => {
    await expect(scheduleTaskReminder("task-1", "Pack school bag", "2026-09-03T12:00:00.000Z")).resolves.toBe("scheduled");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ body: "Pack school bag", data: { kind: "parenting-task", taskId: "task-1" } }),
      trigger: expect.objectContaining({ type: "date" })
    }));
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it("does not schedule when notification permission is denied", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
    await expect(scheduleTaskReminder("task-1", "Pack school bag", "2026-09-03T12:00:00.000Z")).resolves.toBe("not-permitted");
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("cancels a reminder when its task is completed or deleted", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ "task-1": "task-reminder-1" }));
    await cancelTaskReminder("task-1");
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("task-reminder-1");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), "{}", expect.anything());
  });

  it("schedules and cancels a private fifteen-minute scheduled-call reminder", async () => {
    expect(scheduledCallReminderDate("2026-09-03T14:00:00.000Z", new Date("2026-09-01T00:00:00.000Z"))).toEqual(new Date("2026-09-03T13:45:00.000Z"));
    await expect(scheduleScheduledCallReminder("call-1", "video", "2026-09-03T14:00:00.000Z")).resolves.toBe("scheduled");
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ content: expect.objectContaining({ data: { kind: "scheduled-call", callId: "call-1" } }) }));
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({ "call-1": "call-reminder-1" }));
    await cancelScheduledCallReminder("call-1");
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("call-reminder-1");
  });
});
