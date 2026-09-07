import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

const TASK_REMINDERS_KEY = "peacepad.v2.task-reminders";
const CALL_REMINDERS_KEY = "peacepad.v2.scheduled-call-reminders";

type StoredTaskReminders = Readonly<Record<string, string>>;

export type TaskReminderResult = "scheduled" | "not-permitted" | "not-due" | "unavailable";

export function taskReminderDate(dueAt: string, now = new Date()): Date | undefined {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return undefined;
  const reminder = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 9, 0, 0, 0);
  return reminder.getTime() > now.getTime() ? reminder : undefined;
}

export function scheduledCallReminderDate(startsAt: string, now = new Date()): Date | undefined {
  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) return undefined;
  const reminder = new Date(starts.getTime() - 15 * 60_000);
  return reminder.getTime() > now.getTime() ? reminder : undefined;
}

async function readStoredReminders(key = TASK_REMINDERS_KEY): Promise<StoredTaskReminders> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

async function writeStoredReminders(value: StoredTaskReminders, key = TASK_REMINDERS_KEY): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

/**
 * A device-local reminder is optional. It never creates a server event or
 * implies that the other parent was notified; remote family alerts remain a
 * separate, permission-gated feature.
 */
export async function scheduleTaskReminder(taskId: string, title: string, dueAt: string | null): Promise<TaskReminderResult> {
  if (!dueAt) return "not-due";
  const trigger = taskReminderDate(dueAt);
  if (!trigger) return "not-due";
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return permission.status === "denied" ? "not-permitted" : "unavailable";
  const reminders = await readStoredReminders();
  if (reminders[taskId]) await Notifications.cancelScheduledNotificationAsync(reminders[taskId]);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "PeacePad reminder",
      body: title,
      data: { kind: "parenting-task", taskId },
      sound: "default"
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger }
  });
  await writeStoredReminders({ ...reminders, [taskId]: identifier });
  return "scheduled";
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  const reminders = await readStoredReminders();
  const identifier = reminders[taskId];
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  const { [taskId]: _removed, ...remaining } = reminders;
  await writeStoredReminders(remaining);
}

export async function scheduleScheduledCallReminder(callId: string, mediaType: "audio" | "video", startsAt: string): Promise<TaskReminderResult> {
  const trigger = scheduledCallReminderDate(startsAt);
  if (!trigger) return "not-due";
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") return permission.status === "denied" ? "not-permitted" : "unavailable";
  const reminders = await readStoredReminders(CALL_REMINDERS_KEY);
  if (reminders[callId]) await Notifications.cancelScheduledNotificationAsync(reminders[callId]);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "PeacePad call reminder",
      body: `Your ${mediaType} call starts in 15 minutes.`,
      data: { kind: "scheduled-call", callId },
      sound: "default"
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger }
  });
  await writeStoredReminders({ ...reminders, [callId]: identifier }, CALL_REMINDERS_KEY);
  return "scheduled";
}

export async function cancelScheduledCallReminder(callId: string): Promise<void> {
  const reminders = await readStoredReminders(CALL_REMINDERS_KEY);
  const identifier = reminders[callId];
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  const { [callId]: _removed, ...remaining } = reminders;
  await writeStoredReminders(remaining, CALL_REMINDERS_KEY);
}
