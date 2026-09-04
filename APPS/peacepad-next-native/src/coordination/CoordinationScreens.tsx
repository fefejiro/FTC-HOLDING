import React, { useEffect, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { InvitationQr } from "../components/InvitationQr";
import { PeacePadIcon } from "../components/PeacePadIcon";
import { ScreenHeader } from "../components/ScreenHeader";
import { LabButton } from "../components/LabButton";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { languageNames, supportedLocales, useLocalization, useOptionalLocalization } from "../localization/LocalizationProvider";
import { calendarNavigationText, calendarStatusText, calendarText, formatCalendarDate, formatCalendarDay } from "../localization/calendarLocalization";
import { formatLocalizedDate } from "../localization/localizedDate";
import { messageText } from "../localization/messageLocalization";
import { workflowText } from "../localization/workflowLocalization";
import { homeHeroText, homeText } from "../localization/homeLocalization";
import { callText } from "../localization/callLocalization";
import { PublicOnboardingSlides } from "../auth/PublicOnboardingAuth";
import { LinkedSignInMethods } from "../auth/LinkedSignInMethods";
import { SupportPanel } from "../support/SupportPanel";
import { colors, spacing, typography, usesLargeTextLayout } from "../theme";
import { useRecordsState } from "../records/RecordsState";
import type { AttachmentMediaType } from "../domain/v2";
import { useOptionalStagingAccountActions } from "../session/StagingAccountActions";
import { useCoordinationState, type CalendarView, type SentMessage } from "./CoordinationState";
import { ActivitySuggestionsScreen } from "../activities/ActivitySuggestionsScreen";
import { ParentingTasksScreen } from "../tasks/ParentingTasksScreen";
import { taskCopy } from "../tasks/taskLocalization";
import { PersonalityProfilePanel } from "../preferences/PersonalityProfilePanel";
import { CustodySchedulePlanner } from "../calendar/CustodySchedulePlanner";
import { custodyParentForDate, type CustodyBlock, type CustodyOverride, type CustodySchedule } from "../calendar/custodySchedule";
import { custodyScheduleText } from "../calendar/custodyScheduleLocalization";
import { buildPeacePadCalendar } from "../calendar/calendarExport";
import { CoachConversation } from "../coach/CoachConversation";
import { ConversationVoiceNote } from "../messages/ConversationVoiceNote";
import type { AccountExportManifest } from "../api/CoordinationApi";

export type CoordinationScreen = "home" | "coach" | "messages" | "calendar" | "activities" | "tasks" | "invite" | "records" | "calls" | "family" | "support" | "conch" | "more";
type Navigate = (screen: CoordinationScreen) => void;

const layerColors: Record<string, string> = {
  teal: "#24B9B5",
  violet: "#8B5CF6",
  amber: "#F59E0B",
  rose: "#EF476F",
  blue: "#3B82F6",
  green: "#62B44B"
};

function atUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(value: Date, amount: number): Date {
  const next = atUtcDay(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function addUtcMonths(value: Date, amount: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1));
}

function sameUtcDay(left: Date, right: Date): boolean {
  return left.getUTCFullYear() === right.getUTCFullYear()
    && left.getUTCMonth() === right.getUTCMonth()
    && left.getUTCDate() === right.getUTCDate();
}

function eventOccursOnDay(event: ReturnType<typeof useCoordinationState>["events"][number], date: Date): boolean {
  return sameUtcDay(new Date(event.startsAt), date);
}

function calendarDateTimeInput(value: Date): string {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16).replace("T", " ");
}

function parseCalendarDateTime(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const parsed = new Date(year, month - 1, day, hour, minute);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    && parsed.getHours() === hour && parsed.getMinutes() === minute
    ? parsed.toISOString()
    : undefined;
}

function startOfUtcWeek(value: Date): Date {
  const date = atUtcDay(value);
  return addUtcDays(date, -((date.getUTCDay() + 6) % 7));
}

function CalendarViewPanel({
  calendarView,
  events,
  layers,
  locale,
  anchorDate,
  custodySchedule,
  custodyOverrides
}: {
  calendarView: CalendarView;
  events: ReturnType<typeof useCoordinationState>["events"];
  layers: ReturnType<typeof useCoordinationState>["layers"];
  locale: ReturnType<typeof useLocalization>["locale"];
  anchorDate: Date;
  custodySchedule?: CustodySchedule;
  custodyOverrides?: readonly CustodyOverride[];
}) {
  const layerName = (calendarLayerId: string) =>
    layers.find((layer) => layer.id === calendarLayerId)?.name ?? "Calendar";

  if (calendarView === "month") {
    const firstOfMonth = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1));
    const leadingBlankCount = (firstOfMonth.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() + 1, 0)).getUTCDate();
    const weekdays = Array.from({ length: 7 }, (_, index) => addUtcDays(firstOfMonth, index - leadingBlankCount));
    const cells: readonly { key: string; day?: number }[] = [
      ...Array.from({ length: leadingBlankCount }, (_, index) => ({ key: `blank-${index}` })),
      ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 }))
    ];
    return (
      <View accessibilityLabel={`${calendarText(locale, "month")} ${calendarText(locale, "title")}`.toLocaleLowerCase(locale)} style={styles.calendarCanvas}>
        <Text style={styles.calendarMonth}>{formatCalendarDate(locale, firstOfMonth, { month: "long", year: "numeric" })}</Text>
        <View style={styles.monthGrid}>
          {weekdays.map((date) => (
            <Text key={date.toISOString()} style={styles.weekday}>{formatCalendarDate(locale, date, { weekday: "short" })}</Text>
          ))}
          {cells.map((cell) => {
            const date = cell.day ? new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), cell.day)) : undefined;
            const dayEvents = date ? events.filter((event) => eventOccursOnDay(event, date)) : [];
            const custodyParent = date ? custodyParentForDate(date, custodySchedule, custodyOverrides) : null;
            return (
              <View accessibilityLabel={date ? `${formatCalendarDate(locale, date, { month: "long", day: "numeric" })}${custodyParent ? `, ${custodyScheduleText(locale, custodyParent === "you" ? "yourTime" : "otherTime")}` : ""}` : undefined} key={cell.key} style={[styles.monthCell, custodyParent === "you" ? styles.yourTimeCell : custodyParent === "other" ? styles.otherTimeCell : null]}>
                {cell.day ? <Text style={styles.dayNumber}>{cell.day}</Text> : null}
                {custodyParent ? <Text numberOfLines={1} style={styles.custodyCellLabel}>{custodyParent === "you" ? "You" : "Other"}</Text> : null}
                {dayEvents.slice(0, 1).map((event) => (
                  <Text key={event.id} numberOfLines={1} style={styles.monthEvent}>{event.title}</Text>
                ))}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (calendarView === "week") {
    const firstDay = startOfUtcWeek(anchorDate);
    const week = Array.from({ length: 7 }, (_, index) => addUtcDays(firstDay, index));
    return (
      <View accessibilityLabel={`${calendarText(locale, "week")} ${calendarText(locale, "title")}`.toLocaleLowerCase(locale)} style={styles.calendarCanvas}>
        <Text style={styles.calendarMonth}>{formatCalendarDate(locale, firstDay, { month: "short", day: "numeric" })}–{formatCalendarDate(locale, week[6], { day: "numeric" })}</Text>
        <View style={styles.scheduleList}>
          {week.map((date) => {
            const dayEvents = events.filter((event) => eventOccursOnDay(event, date));
            const custodyParent = custodyParentForDate(date, custodySchedule, custodyOverrides);
            return (
              <View key={date.toISOString()} style={styles.scheduleRow}>
                <Text style={styles.scheduleDate}>{formatCalendarDay(locale, date)}</Text>
                <View style={styles.scheduleContent}>
                  {custodyParent ? <Text style={[styles.custodyLabel, custodyParent === "you" ? styles.yourTimeText : styles.otherTimeText]}>{custodyScheduleText(locale, custodyParent === "you" ? "yourTime" : "otherTime")}</Text> : null}
                  {dayEvents.length ? dayEvents.map((event) => (
                    <View key={event.id} style={styles.scheduleEvent}>
                      <Text style={styles.actionTitle}>{event.title}</Text>
                      <Text style={styles.caption}>{layerName(event.calendarLayerId)} - {calendarStatusText(locale, event.status)}</Text>
                    </View>
                  )) : <Text style={styles.caption}>{calendarText(locale, "noEvents")}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const dayEvents = events.filter((event) => eventOccursOnDay(event, anchorDate));
  const custodyParent = custodyParentForDate(anchorDate, custodySchedule, custodyOverrides);
  return (
    <View accessibilityLabel={`${calendarText(locale, "day")} ${calendarText(locale, "title")}`.toLocaleLowerCase(locale)} style={styles.calendarCanvas}>
      <Text style={styles.calendarMonth}>{formatCalendarDate(locale, anchorDate, { weekday: "long", month: "long", day: "numeric" })}</Text>
      <View style={styles.scheduleList}>
        {custodyParent ? <Text style={[styles.custodyLabel, custodyParent === "you" ? styles.yourTimeText : styles.otherTimeText]}>{custodyScheduleText(locale, custodyParent === "you" ? "yourTime" : "otherTime")}</Text> : null}
        {dayEvents.length ? dayEvents.map((event) => (
          <View key={event.id} style={styles.scheduleEvent}>
            <Text style={styles.actionTitle}>{event.title}</Text>
            <Text style={styles.caption}>{layerName(event.calendarLayerId)} - {calendarStatusText(locale, event.status)}</Text>
          </View>
        )) : <Text style={styles.calendarEmpty}>{calendarText(locale, "noEventsYet")}</Text>}
      </View>
    </View>
  );
}

export function CoordinationHomeScreen({ setScreen }: { setScreen: Navigate }) {
  const { locale } = useOptionalLocalization();
  const h = (key: Parameters<typeof homeText>[1]) => homeText(locale, key);
  const task = taskCopy(locale);
  const { events, invitationGrant } = useCoordinationState();
  const hasCoParent = Boolean(invitationGrant);
  const accountActions = useOptionalStagingAccountActions();
  const firstName = accountActions?.displayName?.trim().split(/\s+/)[0];
  const nextEvent = [...events].sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0];
  const nextEventDate = nextEvent
    ? formatLocalizedDate(locale, nextEvent.startsAt, { weekday: "short", month: "short", day: "numeric" })
    : undefined;
  const nextEventTime = nextEvent
    ? formatLocalizedDate(locale, nextEvent.startsAt, { hour: "numeric", minute: "2-digit" })
    : undefined;

  return (
    <View style={styles.stack}>
      <View style={styles.brandHero}>
        <View style={styles.heroSun} />
        <View style={styles.heroBubble} />
        <View style={styles.brandHeroCopy}>
          <View accessibilityLabel="PeacePad Native V2" style={styles.brandLockup}>
            <Image accessibilityLabel={h("logo")} source={require("../../assets/icon-production.png")} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>PeacePad</Text>
              <Text style={styles.brandVersion}>Native V2</Text>
            </View>
          </View>
          <Text style={styles.heroEyebrow}>YOUR FAMILY, YOUR PACE</Text>
          <AccessibleHeading style={styles.heroTitle}>{homeHeroText(locale, firstName ? "greetingNamed" : "greeting", firstName)}</AccessibleHeading>
          <Text style={styles.heroBody}>{homeHeroText(locale, "impact")}</Text>
        </View>
        <View accessible={false} style={styles.heroDoodle}><PeacePadIcon name="sunny-outline" size={38} color={colors.warning} /><PeacePadIcon name="heart-outline" size={27} color={colors.coral} /></View>
      </View>

      <View style={styles.datePill}>
        <Text style={styles.datePillText}>{formatLocalizedDate(locale, new Date(), { weekday: "long", month: "long", day: "numeric" })}</Text>
      </View>

      {hasCoParent ? <View accessibilityLabel="Shared connection tools" style={styles.sharedTools}>
        <Pressable accessibilityHint="Start or answer a private audio or video call with your connected co-parent." accessibilityLabel="Open audio and video calls" accessibilityRole="button" onPress={() => setScreen("calls")} style={({ pressed }) => [styles.sharedToolCard, styles.callToolCard, pressed ? styles.pressed : null]}>
          <PeacePadIcon color={colors.brand} name="videocam-outline" size={24} />
          <Text style={styles.sharedToolTitle}>Audio & video calls</Text>
          <Text style={styles.caption}>Talk when it helps.</Text>
        </Pressable>
        <Pressable accessibilityHint="Open a consent-based, turn-taking audio or video conversation." accessibilityLabel="Open Conch mode" accessibilityRole="button" onPress={() => setScreen("conch")} style={({ pressed }) => [styles.sharedToolCard, styles.conchToolCard, pressed ? styles.pressed : null]}>
          <PeacePadIcon color={colors.successText} name="people-circle-outline" size={24} />
          <Text style={styles.sharedToolTitle}>Conch mode</Text>
          <Text style={styles.caption}>One calm turn each.</Text>
        </Pressable>
      </View> : <Pressable accessibilityHint="Invite a co-parent to unlock shared messages, audio and video calls, and Conch mode." accessibilityLabel="Invite a co-parent to unlock calls and Conch" accessibilityRole="button" onPress={() => setScreen("invite")} style={({ pressed }) => [styles.connectionToolCard, pressed ? styles.pressed : null]}>
        <View style={[styles.activityDot, { backgroundColor: "#BEEAE2" }]}><PeacePadIcon color={colors.successText} name="people-circle-outline" size={24} /></View>
        <View style={styles.activityCopy}>
          <Text style={styles.activityTitle}>Calls & Conch are ready when you are</Text>
          <Text style={styles.caption}>Invite a co-parent to unlock shared audio, video and calm turn-taking conversations.</Text>
        </View>
      </Pressable>}

      <View style={styles.todayLine}>
        <Text accessibilityRole="header" style={styles.heading}>{h("today")}</Text>
        <Text style={styles.connectionStatus}>{h(invitationGrant ? "connected" : "notConnected")}</Text>
      </View>

      {nextEvent ? (
        <View accessibilityLabel={h("upcoming")} style={styles.planCard}>
          <View style={styles.planAccent} />
          <View style={styles.planCopy}>
            <Text style={styles.planEyebrow}>{h("upcoming")}</Text>
            <Text style={styles.planTitle}>{nextEvent.title}</Text>
            <Text style={styles.body}>{[nextEventDate, nextEventTime].filter(Boolean).join(" • ")}</Text>
            <Text style={styles.caption}>{h("event")}</Text>
          </View>
        </View>
      ) : (
        <Pressable accessibilityLabel={h("event")} accessibilityRole="button" onPress={() => setScreen("calendar")} style={({ pressed }) => [styles.planCard, styles.planCardEmpty, pressed ? styles.pressed : null]}>
          <View style={[styles.planAccent, styles.planAccentSun]} />
          <View style={styles.planCopy}>
            <Text style={styles.planEyebrow}>{h("upcoming")}</Text>
            <Text style={styles.planTitle}>{h("event")}</Text>
            <Text style={styles.body}>{h("eventBody")}</Text>
          </View>
        </Pressable>
      )}

      <Pressable accessibilityHint="Shows weather-aware ideas for time with your children." accessibilityRole="button" accessibilityLabel="Activity ideas" onPress={() => setScreen("activities")} style={({ pressed }) => [styles.activityCard, pressed ? styles.pressed : null]}>
        <View style={styles.activityDot}><PeacePadIcon name="sunny-outline" size={23} color={colors.text} /></View>
        <View style={styles.activityCopy}>
          <Text style={styles.activityTitle}>Activity ideas</Text>
          <Text style={styles.caption}>Find weather-aware ideas for the time you have together.</Text>
        </View>
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel={task.title} onPress={() => setScreen("tasks")} style={({ pressed }) => [styles.taskCard, pressed ? styles.pressed : null]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="checkmark-circle-outline" size={23} color={colors.warning} /><Text style={styles.taskTitle}>{task.title}</Text></View>
        <Text style={styles.caption}>{task.body}</Text>
      </Pressable>

      <Pressable accessibilityHint="Find counselling, safety, legal and family support near you." accessibilityRole="button" accessibilityLabel="Find support near me" onPress={() => setScreen("support")} style={({ pressed }) => [styles.activityCard, { backgroundColor: "#F3E7F1", borderColor: "#CBB1D7" }, pressed ? styles.pressed : null]}>
        <View style={[styles.activityDot, { backgroundColor: "#E5D1EC" }]}><PeacePadIcon name="heart-outline" size={23} color={colors.brand} /></View>
        <View style={styles.activityCopy}>
          <Text style={styles.activityTitle}>Find support near me</Text>
          <Text style={styles.caption}>Counselling, safety help, legal guidance and someone to talk to.</Text>
        </View>
      </Pressable>

      <Pressable accessibilityHint="Opens a private place to speak or type and prepare calm, child-focused wording." accessibilityRole="button" accessibilityLabel="Open PeaceBot Coach" onPress={() => setScreen("coach")} style={({ pressed }) => [styles.activityCard, { backgroundColor: colors.cream, borderColor: colors.warningBorder }, pressed ? styles.pressed : null]}>
        <View style={[styles.activityDot, { backgroundColor: "#FFD9CF" }]}><PeacePadIcon name="heart-circle-outline" size={23} color={colors.coral} /></View>
        <View style={styles.activityCopy}>
          <Text style={styles.activityTitle}>PeaceBot Coach</Text>
          <Text style={styles.caption}>Talk it through privately, prepare calm wording, and choose what to share.</Text>
        </View>
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel="Family tools" onPress={() => setScreen("family")} style={({ pressed }) => [styles.activityCard, { backgroundColor: "#FFE4D6", borderColor: "#F2A791" }, pressed ? styles.pressed : null]}>
        <View style={[styles.activityDot, { backgroundColor: colors.sun }]}><PeacePadIcon name="heart-circle-outline" size={23} color={colors.text} /></View>
        <View style={styles.activityCopy}>
          <Text style={styles.activityTitle}>Family tools</Text>
          <Text style={styles.caption}>Children, shared costs, support, call plans and Conch.</Text>
        </View>
      </Pressable>

      {hasCoParent ? <Pressable accessibilityRole="button" accessibilityLabel="Open Conch mode" onPress={() => setScreen("conch")} style={({ pressed }) => [styles.activityCard, { backgroundColor: "#DDF6F0", borderColor: "#76CCBE" }, pressed ? styles.pressed : null]}>
        <View style={[styles.activityDot, { backgroundColor: "#BEEAE2" }]}><PeacePadIcon name="people-circle-outline" size={23} color={colors.successText} /></View>
        <View style={styles.activityCopy}>
          <Text style={styles.activityTitle}>Conch mode</Text>
          <Text style={styles.caption}>A consent-based audio or video conversation where each parent gets a calm turn.</Text>
        </View>
      </Pressable> : null}

      <Pressable accessibilityRole="button" accessibilityLabel={h("record")} onPress={() => setScreen("records")} style={({ pressed }) => [styles.recordCard, pressed ? styles.pressed : null]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="attach-outline" size={23} color={colors.accent} /><Text style={styles.recordTitle}>{h("record")}</Text></View>
        <Text style={styles.caption}>{h("recordBody")}</Text>
      </Pressable>

      <Pressable accessibilityRole="button" accessibilityLabel={h("send")} onPress={() => setScreen("messages")} style={({ pressed }) => [styles.messageCta, pressed ? styles.pressed : null]}>
        <View style={styles.messageCtaCopy}>
          <Text style={styles.messageCtaTitle}>{h("send")}</Text>
          <Text style={styles.messageCtaBody}>{h("sendBody")}</Text>
        </View>
        <View style={styles.messageCtaIcon}><PeacePadIcon name="chatbubble-ellipses-outline" size={27} color={colors.onBrand} /></View>
      </Pressable>

      {hasCoParent ? <Pressable accessibilityLabel={callText(locale, "title")} accessibilityRole="button" onPress={() => setScreen("calls")} style={({ pressed }) => [styles.callCard, pressed ? styles.pressed : null]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="call-outline" size={23} color={colors.brand} /><Text style={styles.callTitle}>{callText(locale, "title")}</Text></View>
        <Text style={styles.caption}>{callText(locale, "body")}</Text>
      </Pressable> : null}

      <Pressable accessibilityLabel={h("invite")} accessibilityRole="button" onPress={() => setScreen("invite")} style={({ pressed }) => [styles.inviteCard, pressed ? styles.pressed : null]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="people-outline" size={23} color={colors.successText} /><Text style={styles.inviteTitle}>{h("invite")}</Text></View>
        <Text style={styles.caption}>{h("inviteBody")}</Text>
      </Pressable>

    </View>
  );
}

export { ActivitySuggestionsScreen };
export { ParentingTasksScreen };

export function InvitationScreen({ initialCode }: { initialCode?: string }) {
  const { t } = useLocalization();
  const {
    acceptInvitation,
    connectedInvitationAcceptanceBlocked,
    createInvitation,
    createdInvitation,
    declineInvitation,
    invitationBusy,
    invitationCode,
    invitationError,
    invitationGrant,
    invitationPreview,
    resolveInvitation,
    revokeCreatedInvitation,
    setInvitationCode
  } = useCoordinationState();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [shareError, setShareError] = useState<string>();
  const invitationInputRef = useRef<TextInput>(null);
  const permissionLabels: Readonly<Record<string, string>> = {
    messages: t("invite.permissionMessages"), calendar: t("invite.permissionCalendar"),
    "shared-records": t("invite.permissionSharedRecords"), "message.write": t("invite.permissionMessageWrite"),
    "calendar.write": t("invite.permissionCalendarWrite"), calls: t("invite.permissionCalls")
  };

  useEffect(() => {
    if (!initialCode) return;
    setMode("join");
    setInvitationCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (mode !== "join") return;
    const focusHandle = requestAnimationFrame(() => invitationInputRef.current?.focus());
    return () => cancelAnimationFrame(focusHandle);
  }, [mode]);

  const shareCreatedInvitation = async () => {
    if (!createdInvitation) return;
    setShareError(undefined);
    try {
      await Share.share({
        message: [
          t("invite.shareTitle"),
          t("invite.shareReview"),
          t("invite.shareCode", { code: createdInvitation.code }),
          createdInvitation.deepLink
        ].join("\n\n")
      });
    } catch {
      setShareError(t("invite.shareUnavailable"));
    }
  };

  return (
    <View style={styles.stack}>
      <AccessibleHeading style={styles.title}>{t("invite.title")}</AccessibleHeading>
      <Text style={styles.body}>{t("invite.body")}</Text>

      <View accessibilityLabel={t("invite.action")} accessibilityRole="tablist" style={styles.segmented}>
        <Pressable
          accessibilityLabel={t("invite.createTab")}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "create" }}
          onPress={() => setMode("create")}
          style={[styles.segment, mode === "create" ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentText, mode === "create" ? styles.segmentTextActive : null]}>{t("invite.createTab")}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t("invite.joinTab")}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "join" }}
          onPress={() => setMode("join")}
          style={[styles.segment, mode === "join" ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentText, mode === "join" ? styles.segmentTextActive : null]}>{t("invite.joinTab")}</Text>
        </Pressable>
      </View>

      {mode === "create" ? (
        <View accessibilityLabel={t("invite.createCard")} style={styles.card}>
          <Text style={styles.heading}>{t("invite.createTitle")}</Text>
          <Text style={styles.body}>{t("invite.createBody")}</Text>
          <Text style={styles.fieldLabel}>{t("invite.access")}</Text>
          <Text style={styles.body}>• {t("invite.messages")}</Text>
          <Text style={styles.body}>• {t("invite.calendar")}</Text>
          <Text style={styles.body}>• {t("invite.sharedRecords")}</Text>

          {!createdInvitation ? (
            <LabButton
              disabled={invitationBusy}
              label={invitationBusy ? t("invite.creating") : t("invite.create")}
              onPress={() => void createInvitation()}
            />
          ) : (
            <View accessibilityLabel={t("invite.ready")} style={styles.stackTight}>
              <Text style={styles.fieldLabel}>{t("invite.code")}</Text>
              <Text accessibilityLabel={t("invite.codeLabel", { code: createdInvitation.code })} style={styles.invitationCode}>
                {createdInvitation.code}
              </Text>
              <View
                accessibilityHint={t("invite.qrHint")}
                accessibilityLabel={t("invite.qrLabel")}
                accessibilityRole="image"
                style={styles.qrCard}
              >
                <InvitationQr value={createdInvitation.deepLink} />
                <Text style={styles.qrLabel}>{t("invite.qrAction")}</Text>
              </View>
              <Text style={styles.caption}>{t("invite.expiry")}</Text>
              <LabButton label={t("invite.share")} onPress={() => void shareCreatedInvitation()} />
              <LabButton
                disabled={invitationBusy}
                label={invitationBusy ? t("invite.cancelling") : t("invite.cancel")}
                onPress={() => void revokeCreatedInvitation()}
                variant="secondary"
              />
            </View>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.body}>{t("invite.joinBody")}</Text>
           {!invitationPreview ? <Text style={styles.caption}>{t("invite.privateUntilAccepted")}</Text> : null}
          <View style={styles.codeEntry}>
            {Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.codeCell, invitationCode[index] ? styles.codeCellFilled : null]}><Text accessible={false} style={styles.codeCellText}>{invitationCode[index] ?? ""}</Text></View>)}
            <TextInput
              ref={invitationInputRef}
              accessibilityLabel={t("invite.code")}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              onChangeText={setInvitationCode}
              placeholder="ABC123"
              style={styles.codeInputOverlay}
              textContentType="oneTimeCode"
              value={invitationCode}
            />
          </View>
          <LabButton
            disabled={invitationCode.length !== 6 || invitationBusy}
            label={invitationBusy ? t("invite.checking") : t("invite.review")}
            onPress={() => void resolveInvitation()}
          />
        </>
      )}

      {invitationError ? <Text accessibilityRole="alert" style={styles.error}>{invitationError}</Text> : null}
      {shareError ? <Text accessibilityRole="alert" style={styles.error}>{shareError}</Text> : null}

      {invitationPreview ? (
        <View accessibilityLabel={t("invite.preview")} style={styles.card}>
          <Text style={styles.heading}>{t("invite.invitedBy", { name: invitationPreview.inviterDisplayName })}</Text>
          <Text style={styles.body}>{invitationPreview.familyDisplayName}</Text>
          <Text style={styles.fieldLabel}>{t("invite.role")}</Text>
          <Text style={styles.body}>{invitationPreview.invitedRole === "parent" ? t("invite.roleParent") : invitationPreview.invitedRole}</Text>
          <Text style={styles.fieldLabel}>{t("invite.access")}</Text>
          {invitationPreview.permissions.map((permission) => (
            <Text key={permission} style={styles.body}>• {permissionLabels[permission] ?? permission.replace(/[-.]/g, " ")}</Text>
          ))}
          <Text style={styles.caption}>{t("invite.privateUntilAccepted")}</Text>
          {connectedInvitationAcceptanceBlocked ? (
            <Text accessibilityRole="alert" style={styles.caption}>
              {t("invite.familyBlocked")}
            </Text>
          ) : (
            <LabButton disabled={invitationBusy} label={t("invite.accept")} onPress={() => void acceptInvitation()} />
          )}
          <LabButton disabled={invitationBusy} label={t("invite.decline")} onPress={() => void declineInvitation()} variant="secondary" />
        </View>
      ) : null}

      {invitationGrant ? (
        <View accessibilityLabel={t("invite.accepted")} style={styles.successCard}>
          <Text style={styles.heading}>{t("invite.connected")}</Text>
          <Text style={styles.body}>{t("invite.connectedBody")}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function CalendarScreen({ initialEventTitle }: { initialEventTitle?: string }) {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);
  const { locale } = useOptionalLocalization();
  const w = (key: Parameters<typeof workflowText>[1], values?: Readonly<Record<string, string>>) => workflowText(locale, key, values);
  const {
    addEvent,
    calendarView,
    deleteEvent,
    events,
    layers,
    setCalendarView,
    setLayerShared,
    toggleLayerFilter,
    visibleLayerIds,
    connected,
    parentingSchedulePlan,
    saveParentingSchedulePlan,
    actorIdentityId,
    parentingScheduleExceptions,
    createParentingScheduleException,
    resolveParentingScheduleException
  } = useCoordinationState();
  const [eventTitle, setEventTitle] = useState("");
  const [selectedLayerId, setSelectedLayerId] = useState(layers[0]?.id ?? "");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => atUtcDay(new Date()));
  const [eventStartsAt, setEventStartsAt] = useState(() => calendarDateTimeInput(new Date()));
  const [eventEndsAt, setEventEndsAt] = useState(() => calendarDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [eventTimeError, setEventTimeError] = useState(false);
  const [eventSaveBusy, setEventSaveBusy] = useState(false);
  const [eventSaveError, setEventSaveError] = useState<string>();
  const [pendingShareLayerId, setPendingShareLayerId] = useState<string>();
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<string>();
  const [eventType, setEventType] = useState<"parenting-time" | "appointment" | "change-request">("parenting-time");

  useEffect(() => {
    if (layers.length > 0 && !layers.some((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId(layers[0].id);
    }
  }, [layers, selectedLayerId]);
  const [custodySchedule, setCustodySchedule] = useState<CustodySchedule>();
  const [exceptionStartDate, setExceptionStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exceptionEndDate, setExceptionEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exceptionNote, setExceptionNote] = useState("");
  const [exceptionKind, setExceptionKind] = useState<"holiday" | "vacation" | "swap" | "other">("swap");
  const [exceptionAssignedParent, setExceptionAssignedParent] = useState<"you" | "other">("you");
  const [exceptionBusy, setExceptionBusy] = useState(false);
  const [exceptionError, setExceptionError] = useState<string>();
  const [showPlanningTools, setShowPlanningTools] = useState(false);
  const [showCalendarManager, setShowCalendarManager] = useState(false);
  const [showEventSheet, setShowEventSheet] = useState(false);

  const visibleEvents = events.filter((event) => visibleLayerIds.includes(event.calendarLayerId));
  const custodyOverrides: readonly CustodyOverride[] = parentingScheduleExceptions
    .filter((item) => item.status === "accepted")
    .map((item) => ({ startDate: item.startDate, endDate: item.endDate, parent: item.assignedParentIdentityId === actorIdentityId ? "you" : "other" }));
  const views: readonly CalendarView[] = ["month", "week", "day"];
  const moveCalendar = (amount: number) => setCalendarAnchorDate((current) => calendarView === "month"
    ? addUtcMonths(current, amount)
    : addUtcDays(current, amount * (calendarView === "week" ? 7 : 1)));

  useEffect(() => {
    if (initialEventTitle?.trim()) {
      setEventTitle(initialEventTitle);
      setShowEventSheet(true);
    }
  }, [initialEventTitle]);

  return (
    <View style={styles.stack}>
      <ScreenHeader
        accent={colors.coral}
        icon="calendar-outline"
        kicker="Shared plans"
        softBackground={colors.cream}
        subtitle={calendarText(locale, "body")}
        title={calendarText(locale, "title")}
      />

      <View accessibilityLabel={calendarText(locale, "view")} accessibilityRole="tablist" style={styles.segmented}>
        {views.map((view) => (
          <Pressable
            accessibilityLabel={`${calendarText(locale, view)} ${calendarText(locale, "title").toLocaleLowerCase(locale)} view`}
            accessibilityRole="tab"
            accessibilityState={{ selected: calendarView === view }}
            key={view}
            onPress={() => setCalendarView(view)}
            style={[styles.segment, calendarView === view ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, calendarView === view ? styles.segmentTextActive : null]}>
              {calendarText(locale, view)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.calendarNavigation}>
        <LabButton label={calendarNavigationText(locale, "previous")} onPress={() => moveCalendar(-1)} variant="secondary" />
        <LabButton label={calendarNavigationText(locale, "today")} onPress={() => setCalendarAnchorDate(atUtcDay(new Date()))} variant="secondary" />
        <LabButton label={calendarNavigationText(locale, "next")} onPress={() => moveCalendar(1)} variant="secondary" />
      </View>

      <CalendarViewPanel anchorDate={calendarAnchorDate} calendarView={calendarView} custodyOverrides={custodyOverrides} custodySchedule={custodySchedule} events={visibleEvents} layers={layers} locale={locale} />

      <Pressable
        accessibilityLabel={calendarText(locale, showPlanningTools ? "hidePlanningTools" : "showPlanningTools")}
        accessibilityRole="button"
        accessibilityState={{ expanded: showPlanningTools }}
        onPress={() => setShowPlanningTools((current) => !current)}
        style={({ pressed }) => [styles.planningDisclosure, pressed ? styles.pressed : null]}
      >
        <View style={styles.planningDisclosureCopy}>
          <Text style={styles.planningDisclosureTitle}>{calendarText(locale, "planningTools")}</Text>
          <Text style={styles.caption}>{calendarText(locale, "planningToolsBody")}</Text>
        </View>
        <PeacePadIcon name={showPlanningTools ? "chevron-up" : "chevron-down"} size={22} color={colors.brand} />
      </Pressable>

      {showPlanningTools ? <>
      <CustodySchedulePlanner
        initialSchedule={parentingSchedulePlan ? {
          enabled: parentingSchedulePlan.status === "active",
          pattern: parentingSchedulePlan.pattern,
          startDate: parentingSchedulePlan.startDate,
          primaryParent: parentingSchedulePlan.primaryParentIdentityId === actorIdentityId ? "you" : "other"
        } : undefined}
        locale={locale}
        onAddBlocks={async (blocks: readonly CustodyBlock[]) => {
          if (!selectedLayerId) return;
          const existingKeys = new Set(events
            .filter((event) => event.eventType === "parenting-time" && event.title.startsWith("Parenting time - "))
            .map((event) => `${event.startsAt.slice(0, 10)}-${event.endsAt.slice(0, 10)}`));
          for (const block of blocks) {
            const parentLabel = block.parent === "you"
              ? calendarText(locale, "yourTime")
              : calendarText(locale, "otherTime");
            const title = `Parenting time - ${parentLabel}`;
            const key = `${block.startDate}-${block.endDate}`;
            if (existingKeys.has(key)) continue;
            await addEvent({
              layerId: selectedLayerId,
              title,
              startsAt: `${block.startDate}T00:00:00.000Z`,
              endsAt: `${block.endDate}T00:00:00.000Z`,
              eventType: "parenting-time"
            });
            existingKeys.add(key);
          }
        }}
        onScheduleChange={setCustodySchedule}
        onSave={(schedule) => saveParentingSchedulePlan({
          calendarLayerId: selectedLayerId,
          pattern: schedule.pattern,
          startDate: schedule.startDate,
          primaryParent: schedule.primaryParent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          status: schedule.enabled ? "active" : "paused"
        })}
        selectedLayerId={selectedLayerId}
      />

      <LabButton label={calendarText(locale, "shareCalendarAction")} onPress={() => void Share.share({
        title: "PeacePad parenting calendar",
        message: buildPeacePadCalendar({ schedule: custodySchedule, scheduleEvents: visibleEvents, exceptions: parentingScheduleExceptions, actorIdentityId })
      })} variant="secondary" />

      <View style={styles.card}>
        <Text style={styles.heading}>{calendarText(locale, "changesTitle")}</Text>
        <Text style={styles.body}>{calendarText(locale, "changesBody")}</Text>
        <View accessibilityRole="radiogroup" style={styles.rowWrap}>
          {(["holiday", "vacation", "swap", "other"] as const).map((kind) => <Pressable accessibilityLabel={kind} accessibilityRole="radio" accessibilityState={{ checked: exceptionKind === kind }} key={kind} onPress={() => setExceptionKind(kind)} style={[styles.chip, exceptionKind === kind ? styles.chipActive : null]}><Text style={[styles.chipText, exceptionKind === kind ? styles.chipTextActive : null]}>{kind}</Text></Pressable>)}
        </View>
        <View accessibilityRole="radiogroup" style={styles.rowWrap}>
          {(["you", "other"] as const).map((parent) => { const label = parent === "you" ? calendarText(locale, "yourTime") : calendarText(locale, "otherTime"); return <Pressable accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: exceptionAssignedParent === parent }} key={parent} onPress={() => setExceptionAssignedParent(parent)} style={[styles.chip, exceptionAssignedParent === parent ? styles.chipActive : null]}><Text style={[styles.chipText, exceptionAssignedParent === parent ? styles.chipTextActive : null]}>{label}</Text></Pressable>; })}
        </View>
        <TextInput accessibilityLabel={calendarText(locale, "changeStart")} onChangeText={setExceptionStartDate} placeholder="YYYY-MM-DD" style={styles.input} value={exceptionStartDate} />
        <TextInput accessibilityLabel={calendarText(locale, "changeEnd")} onChangeText={setExceptionEndDate} placeholder="YYYY-MM-DD" style={styles.input} value={exceptionEndDate} />
        <TextInput accessibilityLabel={calendarText(locale, "changeNote")} maxLength={500} multiline onChangeText={setExceptionNote} placeholder={calendarText(locale, "changesBody")} style={[styles.input, styles.multilineInput]} value={exceptionNote} />
        {exceptionError ? <Text accessibilityRole="alert" style={styles.error}>{exceptionError}</Text> : null}
        <LabButton disabled={!parentingSchedulePlan || exceptionBusy} label={exceptionBusy ? calendarText(locale, "sendingProposal") : calendarText(locale, "proposeChange")} onPress={() => {
          setExceptionBusy(true);
          setExceptionError(undefined);
          void createParentingScheduleException({ assignedParent: exceptionAssignedParent, kind: exceptionKind, startDate: exceptionStartDate, endDate: exceptionEndDate, note: exceptionNote.trim() || null })
            .then(() => setExceptionNote(""))
            .catch((error) => setExceptionError(error instanceof Error ? error.message : "PeacePad could not save that change."))
            .finally(() => setExceptionBusy(false));
        }} />
        {parentingScheduleExceptions.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <View style={styles.flexOne}>
              <Text style={styles.actionTitle}>{item.startDate} - {item.endDate}</Text>
              <Text style={styles.caption}>{item.note || calendarText(locale, "parentingChange")} · {item.status}</Text>
            </View>
            {item.status === "proposed" ? <View style={styles.rowWrap}>
              <LabButton label={calendarText(locale, "accept")} onPress={() => void resolveParentingScheduleException(item.id, "accepted")} variant="secondary" />
              <LabButton label={calendarText(locale, "decline")} onPress={() => void resolveParentingScheduleException(item.id, "declined")} variant="secondary" />
            </View> : null}
          </View>
        ))}
      </View>
      </> : null}

      <View style={styles.card}>
        <View style={styles.cardHeadingRow}>
          <Text style={styles.heading}>{calendarText(locale, "calendars")}</Text>
          <Pressable accessibilityLabel={calendarText(locale, "manageCalendars")} accessibilityRole="button" onPress={() => setShowCalendarManager(true)} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>{calendarText(locale, "manageCalendars")}</Text>
          </Pressable>
        </View>
        <View style={styles.calendarSummaryRow}>
          <View style={styles.calendarDots}>{layers.filter((layer) => visibleLayerIds.includes(layer.id)).map((layer) => <View key={layer.id} style={[styles.layerDot, { backgroundColor: layerColors[layer.colorToken] }]} />)}</View>
          <Text style={styles.caption}>{visibleLayerIds.length} {calendarText(locale, "visibleCalendars")}</Text>
        </View>
      </View>

      {pendingShareLayerId ? (
        <View accessibilityRole="alert" style={styles.confirmCard}>
          <Text style={styles.heading}>{w("shareCalendar")}</Text>
          <Text style={styles.body}>{w("shareBody")}</Text>
          <LabButton label={w("confirmShare")} onPress={() => {
            void setLayerShared(pendingShareLayerId, true);
            setPendingShareLayerId(undefined);
          }} />
          <LabButton label={w("keepPrivate")} onPress={() => setPendingShareLayerId(undefined)} variant="secondary" />
        </View>
      ) : null}

      <Pressable accessibilityLabel={w("addEvent")} accessibilityRole="button" onPress={() => setShowEventSheet(true)} style={({ pressed }) => [styles.addEventCta, pressed ? styles.pressed : null]}>
        <View style={styles.addEventCtaCopy}><Text style={styles.actionTitle}>{w("addEvent")}</Text><Text style={styles.caption}>{w("eventTitle")}</Text></View>
        <PeacePadIcon name="add-circle-outline" size={28} color={colors.brand} />
      </Pressable>

      <Modal animationType="slide" onRequestClose={() => setShowEventSheet(false)} transparent visible={showEventSheet}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.messageCheckBackdrop}>
        <View accessibilityViewIsModal accessibilityLabel={w("addEvent")} style={styles.eventSheet}>
        <View style={styles.coachModalHeader}><Text accessibilityRole="header" style={styles.coachModalTitle}>{w("addEvent")}</Text><Pressable accessibilityLabel={w("cancel")} accessibilityRole="button" onPress={() => setShowEventSheet(false)} style={styles.iconButton}><PeacePadIcon name="close" size={23} color={colors.muted} /></Pressable></View>
        <Text style={styles.heading}>{w("addEvent")}</Text>
        <TextInput accessibilityLabel={w("eventTitle")} onChangeText={setEventTitle} placeholder={w("eventTitle")} style={styles.input} value={eventTitle} />
        <Text style={styles.fieldLabel}>{calendarNavigationText(locale, "startsAt")}</Text>
        <TextInput accessibilityLabel={calendarNavigationText(locale, "startsAt")} autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={setEventStartsAt} placeholder="YYYY-MM-DD HH:MM" style={styles.input} value={eventStartsAt} />
        <Text style={styles.fieldLabel}>{calendarNavigationText(locale, "endsAt")}</Text>
        <TextInput accessibilityLabel={calendarNavigationText(locale, "endsAt")} autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={setEventEndsAt} placeholder="YYYY-MM-DD HH:MM" style={styles.input} value={eventEndsAt} />
        {eventTimeError ? <Text accessibilityRole="alert" style={styles.errorText}>{calendarNavigationText(locale, "invalidTime")}</Text> : null}
        <Text style={styles.fieldLabel}>{w("calendar")}</Text>
        <View style={styles.wrap}>
          {layers.map((layer) => (
            <Pressable
              accessibilityLabel={w("useCalendar", { name: layer.name })}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedLayerId === layer.id }}
              key={layer.id}
              onPress={() => setSelectedLayerId(layer.id)}
              style={[styles.chip, selectedLayerId === layer.id ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, selectedLayerId === layer.id ? styles.chipTextActive : null]}>{layer.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>{w("eventMode")}</Text>
        <View accessibilityRole="tablist" style={styles.wrap}>
          <Pressable
            accessibilityLabel={w("planTime")}
            accessibilityRole="tab"
            accessibilityState={{ selected: eventType === "parenting-time" }}
            onPress={() => setEventType("parenting-time")}
            style={[styles.chip, eventType === "parenting-time" ? styles.chipActive : null]}
          >
            <Text style={[styles.chipText, eventType === "parenting-time" ? styles.chipTextActive : null]}>{w("planTime")}</Text>
          </Pressable>
          {connected ? (
            <Pressable
              accessibilityLabel={w("requestChange")}
              accessibilityRole="tab"
              accessibilityState={{ selected: eventType === "change-request" }}
              onPress={() => setEventType("change-request")}
              style={[styles.chip, eventType === "change-request" ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, eventType === "change-request" ? styles.chipTextActive : null]}>{w("requestChange")}</Text>
            </Pressable>
          ) : null}
        </View>
        {eventSaveError ? <Text accessibilityRole="alert" style={styles.errorText}>{eventSaveError}</Text> : null}
        <LabButton label={eventSaveBusy ? calendarText(locale, "savingEvent") : w("saveEvent")} disabled={!eventTitle.trim() || !selectedLayerId || eventSaveBusy} onPress={() => {
          const startsAt = parseCalendarDateTime(eventStartsAt);
          const endsAt = parseCalendarDateTime(eventEndsAt);
          if (!startsAt || !endsAt || new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
            setEventTimeError(true);
            return;
          }
          setEventTimeError(false);
          setEventSaveError(undefined);
          setEventSaveBusy(true);
          void addEvent({
            layerId: selectedLayerId,
            title: eventTitle,
            startsAt,
            endsAt,
            eventType
          })
            .then(() => { setEventTitle(""); setShowEventSheet(false); })
            .catch((error) => setEventSaveError(error instanceof Error ? error.message : "PeacePad could not save that event."))
            .finally(() => setEventSaveBusy(false));
        }} />
        <LabButton disabled={eventSaveBusy} label={w("cancel")} onPress={() => setShowEventSheet(false)} variant="secondary" />
      </View>
      </KeyboardAvoidingView>
      </Modal>

      {visibleEvents.map((event) => (
        <View key={event.id} style={styles.card}>
          <Text style={styles.actionTitle}>{event.title}</Text>
          <Text style={styles.caption}>{layers.find((layer) => layer.id === event.calendarLayerId)?.name} - {calendarStatusText(locale, event.status)}</Text>
          {pendingDeleteEventId === event.id ? (
            <View style={styles.stackTight}>
              <Text style={styles.body}>{w("deleteWarning")}</Text>
              <LabButton label={w("confirmDelete")} onPress={() => { void deleteEvent(event.id); setPendingDeleteEventId(undefined); }} />
              <LabButton label={w("cancel")} onPress={() => setPendingDeleteEventId(undefined)} variant="secondary" />
            </View>
          ) : (
            <LabButton label={w("deleteEvent")} onPress={() => setPendingDeleteEventId(event.id)} variant="secondary" />
          )}
        </View>
      ))}

      <Modal animationType="slide" onRequestClose={() => setShowCalendarManager(false)} transparent visible={showCalendarManager}>
        <View style={styles.messageCheckBackdrop}>
          <View accessibilityViewIsModal accessibilityLabel={calendarText(locale, "manageCalendars")} style={styles.calendarManagerSheet}>
            <View style={styles.coachModalHeader}>
              <Text accessibilityRole="header" style={styles.coachModalTitle}>{calendarText(locale, "manageCalendars")}</Text>
              <Pressable accessibilityLabel={calendarText(locale, "closeCalendarManager")} accessibilityRole="button" onPress={() => setShowCalendarManager(false)} style={styles.iconButton}>
                <PeacePadIcon name="close" size={23} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.body}>{calendarText(locale, "calendarManagerBody")}</Text>
            {layers.map((layer) => {
              const visible = visibleLayerIds.includes(layer.id);
              const shared = layer.visibility.scope !== "private";
              return (
                <View key={layer.id} style={styles.layerRow}>
                  <Pressable accessibilityLabel={`${w(visible ? "hide" : "show")} ${layer.name}`} accessibilityRole="checkbox" accessibilityState={{ checked: visible }} onPress={() => toggleLayerFilter(layer.id)} style={styles.layerIdentity}>
                    <View style={[styles.layerDot, { backgroundColor: layerColors[layer.colorToken] }]} />
                    <View style={styles.layerCopy}><Text style={styles.actionTitle}>{layer.name}</Text><Text style={styles.caption}>{w(shared ? "shared" : "private")}</Text></View>
                  </Pressable>
                  <Pressable accessibilityLabel={`${w(shared ? "makePrivate" : "share")} ${layer.name}`} accessibilityRole="button" onPress={() => { setShowCalendarManager(false); shared ? void setLayerShared(layer.id, false) : setPendingShareLayerId(layer.id); }} style={styles.smallButton}>
                    <Text style={styles.smallButtonText}>{w(shared ? "private" : "share")}</Text>
                  </Pressable>
                </View>
              );
            })}
            <LabButton label={calendarText(locale, "doneManagingCalendars")} onPress={() => setShowCalendarManager(false)} variant="secondary" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * The chat surface deliberately keeps the conversation, not the tools, at the
 * centre of Messages. Secondary tools stay behind the conversation-options
 * button so the first thing a parent sees is the conversation itself.
 */
export function MessagesScreen({ onOpenCalls }: { onOpenCalls?: (mediaType: "audio" | "video") => void } = {}) {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);
  const { locale } = useOptionalLocalization();
  const m = (key: Parameters<typeof messageText>[1]) => messageText(locale, key);
  const {
    cancelCorrection, checkMessage, correctingMessageId, correctionBusy, correctionDraft, correctionError,
    messageCheckBusy, messageCheckEnabled, messageCheckHydrated, messageDraft, messageError,
    messageAttachments, attachmentBusy, attachmentError, messagePreview, messageSearchBusy,
    messageSearchError, messageSearchQuery, messageSearchResults, queuedActionBusyIds, queuedActionError,
    removeQueuedMessage, retryQueuedMessage, searchMessages, saveCorrection, sendMessage, sentMessages,
    setCorrectionDraft, setMessageDraft, setMessageCheckEnabled, setMessageSearchQuery, startCorrection,
    transcribeCoachAudio, coachConversationTurn, uploadMessageAttachment, openMessageAttachment
  } = useCoordinationState();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [removeQueuedMessageId, setRemoveQueuedMessageId] = useState<string>();
  const [showSearch, setShowSearch] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);
  const [showVoiceNote, setShowVoiceNote] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [showMessageCheckSheet, setShowMessageCheckSheet] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const timelineRef = useRef<FlatList<SentMessage>>(null);
  const keepAtLatest = useRef(true);

  const messageClock = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  const statusText = (status: SentMessage["status"]) => status === "waiting" ? m("waiting") : status === "needs-action" ? m("attention") : status === "sent" ? m("statusSent") : status === "delivered" ? m("statusDelivered") : m("statusViewed");
  const messageDay = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return m("today");
    return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
  };
  const scrollToLatest = () => requestAnimationFrame(() => timelineRef.current?.scrollToEnd({ animated: true }));
  const openAttachmentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ["image/jpeg", "image/png", "application/pdf", "text/plain", "audio/mp4", "audio/m4a", "audio/webm"] });
      if (result.canceled) return;
      const selected = result.assets[0];
      const allowed = ["image/jpeg", "image/png", "application/pdf", "text/plain", "audio/mp4", "audio/m4a", "audio/webm"] as const;
      const mediaType = allowed.find((type) => type === selected.mimeType);
      if (!mediaType) throw new Error("Choose a JPEG, PNG, PDF, text file, or voice note.");
      await uploadMessageAttachment({ originalFileName: selected.name, mediaType, bytes: await new File(selected.uri).arrayBuffer() });
      setShowAttachments(true);
    } catch {
      // The state layer exposes a privacy-safe attachment error.
    }
  };
  const sendFromComposer = async () => {
    if (!messageDraft.trim()) return;
    if (messageCheckEnabled) {
      await checkMessage();
      return;
    }
    await sendMessage(false);
  };

  const messageListHeader = <View>
    <View style={styles.privacyNotice}><PeacePadIcon name="lock-closed-outline" size={15} color={colors.accent} /><Text style={styles.privacyNoticeText}>{m("privacyNotice")}</Text></View>
    {showUtilities ? <>
      <View style={styles.utilityTray}><Pressable accessibilityLabel={showSearch ? m("hideMessageSearch") : m("searchMessages")} accessibilityRole="button" onPress={() => setShowSearch((current) => !current)} style={styles.utilityAction}><PeacePadIcon name="search-outline" size={17} color={colors.brand} /><Text style={styles.utilityActionText}>{showSearch ? m("hideSearch") : m("find")}</Text></Pressable><Text style={styles.utilityHint}>{m("utilityHint")}</Text></View>
      {showSearch ? <View style={styles.searchBar}><PeacePadIcon name="search-outline" size={18} color={colors.muted} /><TextInput accessibilityLabel={m("searchLabel")} autoCapitalize="none" onChangeText={setMessageSearchQuery} onSubmitEditing={() => void searchMessages()} placeholder={m("searchPlaceholder")} placeholderTextColor={colors.muted} returnKeyType="search" style={styles.searchInput} value={messageSearchQuery} /><Pressable accessibilityLabel={m("search")} accessibilityRole="button" accessibilityState={{ disabled: messageSearchQuery.trim().length < 2 || messageSearchBusy }} disabled={messageSearchQuery.trim().length < 2 || messageSearchBusy} onPress={() => void searchMessages()} style={styles.searchButton}><Text style={styles.searchButtonText}>{messageSearchBusy ? m("searching") : m("search")}</Text></Pressable></View> : null}
      {messageSearchError ? <Text accessibilityRole="alert" style={styles.error}>{messageSearchError}</Text> : null}
      {messageSearchResults.map((result) => <View accessibilityLabel={m("searchResult")} key={result.originalMessageEventId} style={styles.searchResult}><Text style={styles.body}>{result.body}</Text>{result.corrected ? <Text style={styles.caption}>{m("corrected")}</Text> : null}</View>)}
      {!messageCheckEnabled ? <View style={styles.messageCheckRow}><View style={styles.messageCheckCopy}><Text style={styles.messageCheckTitle}>{m("check")}</Text><Text style={styles.messageCheckBody}>{m("checkBody")}</Text></View><LabButton disabled={!messageCheckHydrated || messageCheckBusy} label={!messageCheckHydrated ? m("unavailable") : messageCheckBusy ? m("updating") : m("turnOn")} onPress={() => setShowMessageCheckSheet(true)} /><Pressable accessibilityLabel={m("howLabel")} accessibilityRole="button" accessibilityState={{ expanded: showHowItWorks }} onPress={() => setShowHowItWorks((current) => !current)} style={styles.linkButton}><Text style={styles.link}>{m("how")}</Text></Pressable>{showHowItWorks ? <Text style={styles.caption}>{m("howBody")}</Text> : null}</View> : <View style={styles.messageCheckEnabled}><View style={styles.messageCheckCopy}><Text style={styles.successText}>{m("checkOn")}</Text><Text style={styles.caption}>{m("checkOnBody")}</Text></View><Pressable accessibilityLabel={m("turnOffLabel")} accessibilityRole="button" accessibilityState={{ disabled: !messageCheckHydrated || messageCheckBusy }} disabled={!messageCheckHydrated || messageCheckBusy} onPress={() => void setMessageCheckEnabled(false)} style={styles.linkButton}><Text style={styles.link}>{m("turnOff")}</Text></Pressable></View>}
    </> : null}
  </View>;

  const renderMessage = ({ item: message, index }: { item: SentMessage; index: number }) => {
    const mine = (message.isMine ?? message.canCorrect) || message.queued;
    const previous = sentMessages[index - 1];
    const showDay = !previous || messageDay(previous.sentAt) !== messageDay(message.sentAt);
    return <React.Fragment key={message.id}>
      {showDay ? <View accessibilityRole="header" style={styles.dateSeparator}><Text style={styles.dateSeparatorText}>{messageDay(message.sentAt)}</Text></View> : null}
      <View accessibilityLabel={m("sent")} style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}><View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleOther]}><Text style={styles.messageBubbleText}>{message.sentBody}</Text><View style={styles.messageMeta}><Text style={styles.messageTime}>{messageClock(message.sentAt)}</Text>{mine ? <><PeacePadIcon name={message.status === "waiting" ? "time-outline" : message.status === "needs-action" ? "alert-circle-outline" : message.status === "sent" ? "checkmark-outline" : "checkmark-done-outline"} size={14} color={message.status === "needs-action" ? colors.warning : colors.brand} /><Text style={styles.messageStatus}>{message.corrected ? `${m("corrected")} · ` : ""}{statusText(message.status)}</Text></> : null}</View>{message.canCorrect && message.status !== "waiting" && correctingMessageId !== message.id ? <LabButton label={m("correct")} onPress={() => startCorrection(message.id)} variant="secondary" /> : null}{correctingMessageId === message.id ? <View accessibilityLabel={m("correctionEditor")} style={styles.correctionEditor}><Text style={styles.caption}>{m("originalRemains")}</Text><TextInput accessibilityLabel={m("correctionWording")} multiline onChangeText={setCorrectionDraft} style={[styles.input, styles.correctionInput]} value={correctionDraft} />{correctionError ? <Text accessibilityRole="alert" style={styles.error}>{correctionError}</Text> : null}<LabButton disabled={correctionBusy} label={correctionBusy ? m("saving") : m("saveCorrection")} onPress={() => void saveCorrection()} /><LabButton disabled={correctionBusy} label={m("cancelCorrection")} onPress={cancelCorrection} variant="secondary" /></View> : null}{message.queued && message.status === "needs-action" ? <View accessibilityLabel={m("recovery")} style={styles.recoveryBlock}><Text style={styles.caption}>{m("recoveryBody")}</Text><LabButton disabled={queuedActionBusyIds.includes(message.id)} label={queuedActionBusyIds.includes(message.id) ? m("trying") : m("tryAgain")} onPress={() => void retryQueuedMessage(message.id)} />{removeQueuedMessageId === message.id ? <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.confirmCard}><Text style={styles.body}>{m("removeWarning")}</Text><LabButton disabled={queuedActionBusyIds.includes(message.id)} label={m("remove")} onPress={() => { setRemoveQueuedMessageId(undefined); void removeQueuedMessage(message.id); }} /><LabButton label={m("keep")} onPress={() => setRemoveQueuedMessageId(undefined)} variant="secondary" /></View> : <LabButton disabled={queuedActionBusyIds.includes(message.id)} label={m("remove")} onPress={() => setRemoveQueuedMessageId(message.id)} variant="secondary" />}</View> : null}</View></View>
    </React.Fragment>;
  };

  const messageListFooter = <View>
    {queuedActionError ? <Text accessibilityRole="alert" style={styles.error}>{queuedActionError}</Text> : null}
    {messagePreview ? <View accessibilityLabel={m("result")} style={styles.previewCard}><Text style={styles.heading}>{messagePreview.tone}</Text><Text style={styles.body}>{messagePreview.summary}</Text>{messagePreview.rewordingSuggestion ? <><Text style={styles.fieldLabel}>{m("suggested")}</Text><Text style={styles.body}>{messagePreview.rewordingSuggestion}</Text><LabButton label={m("sendSuggested")} onPress={() => void sendMessage(true)} /></> : null}<LabButton label={m("sendOriginal")} onPress={() => void sendMessage(false)} variant="secondary" /></View> : null}
     {messageError && !showMessageCheckSheet ? <View accessibilityRole="alert" style={styles.confirmCard}><Text style={styles.error}>{messageError}</Text>{messageCheckEnabled && messageDraft.trim() ? <LabButton label={m("checkAgain")} onPress={() => void checkMessage()} /> : null}{messageDraft.trim() ? <LabButton label={m("sendOriginal")} onPress={() => void sendMessage(false)} variant="secondary" /> : null}</View> : null}
  </View>;

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.chatScreen}>
    <View style={styles.chatHeader}>
         <View style={styles.chatIdentity}>
         <View style={styles.coParentAvatar}><PeacePadIcon name="person-outline" size={22} color={colors.brand} /></View>
         <View style={styles.chatIdentityCopy}><Text accessibilityRole="header" style={styles.chatTitle}>{m("conversationTitle")}</Text><Text style={styles.chatSubtitle}>{m("connectedStatus")}</Text></View>
      </View>
      <View style={styles.chatHeaderActions}>
         <Pressable accessibilityLabel={m("startAudioCall")} accessibilityRole="button" disabled={!onOpenCalls} onPress={() => onOpenCalls?.("audio")} style={styles.iconButton}><PeacePadIcon name="call-outline" size={21} color={colors.brand} /></Pressable>
         <Pressable accessibilityLabel={m("startVideoCall")} accessibilityRole="button" disabled={!onOpenCalls} onPress={() => onOpenCalls?.("video")} style={styles.iconButton}><PeacePadIcon name="videocam-outline" size={23} color={colors.brand} /></Pressable>
         <Pressable accessibilityLabel={m("conversationOptions")} accessibilityRole="button" accessibilityState={{ expanded: showUtilities }} onPress={() => setShowUtilities((current) => !current)} style={styles.iconButton}><PeacePadIcon name="ellipsis-vertical" size={22} color={colors.muted} /></Pressable>
      </View>
    </View>

    <View style={styles.timelineShell}>
    <FlatList
      ref={timelineRef}
      data={sentMessages}
      keyExtractor={(message) => message.id}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={20}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews={Platform.OS === "android"}
      ListHeaderComponent={messageListHeader}
      ListEmptyComponent={<View style={styles.emptyConversation}><PeacePadIcon name="chatbubble-ellipses-outline" size={30} color={colors.brand} /><Text style={styles.emptyConversationTitle}>{m("emptyTitle")}</Text><Text style={styles.emptyConversationBody}>{m("emptyBody")}</Text></View>}
      ListFooterComponent={messageListFooter}
      onContentSizeChange={() => { if (keepAtLatest.current) scrollToLatest(); }}
      onScroll={(event) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const distanceFromLatest = contentSize.height - (contentOffset.y + layoutMeasurement.height);
        keepAtLatest.current = distanceFromLatest < 80;
        setShowJumpToLatest(distanceFromLatest > 160);
      }}
      renderItem={renderMessage}
      scrollEventThrottle={16}
      style={styles.messageTimelineScroll}
      contentContainerStyle={[styles.messageTimeline, largeText ? styles.messageTimelineLargeText : null]}
    />
    {showJumpToLatest ? <Pressable accessibilityLabel={m("jumpToLatest")} accessibilityRole="button" onPress={() => { keepAtLatest.current = true; setShowJumpToLatest(false); scrollToLatest(); }} style={styles.jumpToLatest}><PeacePadIcon name="arrow-down" size={17} color={colors.onBrand} /><Text style={styles.jumpToLatestText}>{m("jumpToLatest")}</Text></Pressable> : null}
    </View>

    <View style={styles.composerDock}>
       <View style={styles.composerTools}><Pressable accessibilityLabel={m("openCoach")} accessibilityRole="button" onPress={() => setCoachOpen(true)} style={styles.toolChip}><PeacePadIcon name="sparkles-outline" size={16} color={colors.brand} /><Text style={styles.toolChipText}>{m("coachLabel")}</Text></Pressable><Pressable accessibilityLabel={m("attachFile")} accessibilityRole="button" disabled={attachmentBusy || !messageCheckHydrated} onPress={() => void openAttachmentPicker()} style={styles.toolIcon}><PeacePadIcon name="attach-outline" size={19} color={colors.brand} /></Pressable><Pressable accessibilityLabel={showVoiceNote ? m("hideVoiceNote") : m("recordVoiceNote")} accessibilityRole="button" onPress={() => setShowVoiceNote((current) => !current)} style={styles.toolIcon}><PeacePadIcon name="mic-outline" size={19} color={colors.brand} /></Pressable><Pressable accessibilityLabel={showAttachments ? m("hideSharedFiles") : m("showSharedFiles")} accessibilityRole="button" onPress={() => setShowAttachments((current) => !current)} style={styles.toolIcon}><PeacePadIcon name="folder-open-outline" size={18} color={colors.brand} /></Pressable></View>
      <View style={styles.composerRow}><TextInput accessibilityLabel={m("draft")} multiline onChangeText={setMessageDraft} placeholder={m("draftPlaceholder")} placeholderTextColor={colors.muted} style={[styles.composerInput, largeText ? styles.composerInputLargeText : null]} value={messageDraft} />{messageCheckEnabled && messageDraft.trim() ? <Pressable accessibilityLabel={m("checkMessage")} accessibilityRole="button" disabled={messageCheckBusy} onPress={() => void checkMessage()} style={styles.composerSend}><PeacePadIcon name="shield-checkmark-outline" size={20} color={colors.onBrand} /></Pressable> : <Pressable accessibilityLabel={m("send")} accessibilityRole="button" accessibilityState={{ disabled: !messageDraft.trim() || messageCheckBusy }} disabled={!messageDraft.trim() || messageCheckBusy} onPress={() => void sendFromComposer()} style={[styles.composerSend, !messageDraft.trim() ? styles.composerSendDisabled : null]}><PeacePadIcon name="send" size={20} color={colors.onBrand} /></Pressable>}</View>
       {messageCheckEnabled && messageDraft.trim() ? <Text style={styles.composerHint}>{messageCheckBusy ? m("checking") : m("messageCheckHint")}</Text> : null}
      {showVoiceNote ? <ConversationVoiceNote busy={attachmentBusy} onUpload={uploadMessageAttachment} /> : null}
       {showAttachments ? <View style={styles.attachmentsTray}><Text style={styles.attachmentsTitle}>{m("attachmentsTitle")}</Text><Text style={styles.attachmentsBody}>{m("attachmentsBody")}</Text>{attachmentError ? <Text accessibilityRole="alert" style={styles.error}>{attachmentError}</Text> : null}{messageAttachments.length === 0 ? <Text style={styles.caption}>{m("nothingShared")}</Text> : messageAttachments.map((attachment) => <View key={attachment.id} style={styles.attachmentItem}><View style={styles.attachmentCopy}><Text style={styles.actionTitle}>{attachment.originalFileName}</Text><Text style={styles.caption}>{attachment.mediaType} · {attachment.byteLength} bytes</Text></View><LabButton label={m("openAttachment")} onPress={() => void openMessageAttachment(attachment.id).then((url) => Linking.openURL(url)).catch(() => undefined)} variant="secondary" /></View>)}</View> : null}
    </View>

    <Modal animationType="slide" onRequestClose={() => setCoachOpen(false)} visible={coachOpen}><View accessibilityViewIsModal style={styles.coachModal}><View style={styles.coachModalHeader}><Text accessibilityRole="header" style={styles.coachModalTitle}>{m("coachLabel")}</Text><Pressable accessibilityLabel={m("closeCoach")} accessibilityRole="button" onPress={() => setCoachOpen(false)} style={styles.iconButton}><PeacePadIcon name="close" size={23} color={colors.muted} /></Pressable></View><CoachConversation initiallyOpen onTranscribe={transcribeCoachAudio} onConversationTurn={coachConversationTurn} onUseDraft={(draft) => { setMessageDraft(draft); setCoachOpen(false); }} /></View></Modal>
    <Modal animationType="slide" onRequestClose={() => setShowMessageCheckSheet(false)} visible={showMessageCheckSheet} transparent>
      <View style={styles.messageCheckBackdrop}>
        <View accessibilityViewIsModal accessibilityLabel={m("check")} style={styles.messageCheckSheet}>
          <View style={styles.sheetHandle} />
           <Text accessibilityRole="header" style={styles.sheetTitle}>{m("checkSheetTitle")}</Text>
           <Text style={styles.body}>{m("checkSheetBody")}</Text>
           <Text style={styles.caption}>{m("checkSheetClarification")}</Text>
           {messageError ? <Text accessibilityRole="alert" style={styles.error}>{messageError}</Text> : null}
           <LabButton disabled={!messageCheckHydrated || messageCheckBusy} label={messageCheckBusy ? m("updating") : m("checkSheetTurnOn")} onPress={() => void setMessageCheckEnabled(true).then((enabled) => { if (enabled) setShowMessageCheckSheet(false); })} />
          <LabButton disabled={messageCheckBusy} label={m("checkSheetNotNow")} onPress={() => setShowMessageCheckSheet(false)} variant="secondary" />
        </View>
      </View>
    </Modal>
  </KeyboardAvoidingView>;
}

export function RecordsHomeScreen({ setScreen }: { setScreen: Navigate }) {
  const { locale } = useLocalization();
  const w = (key: Parameters<typeof workflowText>[1], values?: Readonly<Record<string, string>>) => workflowText(locale, key, values);
  const { events, sentMessages } = useCoordinationState();
  const { archiveBinder, attachments, binder, binders, attachmentIntent, busy, createBinder, error: recordsError, getAttachmentDownload, linkTimelineSource, loading, reload, selectBinder, timelineEntries, uploadAttachment } = useRecordsState();
  const [binderName, setBinderName] = useState("");
  const [childLabel, setChildLabel] = useState("");
  const [error, setError] = useState<string>();

  const saveBinder = async () => {
    if (binderName.trim().length < 3) { setError(w("binderNameError")); return; }
    if (childLabel.trim().length < 2) { setError(w("childLabelError")); return; }
    setError(undefined);
    try { await createBinder(binderName, childLabel); }
    catch (caught) { setError(caught instanceof Error ? caught.message : w("binderDetailsError")); }
  };
  const chooseAndUpload = async () => {
    setError(undefined);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "application/pdf", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false
      });
      if (result.canceled) return;
      const selected = result.assets[0];
      const mediaType = selected.mimeType as AttachmentMediaType | undefined;
      if (!selected.name || !mediaType || !["image/jpeg", "image/png", "application/pdf", "text/plain"].includes(mediaType)) {
        throw new Error(w("attachmentTypeError"));
      }
      const file = new File(selected.uri);
      const bytes = await file.arrayBuffer();
      await uploadAttachment({ originalFileName: selected.name, mediaType, byteLength: bytes.byteLength, bytes });
    } catch (caught) { setError(caught instanceof Error ? caught.message : w("attachmentDetailsError")); }
  };
  const openAttachment = async (attachmentId: string) => {
    setError(undefined);
    try {
      const download = await getAttachmentDownload(attachmentId);
      await Linking.openURL(download.downloadUrl);
    } catch (caught) { setError(caught instanceof Error ? caught.message : w("attachmentOpenError")); }
  };
  const linkSource = async (kind: "message-event" | "schedule-event", sourceId: string) => {
    setError(undefined);
    try { await linkTimelineSource(kind, sourceId); }
    catch (caught) { setError(caught instanceof Error ? caught.message : w("linkError")); }
  };
  const linkedSourceIds = new Set(timelineEntries.map((entry) => entry.source.sourceId));
  const messageCandidate = sentMessages.find((message) => !message.queued && !linkedSourceIds.has(message.id));
  const eventCandidate = events.find((event) => !linkedSourceIds.has(event.id));
  return (
    <View style={styles.stack}>
      <ScreenHeader
        accent={colors.accent}
        icon="document-text-outline"
        kicker="Private by default"
        softBackground={colors.successSurface}
        subtitle={w("binderBody")}
        title={w("records")}
      />
      {loading ? <View style={styles.card}><Text style={styles.heading}>{w("opening")}</Text><Text style={styles.body}>{w("loading")}</Text></View> : null}
      {!loading && binders.length > 1 ? <View style={styles.card}>
        <Text style={styles.heading}>{w("binders")}</Text>
        {binders.filter((candidate) => candidate.status === "active").map((candidate) => (
          <Pressable accessibilityHint={w("private")} accessibilityLabel={`${candidate.name}, ${candidate.childLabel}`} accessibilityRole="button" key={candidate.id} onPress={() => selectBinder(candidate.id)} style={styles.actionCard}>
            <Text style={styles.actionTitle}>{candidate.name}</Text>
            <Text style={styles.caption}>{candidate.childLabel} · {w("private")}</Text>
          </Pressable>
        ))}
      </View> : null}
      {!loading && !binder ? <View style={styles.card}>
        <Text style={styles.heading}>{w("createBinder")}</Text>
        <Text style={styles.body}>{w("binderBody")}</Text>
        <Text style={styles.fieldLabel}>{w("binderName")}</Text>
        <TextInput accessibilityLabel={w("binderName")} onChangeText={setBinderName} placeholder={w("binderName")} style={styles.input} value={binderName} />
        <Text style={styles.fieldLabel}>{w("childLabel")}</Text>
        <TextInput accessibilityLabel={w("childLabel")} onChangeText={setChildLabel} placeholder={w("childLabel")} style={styles.input} value={childLabel} />
        <LabButton disabled={busy} label={busy ? w("creating") : w("create")} onPress={() => void saveBinder()} />
      </View> : !loading && binder ? <View style={styles.card}>
        <Text style={styles.heading}>{binder.name}</Text>
        <Text style={styles.caption}>{binder.childLabel} - {w("private")}</Text>
        <Text style={styles.fieldLabel}>{w("timeline")}</Text>
        {timelineEntries.length === 0 ? <Text style={styles.caption}>{w("noSources")}</Text> : timelineEntries.map((entry) => {
          const kind = w(entry.source.kind === "message-event" ? "message" : "calendarEvent");
          return <View accessibilityLabel={w("timelineEntry", { kind })} key={entry.id} style={styles.successCard}>
            <Text style={styles.heading}>{kind}</Text>
            <Text style={styles.caption}>{formatLocalizedDate(locale, entry.occurredAt, { dateStyle: "medium", timeStyle: "short" })}</Text>
          </View>;
        })}
        {messageCandidate ? <LabButton disabled={busy} label={w("linkMessage")} onPress={() => void linkSource("message-event", messageCandidate.id)} variant="secondary" /> : null}
        {eventCandidate ? <LabButton disabled={busy} label={w("linkEvent")} onPress={() => void linkSource("schedule-event", eventCandidate.id)} variant="secondary" /> : null}
        <Text style={styles.fieldLabel}>{w("attachment")}</Text>
        <Text style={styles.caption}>{w("attachmentPrivacy")}</Text>
        <LabButton disabled={busy} label={busy ? w("uploading") : w("chooseAttachment")} onPress={() => void chooseAndUpload()} />
        {attachmentIntent ? <View accessibilityLabel={w("prepared")} style={styles.successCard}>
          <Text style={styles.heading}>{w("uploadComplete")}</Text>
          <Text style={styles.body}>{attachmentIntent.originalFileName}</Text>
        </View> : null}
        {attachments.map((attachment) => <View key={attachment.id} style={styles.successCard}>
          <Text style={styles.heading}>{attachment.originalFileName}</Text>
          <Text style={styles.caption}>{w("attachmentSize", { size: String(attachment.byteLength) })}</Text>
          <LabButton disabled={busy} label={w("openAttachment")} onPress={() => void openAttachment(attachment.id)} variant="secondary" />
        </View>)}
        <LabButton disabled={busy} label={w("archive")} onPress={() => void archiveBinder().catch(() => undefined)} variant="secondary" />
      </View> : null}
      {error || recordsError ? <Text accessibilityRole="alert" style={styles.error}>{error ?? recordsError}</Text> : null}
      {recordsError && !loading ? <LabButton label={w("tryAgain")} onPress={() => void reload()} variant="secondary" /> : null}
      <Pressable accessibilityHint={w("anotherTask")} accessibilityLabel={w("returnHome")} accessibilityRole="button" onPress={() => setScreen("home")} style={styles.actionCard}>
        <Text style={styles.actionTitle}>{w("returnHome")}</Text>
        <Text style={styles.caption}>{w("anotherTask")}</Text>
      </Pressable>
    </View>
  );
}

export function MoreScreen({ setScreen }: { setScreen: Navigate }) {
  const accountActions = useOptionalStagingAccountActions();
  const { locale, setLocale, t } = useLocalization();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeaveFamily, setConfirmLeaveFamily] = useState(false);
  const [replayIntroduction, setReplayIntroduction] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [profileName, setProfileName] = useState(accountActions?.displayName ?? "");
  const [profileSaved, setProfileSaved] = useState(false);
  const [exportManifest, setExportManifest] = useState<AccountExportManifest>();
  useEffect(() => setProfileName(accountActions?.displayName ?? ""), [accountActions?.displayName]);
  if (replayIntroduction) {
    return <PublicOnboardingSlides compact onComplete={() => setReplayIntroduction(false)} />;
  }
  return (
    <View style={styles.stack}>
      <ScreenHeader
        accent={colors.brand}
        icon="sparkles-outline"
        kicker="Your PeacePad"
        softBackground={colors.brandSoft}
        subtitle={t("more.support.body")}
        title={t("more.title")}
      />
      <Pressable accessibilityHint={t("more.family.body")} accessibilityLabel={t("more.family.title")} accessibilityRole="button" onPress={() => setScreen("invite")} style={[styles.actionCard, styles.moreFamilyCard]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="people-outline" size={23} color={colors.successText} /><Text style={styles.actionTitle}>{t("more.family.title")}</Text></View>
        <Text style={styles.caption}>{t("more.family.body")}</Text>
      </Pressable>
      <Pressable accessibilityHint="Manage child updates, expenses, scheduled calls and Conch." accessibilityLabel="Family tools" accessibilityRole="button" onPress={() => setScreen("family")} style={[styles.actionCard, styles.morePrivacyCard]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="heart-circle-outline" size={23} color={colors.aqua} /><Text style={styles.actionTitle}>Family tools</Text></View>
        <Text style={styles.caption}>Manage child updates, expenses, scheduled calls and Conch.</Text>
      </Pressable>
      <Pressable accessibilityHint="Find counselling, safety, legal and family services near you." accessibilityLabel="Find real-world support" accessibilityRole="button" onPress={() => setScreen("support")} style={[styles.actionCard, styles.moreSupportCard]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="heart-outline" size={23} color={colors.coral} /><Text style={styles.actionTitle}>Find real-world support</Text></View>
        <Text style={styles.caption}>Nearby counselling, abuse support, legal help and someone to talk to.</Text>
      </Pressable>
      <Pressable accessibilityHint="Open a consent-based conversation where each parent gets a calm turn to speak." accessibilityLabel="Open Conch mode" accessibilityRole="button" onPress={() => setScreen("conch")} style={[styles.actionCard, styles.moreSupportCard]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="people-circle-outline" size={23} color={colors.aqua} /><Text style={styles.actionTitle}>Conch mode</Text></View>
        <Text style={styles.caption}>Take turns, listen carefully, and agree on a child-focused next step—without recording the call.</Text>
      </Pressable>
      <View style={[styles.actionCard, styles.morePrivacyCard]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="shield-checkmark-outline" size={23} color={colors.accent} /><Text style={styles.actionTitle}>{t("more.privacy.title")}</Text></View>
        <Text style={styles.caption}>{t("more.privacy.body")}</Text>
      </View>
      <Pressable accessibilityHint={t("more.support.body")} accessibilityLabel={t("more.support.title")} accessibilityRole="button" accessibilityState={{ expanded: showSupport }} onPress={() => setShowSupport((current) => !current)} style={[styles.actionCard, styles.moreSupportCard]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="heart-outline" size={23} color={colors.coral} /><Text style={styles.actionTitle}>{t("more.support.title")}</Text></View>
        <Text style={styles.caption}>{t("more.support.body")}</Text>
      </Pressable>
      {showSupport ? <View style={styles.actionCardLargeText}><SupportPanel /></View> : null}
      <Pressable accessibilityHint={t("more.introduction.body")} accessibilityLabel={t("more.introduction.title")} accessibilityRole="button" onPress={() => setReplayIntroduction(true)} style={[styles.actionCard, styles.moreIntroCard]}>
        <View style={styles.cardHeadingRow}><PeacePadIcon name="sparkles-outline" size={23} color={colors.brand} /><Text style={styles.actionTitle}>{t("more.introduction.title")}</Text></View>
        <Text style={styles.caption}>{t("more.introduction.body")}</Text>
      </Pressable>
      <LinkedSignInMethods />
      <PersonalityProfilePanel />
      {accountActions?.updateProfile ? <View style={styles.actionCardLargeText}>
        <Text accessibilityRole="header" style={styles.actionTitle}>{t("profile.title")}</Text>
        <Text style={styles.caption}>{t("profile.body")}</Text>
        <TextInput
          accessibilityLabel={t("profile.name")}
          autoCapitalize="words"
          maxLength={120}
          onChangeText={(value) => { setProfileName(value); setProfileSaved(false); }}
          placeholder={t("profile.name")}
          style={styles.input}
          value={profileName}
        />
        <LabButton
          disabled={accountActions.updatingProfile || !profileName.trim() || profileName.trim() === accountActions.displayName}
          label={accountActions.updatingProfile ? t("profile.saving") : t("profile.save")}
          onPress={() => void accountActions.updateProfile!(profileName)
            .then(() => setProfileSaved(true))
            .catch(() => setProfileSaved(false))}
        />
        {profileSaved ? <Text accessibilityLiveRegion="polite" style={styles.success}>{t("profile.saved")}</Text> : null}
        {accountActions.profileError ? <Text accessibilityRole="alert" style={styles.error}>{accountActions.profileError}</Text> : null}
      </View> : null}
      {accountActions?.exportAccount ? <View style={styles.actionCardLargeText}>
        <Text accessibilityRole="header" style={styles.actionTitle}>{t("account.exportTitle")}</Text>
        <Text style={styles.caption}>{t("account.exportBody")}</Text>
        <LabButton
          disabled={accountActions.exporting}
          label={accountActions.exporting ? t("account.exporting") : t("account.exportAction")}
          onPress={() => {
            setExportManifest(undefined);
            void accountActions.exportAccount!()
              .then(setExportManifest)
              .catch(() => setExportManifest(undefined));
          }}
        />
        {exportManifest ? <View accessibilityLiveRegion="polite" style={styles.successCard}>
          <Text style={styles.success}>{t("account.exportReady")}</Text>
          <Text style={styles.caption}>{t("account.exportCounts", {
            families: String(exportManifest.counts.families),
            conversations: String(exportManifest.counts.conversations),
            messageEvents: String(exportManifest.counts.messageEvents),
            calendarEvents: String(exportManifest.counts.calendarEvents),
            privateRecords: String(exportManifest.counts.privateRecords),
            privateAttachments: String(exportManifest.counts.privateAttachments)
          })}</Text>
          <Text style={styles.caption}>{t("account.exportMetadataOnly")}</Text>
        </View> : null}
        {accountActions.exportError ? <Text accessibilityRole="alert" style={styles.error}>{accountActions.exportError}</Text> : null}
      </View> : null}
      {accountActions?.enableNotifications ? <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: accountActions.notificationStatus === "busy" }}
        disabled={accountActions.notificationStatus === "busy"}
        onPress={() => void (
          accountActions.notificationStatus === "enabled" && accountActions.disableNotifications
            ? accountActions.disableNotifications()
            : accountActions.enableNotifications!()
        )}
        style={styles.actionCard}
      >
        <Text style={styles.actionTitle}>{t("notifications.title")}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.caption}>{
          accountActions.notificationStatus === "enabled" ? t("notifications.enabled")
            : accountActions.notificationStatus === "denied" ? t("notifications.denied")
            : accountActions.notificationStatus === "unavailable" ? t("notifications.unavailable")
            : accountActions.notificationStatus === "busy" ? t("notifications.updating")
            : t("notifications.enable")
        }</Text>
      </Pressable> : null}
      <View accessibilityLabel={t("language.title")} style={styles.actionCard}>
        <Text accessibilityRole="header" style={styles.actionTitle}>{t("language.title")}</Text>
        <Text style={styles.caption}>{t("language.body")}</Text>
        <View accessibilityRole="radiogroup" style={styles.languageOptions}>
          {supportedLocales.map((candidate) => {
            const selected = candidate === locale;
            return <Pressable
              accessibilityHint={t("language.optionHint")}
              accessibilityLabel={languageNames[candidate]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={candidate}
              onPress={() => void setLocale(candidate)}
              style={({ pressed }) => [styles.languageOption, selected ? styles.languageOptionSelected : null, pressed ? styles.pressed : null]}
            >
              <Text accessible={false} style={styles.actionTitle}>{languageNames[candidate]}</Text>
              {selected ? <Text accessible={false} style={styles.caption}>{t("language.selected")}</Text> : null}
            </Pressable>;
          })}
        </View>
      </View>
      {accountActions ? <Pressable accessibilityRole="button" onPress={() => void accountActions.signOut()} style={styles.actionCard}>
        <Text style={styles.actionTitle}>{t("account.signOut")}</Text>
        <Text style={styles.caption}>{t("account.signOutBody")}</Text>
      </Pressable> : null}
      {accountActions?.leaveFamily ? confirmLeaveFamily ? <View accessibilityLiveRegion="assertive" accessibilityRole="alert" accessibilityViewIsModal style={styles.confirmCard}>
        <AccessibleHeading style={styles.actionTitle}>{t("account.leaveFamilyTitle")}</AccessibleHeading>
        <Text style={styles.caption}>{t("account.leaveFamilyWarning")}</Text>
        <LabButton disabled={accountActions.leavingFamily} label={accountActions.leavingFamily ? t("account.leavingFamily") : t("account.leaveFamilyConfirm")} onPress={() => void accountActions.leaveFamily!().catch(() => undefined)} />
        <LabButton disabled={accountActions.leavingFamily} label={t("account.cancel")} onPress={() => setConfirmLeaveFamily(false)} variant="secondary" />
        {accountActions.leaveFamilyError ? <Text accessibilityRole="alert" style={styles.error}>{accountActions.leaveFamilyError}</Text> : null}
      </View> : <Pressable accessibilityRole="button" onPress={() => { setConfirmDelete(false); setConfirmLeaveFamily(true); }} style={styles.actionCard}>
        <Text style={styles.actionTitle}>{t("account.leaveFamily")}</Text>
        <Text style={styles.caption}>{t("account.leaveFamilyBody")}</Text>
      </Pressable> : null}
      {accountActions ? confirmDelete ? <View accessibilityLiveRegion="assertive" accessibilityRole="alert" accessibilityViewIsModal style={styles.confirmCard}>
        <AccessibleHeading style={styles.actionTitle}>{t("account.deleteTitle")}</AccessibleHeading>
        <Text style={styles.caption}>{t("account.deleteWarning")}</Text>
        <LabButton disabled={accountActions.deleting} label={accountActions.deleting ? t("account.deleting") : t("account.deletePermanently")} onPress={() => void accountActions.deleteAccount().catch(() => undefined)} />
        <LabButton disabled={accountActions.deleting} label={t("account.cancel")} onPress={() => setConfirmDelete(false)} variant="secondary" />
        {accountActions.error ? <Text accessibilityRole="alert" style={styles.error}>{accountActions.error}</Text> : null}
      </View> : <Pressable accessibilityRole="button" onPress={() => { setConfirmLeaveFamily(false); setConfirmDelete(true); }} style={styles.actionCard}>
        <Text style={styles.actionTitle}>{t("account.delete")}</Text>
        <Text style={styles.caption}>{t("account.deleteBody")}</Text>
      </Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  stackTight: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  caption: { ...typography.caption, color: colors.muted },
  fieldLabel: { ...typography.caption, color: colors.text, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  brandHero: { backgroundColor: colors.cream, borderColor: colors.border, borderRadius: 30, borderWidth: 1, minHeight: 230, overflow: "hidden", padding: spacing.lg, position: "relative" },
  brandHeroCopy: { gap: spacing.sm, maxWidth: "88%", zIndex: 2 },
  brandLockup: { alignItems: "center", flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  brandName: { color: colors.text, fontSize: 25, fontWeight: "900", lineHeight: 29 },
  brandVersion: { ...typography.body, color: colors.brand, fontWeight: "800" },
  heroEyebrow: { ...typography.caption, color: colors.coral, fontWeight: "900", letterSpacing: 1.1 },
  heroTitle: { ...typography.title, color: colors.text, maxWidth: 285 },
  heroBody: { ...typography.subheading, color: colors.text, fontWeight: "500", maxWidth: 300 },
  heroDoodle: { alignItems: "center", gap: spacing.xs, position: "absolute", right: spacing.lg, top: spacing.lg },
  heroSun: { backgroundColor: "#F7C948", borderRadius: 999, height: 120, opacity: 0.26, position: "absolute", right: -35, top: -35, width: 120 },
  heroBubble: { backgroundColor: "#72D7C9", borderRadius: 999, bottom: -48, height: 132, opacity: 0.22, position: "absolute", right: -18, width: 132 },
  logo: { borderRadius: 18, height: 56, width: 56, zIndex: 2 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionCard: { backgroundColor: "#FFF1DF", borderColor: "#F2C8B5", borderRadius: 22, borderWidth: 1, gap: spacing.sm, justifyContent: "center", minHeight: 76, minWidth: "46%", padding: spacing.md, shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  moreFamilyCard: { backgroundColor: "#EAF6CF", borderColor: "#BBD781" },
  morePrivacyCard: { backgroundColor: "#DDF6F0", borderColor: "#76CCBE" },
  moreSupportCard: { backgroundColor: "#FFF1B8", borderColor: "#F0C940" },
  moreIntroCard: { backgroundColor: "#FFE4D6", borderColor: "#F2A791" },
  actionCardLargeText: { minWidth: "100%", width: "100%" },
  actionTitle: { ...typography.subheading, color: colors.text },
  languageOptions: { gap: spacing.sm, marginTop: spacing.sm },
  languageOption: { borderColor: colors.border, borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  languageOptionSelected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  pressed: { opacity: 0.72 },
  datePill: { alignSelf: "flex-start", backgroundColor: colors.cream, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  datePillText: { ...typography.body, color: colors.text, fontWeight: "700" },
  sharedTools: { flexDirection: "row", gap: spacing.sm },
  sharedToolCard: { borderRadius: 20, borderWidth: 1, flex: 1, gap: spacing.xs, minHeight: 132, padding: spacing.md },
  callToolCard: { backgroundColor: "#F1E9FF", borderColor: "#D6B9F8" },
  conchToolCard: { backgroundColor: "#DDF6F0", borderColor: "#76CCBE" },
  sharedToolTitle: { ...typography.body, color: colors.text, fontWeight: "900" },
  connectionToolCard: { alignItems: "center", backgroundColor: "#DDF6F0", borderColor: "#76CCBE", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  todayLine: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  connectionStatus: { ...typography.caption, color: colors.muted, fontWeight: "700" },
  planCard: { backgroundColor: "#FFFDF8", borderColor: "#F2C8B5", borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 116, overflow: "hidden", paddingRight: spacing.md, shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1 },
  planCardEmpty: { minHeight: 112 },
  planAccent: { backgroundColor: colors.coral, width: 10 },
  planAccentSun: { backgroundColor: colors.sun },
  planCopy: { flex: 1, gap: spacing.xs, justifyContent: "center", paddingVertical: spacing.md },
  planEyebrow: { ...typography.caption, color: colors.coral, fontWeight: "800", textTransform: "uppercase" },
  planTitle: { ...typography.heading, color: colors.text },
  activityCard: { alignItems: "center", backgroundColor: colors.warningSurface, borderColor: colors.warningBorder, borderRadius: 22, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  activityDot: { alignItems: "center", backgroundColor: colors.sun, borderRadius: 999, height: 44, justifyContent: "center", width: 44 },
  activityCopy: { flex: 1, gap: spacing.xs },
  activityTitle: { ...typography.body, color: colors.text, fontWeight: "800" },
  cardHeadingRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  taskCard: { backgroundColor: "#FFF1B8", borderColor: "#F0C940", borderRadius: 22, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  taskTitle: { ...typography.subheading, color: colors.warning },
  recordCard: { backgroundColor: "#DDF6F0", borderColor: "#76CCBE", borderRadius: 22, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  recordTitle: { ...typography.subheading, color: colors.accent },
  messageCta: { alignItems: "center", backgroundColor: colors.coral, borderRadius: 26, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", padding: spacing.lg },
  messageCtaCopy: { flex: 1, gap: spacing.xs },
  messageCtaIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 999, height: 54, justifyContent: "center", width: 54 },
  messageCtaTitle: { ...typography.heading, color: colors.onBrand },
  messageCtaBody: { ...typography.body, color: colors.onBrand },
  callCard: { backgroundColor: "#E8E0FA", borderColor: "#B8A4E4", borderRadius: 22, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  callTitle: { ...typography.subheading, color: colors.brand },
  inviteCard: { backgroundColor: "#EAF6CF", borderColor: "#BBD781", borderRadius: 22, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  inviteTitle: { ...typography.subheading, color: colors.successText },
  card: { backgroundColor: "#FFFDF8", borderColor: "#E7C8BD", borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  addEventCta: { alignItems: "center", backgroundColor: colors.brandSoft, borderColor: colors.brand, borderRadius: 20, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 64, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  addEventCtaCopy: { flex: 1, gap: spacing.xs },
  eventSheet: { backgroundColor: colors.surface, borderRadius: 28, gap: spacing.md, maxHeight: "92%", padding: spacing.lg, width: "100%" },
  calendarSummaryRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 44 },
  calendarDots: { flexDirection: "row", gap: spacing.xs },
  successCard: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 22, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  confirmCard: { backgroundColor: colors.warningSurface, borderColor: colors.warningBorder, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  assistCard: { backgroundColor: "#FFE4D6", borderColor: "#F2A791", borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  codeInput: { ...typography.title, backgroundColor: colors.surface, borderColor: "#76CCBE", borderRadius: 22, borderWidth: 2, color: colors.text, letterSpacing: 12, padding: spacing.lg, textAlign: "center" },
  codeEntry: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 62, position: "relative" },
  codeCell: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 2, height: 58, justifyContent: "center", width: 44 },
  codeCellFilled: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  codeCellText: { ...typography.heading, color: colors.text },
  codeInputOverlay: { bottom: 0, color: "transparent", left: 0, opacity: 0.02, position: "absolute", right: 0, top: 0, width: "100%", zIndex: 2 },
  invitationCode: { ...typography.heading, color: colors.brand, letterSpacing: 8, textAlign: "center" },
  qrCard: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  qrLabel: { ...typography.caption, color: colors.text, fontWeight: "800" },
  error: { ...typography.body, color: colors.dangerText, fontWeight: "700" },
  errorText: { ...typography.caption, color: colors.dangerText, fontWeight: "700" },
  success: { ...typography.body, color: colors.successText, fontWeight: "700" },
  segmented: { backgroundColor: colors.cream, borderRadius: 18, flexDirection: "row", padding: spacing.xs },
  segment: { alignItems: "center", borderRadius: 14, flex: 1, justifyContent: "center", minHeight: 48, paddingVertical: spacing.md },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { ...typography.body, color: colors.muted, fontWeight: "700" },
  segmentTextActive: { color: colors.brand },
  calendarNavigation: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  planningDisclosure: { alignItems: "center", backgroundColor: colors.brandSoft, borderColor: colors.brand, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", padding: spacing.md },
  planningDisclosureCopy: { flex: 1, gap: spacing.xs },
  planningDisclosureTitle: { ...typography.body, color: colors.text, fontWeight: "900" },
  calendarCanvas: { backgroundColor: "#FFFDF8", borderColor: "#F0C940", borderRadius: 24, borderWidth: 1, gap: spacing.md, minHeight: 180, padding: spacing.lg },
  calendarMonth: { ...typography.heading, color: colors.text },
  calendarEmpty: { ...typography.body, color: colors.muted },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { ...typography.caption, color: colors.muted, fontWeight: "800", textAlign: "center", width: "14.2857%" },
  monthCell: { borderTopColor: colors.border, borderTopWidth: 1, gap: 2, minHeight: 54, paddingHorizontal: 3, paddingTop: spacing.xs, width: "14.2857%" },
  yourTimeCell: { backgroundColor: "rgba(139,92,246,0.10)" },
  otherTimeCell: { backgroundColor: "rgba(98,180,75,0.10)" },
  dayNumber: { ...typography.caption, color: colors.text, fontWeight: "800" },
  custodyCellLabel: { color: colors.brand, fontSize: 8, fontWeight: "800", overflow: "hidden" },
  monthEvent: { backgroundColor: colors.brandSoft, borderRadius: 6, color: colors.brand, fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 3, paddingVertical: 2 },
  scheduleList: { gap: spacing.sm },
  scheduleRow: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, paddingTop: spacing.sm },
  scheduleDate: { ...typography.caption, color: colors.text, fontWeight: "800", width: 48 },
  scheduleContent: { flex: 1, gap: spacing.xs },
  custodyLabel: { ...typography.caption, fontWeight: "800" },
  yourTimeText: { color: colors.brand },
  otherTimeText: { color: colors.successText },
  scheduleEvent: { backgroundColor: colors.brandSoft, borderLeftColor: colors.brand, borderLeftWidth: 3, borderRadius: 12, gap: 2, padding: spacing.sm },
  layerRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md },
  layerRowLargeText: { alignItems: "stretch", flexDirection: "column" },
  layerIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 44 },
  layerCopy: { flex: 1 },
  layerDot: { borderRadius: 999, height: 16, width: 16 },
  smallButton: { alignItems: "center", backgroundColor: colors.brandSoft, borderRadius: 999, justifyContent: "center", minHeight: 44, minWidth: 64, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  smallButtonText: { ...typography.caption, color: colors.brand, fontWeight: "800" },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: "#E7C8BD", borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 52, padding: spacing.md },
  multilineInput: { minHeight: 96, textAlignVertical: "top" },
  listItem: { alignItems: "center", backgroundColor: colors.cream, borderRadius: 18, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.md },
  flexOne: { flex: 1, minWidth: 180 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  messageInput: { minHeight: 120, textAlignVertical: "top" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...typography.caption, color: colors.muted, fontWeight: "700" },
  chipTextActive: { color: colors.onBrand },
  enabledRow: { alignItems: "center", backgroundColor: colors.successSurface, borderRadius: 18, flexDirection: "row", justifyContent: "space-between", padding: spacing.md },
  enabledRowLargeText: { alignItems: "stretch", flexDirection: "column", gap: spacing.sm },
  successText: { ...typography.body, color: colors.successText, fontWeight: "800" },
  link: { ...typography.body, color: colors.brand, fontWeight: "800", textAlign: "center" },
  linkButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.sm },
  sentBubble: { alignSelf: "flex-end", backgroundColor: colors.brandSoft, borderRadius: 20, maxWidth: "86%", padding: spacing.md },
  searchResult: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.sm },
  chatScreen: { backgroundColor: colors.background, flex: 1 },
  chatHeader: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 72, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chatIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm },
  chatIdentityCopy: { flex: 1, gap: 2 },
  chatTitle: { ...typography.subheading, color: colors.text },
  chatSubtitle: { ...typography.caption, color: colors.muted },
  coParentAvatar: { alignItems: "center", backgroundColor: colors.brandSoft, borderColor: colors.brand, borderRadius: 999, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  coParentAvatarText: { color: colors.brand, fontSize: 13, fontWeight: "900" },
  chatHeaderActions: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  iconButton: { alignItems: "center", borderRadius: 22, justifyContent: "center", minHeight: 44, minWidth: 44 },
  timelineShell: { flex: 1, position: "relative" },
  messageTimelineScroll: { flex: 1 },
  messageTimeline: { gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.lg },
  messageTimelineLargeText: { paddingHorizontal: spacing.sm },
  privacyNotice: { alignItems: "center", alignSelf: "center", backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: spacing.xs, maxWidth: "94%", paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  privacyNoticeText: { ...typography.caption, color: colors.accent, flexShrink: 1, textAlign: "center" },
  utilityTray: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: spacing.xs, padding: spacing.sm },
  utilityAction: { alignItems: "center", flexDirection: "row", gap: spacing.xs, minHeight: 40 },
  utilityActionText: { ...typography.caption, color: colors.brand, fontWeight: "800" },
  utilityHint: { ...typography.caption, color: colors.muted },
  searchBar: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: spacing.xs, minHeight: 52, paddingHorizontal: spacing.sm },
  searchInput: { ...typography.body, color: colors.text, flex: 1, minHeight: 44, paddingHorizontal: spacing.xs },
  searchButton: { alignItems: "center", borderRadius: 12, justifyContent: "center", minHeight: 40, paddingHorizontal: spacing.sm },
  searchButtonText: { ...typography.caption, color: colors.brand, fontWeight: "900" },
  messageCheckRow: { backgroundColor: colors.warningSurface, borderColor: colors.warningBorder, borderRadius: 16, borderWidth: 1, gap: spacing.xs, padding: spacing.sm },
  messageCheckCopy: { flex: 1, gap: 2 },
  messageCheckTitle: { ...typography.body, color: colors.text, fontWeight: "900" },
  messageCheckBody: { ...typography.caption, color: colors.muted },
  messageCheckEnabled: { alignItems: "center", backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.sm },
  messageList: { gap: spacing.xs, minHeight: 180 },
  dateSeparator: { alignItems: "center", paddingVertical: spacing.sm },
  dateSeparatorText: { ...typography.caption, backgroundColor: colors.cream, borderRadius: 999, color: colors.muted, fontWeight: "800", overflow: "hidden", paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  emptyConversation: { alignItems: "center", alignSelf: "center", gap: spacing.xs, justifyContent: "center", maxWidth: 280, paddingVertical: spacing.xl },
  emptyConversationTitle: { ...typography.subheading, color: colors.text, textAlign: "center" },
  emptyConversationBody: { ...typography.caption, color: colors.muted, textAlign: "center" },
  messageRow: { flexDirection: "row", width: "100%" },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  messageBubble: { borderRadius: 18, gap: spacing.xs, maxWidth: "82%", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  messageBubbleMine: { backgroundColor: colors.brandSoft, borderBottomRightRadius: 5 },
  messageBubbleOther: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 5 },
  messageBubbleText: { ...typography.body, color: colors.text },
  messageMeta: { alignItems: "center", flexDirection: "row", gap: spacing.xs, justifyContent: "flex-end" },
  messageTime: { ...typography.caption, color: colors.muted },
  messageStatus: { ...typography.caption, color: colors.brand, fontWeight: "700" },
  correctionEditor: { gap: spacing.sm, marginTop: spacing.xs },
  correctionInput: { minHeight: 80 },
  recoveryBlock: { gap: spacing.sm, marginTop: spacing.xs },
  previewCard: { backgroundColor: colors.brandSoft, borderColor: colors.brand, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  composerDock: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.xs, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  composerTools: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  toolChip: { alignItems: "center", backgroundColor: colors.brandSoft, borderRadius: 999, flexDirection: "row", gap: spacing.xs, minHeight: 38, paddingHorizontal: spacing.md },
  toolChipText: { ...typography.caption, color: colors.brand, fontWeight: "900" },
  toolIcon: { alignItems: "center", borderRadius: 20, justifyContent: "center", minHeight: 40, minWidth: 40 },
  composerRow: { alignItems: "flex-end", flexDirection: "row", gap: spacing.xs },
  composerInput: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: 20, borderWidth: 1, color: colors.text, flex: 1, maxHeight: 112, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  composerInputLargeText: { maxHeight: 150 },
  composerSend: { alignItems: "center", backgroundColor: colors.brand, borderRadius: 999, height: 48, justifyContent: "center", width: 48 },
  composerSendDisabled: { backgroundColor: colors.muted, opacity: 0.45 },
  composerHint: { ...typography.caption, color: colors.muted, paddingHorizontal: spacing.sm },
  attachmentsTray: { backgroundColor: colors.cream, borderColor: colors.warningBorder, borderRadius: 16, borderWidth: 1, gap: spacing.xs, padding: spacing.sm },
  attachmentsTitle: { ...typography.body, color: colors.text, fontWeight: "900" },
  attachmentsBody: { ...typography.caption, color: colors.muted },
  attachmentItem: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingTop: spacing.xs },
  attachmentCopy: { flex: 1 },
  coachModal: { backgroundColor: colors.background, flex: 1, padding: spacing.md },
  coachModalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 52 },
  coachModalTitle: { ...typography.heading, color: colors.text },
  jumpToLatest: { alignItems: "center", alignSelf: "center", backgroundColor: colors.brand, borderRadius: 999, bottom: spacing.md, flexDirection: "row", gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.md, position: "absolute", shadowColor: colors.text, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  jumpToLatestText: { ...typography.caption, color: colors.onBrand, fontWeight: "800" },
  messageCheckBackdrop: { backgroundColor: "rgba(28, 21, 37, 0.32)", flex: 1, justifyContent: "flex-end" },
  messageCheckSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  calendarManagerSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: spacing.md, maxHeight: "82%", padding: spacing.lg, paddingBottom: spacing.xl },
  sheetHandle: { alignSelf: "center", backgroundColor: colors.border, borderRadius: 999, height: 5, width: 42 },
  sheetTitle: { ...typography.heading, color: colors.text }
});
