import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { LabButton } from "../components/LabButton";
import { useCoordinationState } from "../coordination/CoordinationState";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
import { colors, spacing, typography } from "../theme";
import { taskCopy } from "./taskLocalization";
import { cancelTaskReminder, scheduleTaskReminder } from "../notifications/TaskReminders";

export function dueDateToIso(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString()
    : undefined;
}

function dueDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export function ParentingTasksScreen() {
  const { locale } = useOptionalLocalization();
  const t = taskCopy(locale);
  const { actorIdentityId, addTask, connected, deleteTask, setTaskCompleted, tasks } = useCoordinationState();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [shared, setShared] = useState(false);
  const [remindMe, setRemindMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const openTasks = useMemo(() => tasks.filter((task) => task.status === "open"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "completed"), [tasks]);

  const add = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError(t.required);
      return;
    }
    const normalizedDueAt = dueAt.trim() ? dueDateToIso(dueAt) : undefined;
    if (dueAt.trim() && !normalizedDueAt) {
      setError(t.invalidDate);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const task = await addTask({ title: normalizedTitle, dueAt: normalizedDueAt, shared: connected && shared });
      if (remindMe && task?.dueAt) {
        const reminder = await scheduleTaskReminder(task.id, task.title, task.dueAt);
        if (reminder === "not-permitted") setError("Task saved. Turn on notifications in your device settings to receive this reminder.");
        if (reminder === "not-due") setError("Task saved. That due date is too soon for a 9 AM reminder.");
      }
      setTitle("");
      setDueAt("");
      setShared(false);
      setRemindMe(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "PeacePad could not save that task.");
    } finally {
      setBusy(false);
    }
  };

  const updateCompletion = async (taskId: string, completed: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      await setTaskCompleted(taskId, completed);
      if (completed) await cancelTaskReminder(taskId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "PeacePad could not update that task.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (taskId: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await deleteTask(taskId);
      await cancelTaskReminder(taskId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "PeacePad could not remove that task.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.page}>
      <AccessibleHeading style={styles.title}>{t.title}</AccessibleHeading>
      <Text style={styles.body}>{t.body}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t.taskLabel}</Text>
        <TextInput accessibilityLabel={t.taskLabel} maxLength={160} onChangeText={(value) => { setTitle(value); setError(undefined); }} placeholder={t.taskPlaceholder} placeholderTextColor={colors.muted} style={styles.input} value={title} />
        <Text style={styles.label}>{t.dueDateLabel}</Text>
        <TextInput accessibilityHint={t.dueDateHint} accessibilityLabel={t.dueDateLabel} autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={(value) => { setDueAt(value); setError(undefined); }} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.input} value={dueAt} />
        {connected ? <Pressable accessibilityLabel={t.sharedLabel} accessibilityRole="checkbox" accessibilityState={{ checked: shared }} onPress={() => setShared((current) => !current)} style={({ pressed }) => [styles.shareRow, pressed ? styles.pressed : null]}>
          <View style={[styles.checkbox, shared ? styles.checkboxChecked : null]}><Text style={styles.checkboxText}>{shared ? "✓" : ""}</Text></View>
          <View style={styles.shareCopy}><Text style={styles.actionTitle}>{t.sharedLabel}</Text><Text style={styles.caption}>{t.sharedBody}</Text></View>
        </Pressable> : <Text style={styles.caption}>{t.sharedBody}</Text>}
        {dueAt.trim() ? <Pressable accessibilityLabel="Remind me at 9 AM on the due date" accessibilityRole="checkbox" accessibilityState={{ checked: remindMe }} onPress={() => setRemindMe((current) => !current)} style={({ pressed }) => [styles.shareRow, pressed ? styles.pressed : null]}>
          <View style={[styles.checkbox, remindMe ? styles.checkboxChecked : null]}><Text style={styles.checkboxText}>{remindMe ? "✓" : ""}</Text></View>
          <View style={styles.shareCopy}><Text style={styles.actionTitle}>Remind me at 9 AM</Text><Text style={styles.caption}>This is a private reminder on this device. It does not alert the other parent.</Text></View>
        </Pressable> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <LabButton disabled={busy} label={t.add} onPress={() => void add()} />
      </View>

      <TaskGroup emptyLabel={t.noneOpen} heading={t.open} tasks={openTasks} t={t} busy={busy} actorIdentityId={actorIdentityId} onDelete={remove} onToggle={updateCompletion} />
      <TaskGroup emptyLabel={t.noneCompleted} heading={t.completed} tasks={completedTasks} t={t} busy={busy} actorIdentityId={actorIdentityId} onDelete={remove} onToggle={updateCompletion} />
    </View>
  );
}

function TaskGroup({ actorIdentityId, busy, emptyLabel, heading, onDelete, onToggle, t, tasks }: {
  actorIdentityId?: string;
  busy: boolean;
  emptyLabel: string;
  heading: string;
  onDelete: (taskId: string) => Promise<void>;
  onToggle: (taskId: string, completed: boolean) => Promise<void>;
  t: ReturnType<typeof taskCopy>;
  tasks: ReturnType<typeof useCoordinationState>["tasks"];
}) {
  return <View style={styles.group}>
    <Text accessibilityRole="header" style={styles.heading}>{heading}</Text>
    {tasks.length === 0 ? <Text style={styles.caption}>{emptyLabel}</Text> : tasks.map((task) => {
      const due = dueDate(task.dueAt);
      const completed = task.status === "completed";
      return <View key={task.id} style={styles.taskCard}>
        <View style={styles.taskCopy}>
          <Text style={[styles.actionTitle, completed ? styles.completed : null]}>{task.title}</Text>
          <Text style={styles.caption}>{task.visibility.scope === "family" ? t.shared : t.private}{due ? ` · ${t.due(due)}` : ""}</Text>
        </View>
        <View style={styles.taskActions}>
          <LabButton disabled={busy} label={completed ? t.reopen : t.complete} onPress={() => void onToggle(task.id, !completed)} variant="secondary" />
          {task.createdByIdentityId === actorIdentityId ? <Pressable accessibilityLabel={t.delete} accessibilityRole="button" disabled={busy} onPress={() => void onDelete(task.id)} style={({ pressed }) => [styles.deleteButton, pressed ? styles.pressed : null]}><Text style={styles.deleteText}>{t.delete}</Text></Pressable> : null}
        </View>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  card: { backgroundColor: "#FFF1DF", borderColor: "#F2C8B5", borderRadius: 24, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  label: { ...typography.caption, color: colors.muted, fontWeight: "800" },
  input: { backgroundColor: colors.surface, borderColor: "#E7C8BD", borderRadius: 18, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 52, paddingHorizontal: spacing.md },
  shareRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 48 },
  checkbox: { alignItems: "center", borderColor: colors.border, borderRadius: 5, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  checkboxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkboxText: { color: colors.onBrand, fontSize: 16, fontWeight: "800" },
  shareCopy: { flex: 1, gap: 2 },
  error: { ...typography.body, color: colors.dangerText },
  group: { gap: spacing.sm },
  heading: { ...typography.heading, color: colors.text },
  taskCard: { backgroundColor: "#DDF6F0", borderColor: "#76CCBE", borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  taskCopy: { gap: 2 },
  actionTitle: { ...typography.subheading, color: colors.text },
  caption: { ...typography.caption, color: colors.muted },
  completed: { color: colors.muted, textDecorationLine: "line-through" },
  taskActions: { flexDirection: "row", gap: spacing.sm },
  deleteButton: { alignItems: "center", borderColor: colors.dangerBorder, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.md },
  deleteText: { ...typography.caption, color: colors.dangerText, fontWeight: "800" },
  pressed: { opacity: 0.7 }
});
