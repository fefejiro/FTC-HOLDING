import React, { useEffect, useState } from "react";
import { Image, Linking, Pressable, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { InvitationQr } from "../components/InvitationQr";
import { LabButton } from "../components/LabButton";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { languageNames, supportedLocales, useLocalization, useOptionalLocalization } from "../localization/LocalizationProvider";
import { calendarText, formatCalendarDate, formatCalendarDay } from "../localization/calendarLocalization";
import { formatLocalizedDate } from "../localization/localizedDate";
import { messageText } from "../localization/messageLocalization";
import { workflowText } from "../localization/workflowLocalization";
import { homeText } from "../localization/homeLocalization";
import { callText } from "../localization/callLocalization";
import { PublicOnboardingSlides } from "../auth/PublicOnboardingAuth";
import { LinkedSignInMethods } from "../auth/LinkedSignInMethods";
import { SupportPanel } from "../support/SupportPanel";
import { colors, spacing, typography, usesLargeTextLayout } from "../theme";
import { useRecordsState } from "../records/RecordsState";
import type { AttachmentMediaType } from "../domain/v2";
import { useOptionalStagingAccountActions } from "../session/StagingAccountActions";
import { useCoordinationState, type CalendarView } from "./CoordinationState";
import { WeatherActivityIdeas } from "../legacy/WeatherActivityIdeas";

export type CoordinationScreen = "home" | "messages" | "calendar" | "invite" | "records" | "calls" | "more";
type Navigate = (screen: CoordinationScreen) => void;

const layerColors: Record<string, string> = {
  teal: "#24B9B5",
  violet: "#8B5CF6",
  amber: "#F59E0B",
  rose: "#EF476F",
  blue: "#3B82F6",
  green: "#62B44B"
};

const august2026Weekdays = [2, 3, 4, 5, 6, 7, 1] as const;
const august2026Week = [1, 2, 3, 4, 5, 6, 7] as const;

function eventDay(event: ReturnType<typeof useCoordinationState>["events"][number]): number {
  return new Date(event.startsAt).getUTCDate();
}

function CalendarViewPanel({
  calendarView,
  events,
  layers,
  locale
}: {
  calendarView: CalendarView;
  events: ReturnType<typeof useCoordinationState>["events"];
  layers: ReturnType<typeof useCoordinationState>["layers"];
  locale: ReturnType<typeof useLocalization>["locale"];
}) {
  const layerName = (calendarLayerId: string) =>
    layers.find((layer) => layer.id === calendarLayerId)?.name ?? "Calendar";

  if (calendarView === "month") {
    const cells: readonly { key: string; day?: number }[] = [
      ...Array.from({ length: 6 }, (_, index) => ({ key: `blank-${index}` })),
      ...Array.from({ length: 31 }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 }))
    ];
    return (
      <View accessibilityLabel={`${calendarText(locale, "month")} ${calendarText(locale, "title")}`.toLocaleLowerCase(locale)} style={styles.calendarCanvas}>
        <Text style={styles.calendarMonth}>{formatCalendarDate(locale, "2026-08-01T00:00:00.000Z", { month: "long", year: "numeric" })}</Text>
        <View style={styles.monthGrid}>
          {august2026Weekdays.map((day) => (
            <Text key={day} style={styles.weekday}>{formatCalendarDate(locale, new Date(Date.UTC(2026, 7, day)), { weekday: "short" })}</Text>
          ))}
          {cells.map((cell) => {
            const dayEvents = cell.day ? events.filter((event) => eventDay(event) === cell.day) : [];
            return (
              <View accessibilityLabel={cell.day ? formatCalendarDate(locale, new Date(Date.UTC(2026, 7, cell.day)), { month: "long", day: "numeric" }) : undefined} key={cell.key} style={styles.monthCell}>
                {cell.day ? <Text style={styles.dayNumber}>{cell.day}</Text> : null}
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
    return (
      <View accessibilityLabel={`${calendarText(locale, "week")} ${calendarText(locale, "title")}`.toLocaleLowerCase(locale)} style={styles.calendarCanvas}>
        <Text style={styles.calendarMonth}>{formatCalendarDate(locale, "2026-08-01T00:00:00.000Z", { month: "short", day: "numeric" })}–7</Text>
        <View style={styles.scheduleList}>
          {august2026Week.map((day) => {
            const dayEvents = events.filter((event) => eventDay(event) === day);
            return (
              <View key={day} style={styles.scheduleRow}>
                <Text style={styles.scheduleDate}>{formatCalendarDay(locale, day)}</Text>
                <View style={styles.scheduleContent}>
                  {dayEvents.length ? dayEvents.map((event) => (
                    <View key={event.id} style={styles.scheduleEvent}>
                      <Text style={styles.actionTitle}>{event.title}</Text>
                      <Text style={styles.caption}>{layerName(event.calendarLayerId)}</Text>
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

  const dayEvents = events.filter((event) => eventDay(event) === 1);
  return (
    <View accessibilityLabel={`${calendarText(locale, "day")} ${calendarText(locale, "title")}`.toLocaleLowerCase(locale)} style={styles.calendarCanvas}>
      <Text style={styles.calendarMonth}>{formatCalendarDate(locale, "2026-08-01T00:00:00.000Z", { weekday: "long", month: "long", day: "numeric" })}</Text>
      <View style={styles.scheduleList}>
        {dayEvents.length ? dayEvents.map((event) => (
          <View key={event.id} style={styles.scheduleEvent}>
            <Text style={styles.actionTitle}>{event.title}</Text>
            <Text style={styles.caption}>{layerName(event.calendarLayerId)}</Text>
          </View>
        )) : <Text style={styles.calendarEmpty}>{calendarText(locale, "noEventsYet")}</Text>}
      </View>
    </View>
  );
}

export function CoordinationHomeScreen({ setScreen }: { setScreen: Navigate }) {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);
  const { locale } = useOptionalLocalization();
  const h = (key: Parameters<typeof homeText>[1]) => homeText(locale, key);
  const { events, invitationGrant, sentMessages } = useCoordinationState();

  const actions: readonly { label: string; detail: string; route: CoordinationScreen }[] = [
    { label: h("send"), detail: h("sendBody"), route: "messages" },
    { label: h("event"), detail: h("eventBody"), route: "calendar" },
    { label: h("invite"), detail: h("inviteBody"), route: "invite" },
    { label: h("record"), detail: h("recordBody"), route: "records" },
    { label: callText(locale, "title"), detail: callText(locale, "body"), route: "calls" }
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.brandHero}>
        <Image accessibilityLabel={h("logo")} source={require("../foundation/peacepad-conch.png")} style={styles.logo} />
        <View style={styles.brandHeroCopy}>
          <AccessibleHeading style={styles.title}>{h("title")}</AccessibleHeading>
          <Text style={styles.body}>{h("body")}</Text>
        </View>
      </View>

      <View style={[styles.actionGrid, largeText ? styles.stack : null]}>
        {actions.map((action) => (
          <Pressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            key={action.label}
            onPress={() => setScreen(action.route)}
            style={({ pressed }) => [styles.actionCard, largeText ? styles.actionCardLargeText : null, pressed ? styles.pressed : null]}
          >
            <Text style={styles.actionTitle}>{action.label}</Text>
            <Text style={styles.caption}>{action.detail}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summaryCard}>
        <Text accessibilityRole="header" style={styles.heading}>{h("today")}</Text>
        <SummaryRow label={h("upcoming")} value={String(events.length)} />
        <SummaryRow label={h("saved")} value="0" />
        <SummaryRow label={h("sent")} value={String(sentMessages.length)} />
        <SummaryRow label={h("family")} value={h(invitationGrant ? "connected" : "notConnected")} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.body}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

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
          <TextInput
            accessibilityLabel={t("invite.code")}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            onChangeText={setInvitationCode}
            placeholder="ABC123"
            style={styles.codeInput}
            value={invitationCode}
          />
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

export function CalendarScreen() {
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
    visibleLayerIds
  } = useCoordinationState();
  const [eventTitle, setEventTitle] = useState("");
  const [selectedLayerId, setSelectedLayerId] = useState(layers[0]?.id ?? "");
  const [pendingShareLayerId, setPendingShareLayerId] = useState<string>();
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<string>();

  const visibleEvents = events.filter((event) => visibleLayerIds.includes(event.calendarLayerId));
  const views: readonly CalendarView[] = ["month", "week", "day"];

  return (
    <View style={styles.stack}>
      <View style={styles.titleRow}>
        <View>
          <AccessibleHeading style={styles.title}>{calendarText(locale, "title")}</AccessibleHeading>
          <Text style={styles.body}>{calendarText(locale, "body")}</Text>
        </View>
      </View>

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

      <CalendarViewPanel calendarView={calendarView} events={visibleEvents} layers={layers} locale={locale} />

      <WeatherActivityIdeas />

      <View style={styles.card}>
        <Text style={styles.heading}>{calendarText(locale, "calendars")}</Text>
        {layers.map((layer) => {
          const visible = visibleLayerIds.includes(layer.id);
          const shared = layer.visibility.scope !== "private";
          return (
            <View key={layer.id} style={[styles.layerRow, largeText ? styles.layerRowLargeText : null]}>
              <Pressable
                accessibilityLabel={`${w(visible ? "hide" : "show")} ${layer.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: visible }}
                onPress={() => toggleLayerFilter(layer.id)}
                style={styles.layerIdentity}
              >
                <View style={[styles.layerDot, { backgroundColor: layerColors[layer.colorToken] }]} />
                <View style={styles.layerCopy}>
                  <Text style={styles.actionTitle}>{layer.name}</Text>
                  <Text style={styles.caption}>{w(shared ? "shared" : "private")}</Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityLabel={`${w(shared ? "makePrivate" : "share")} ${layer.name}`}
                accessibilityRole="button"
                onPress={() => shared ? void setLayerShared(layer.id, false) : setPendingShareLayerId(layer.id)}
                style={styles.smallButton}
              >
                <Text style={styles.smallButtonText}>{w(shared ? "private" : "share")}</Text>
              </Pressable>
            </View>
          );
        })}
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

      <View style={styles.card}>
        <Text style={styles.heading}>{w("addEvent")}</Text>
        <TextInput accessibilityLabel={w("eventTitle")} onChangeText={setEventTitle} placeholder={w("eventTitle")} style={styles.input} value={eventTitle} />
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
        <LabButton label={w("saveEvent")} disabled={!eventTitle.trim()} onPress={() => {
          void addEvent({
            layerId: selectedLayerId,
            title: eventTitle,
            startsAt: "2026-08-01T14:00:00.000Z",
            endsAt: "2026-08-01T15:00:00.000Z"
          });
          setEventTitle("");
        }} />
      </View>

      {visibleEvents.map((event) => (
        <View key={event.id} style={styles.card}>
          <Text style={styles.actionTitle}>{event.title}</Text>
          <Text style={styles.caption}>{layers.find((layer) => layer.id === event.calendarLayerId)?.name}</Text>
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
    </View>
  );
}

export function MessagesScreen() {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);
  const { locale } = useOptionalLocalization();
  const m = (key: Parameters<typeof messageText>[1]) => messageText(locale, key);
  const {
    cancelCorrection,
    checkMessage,
    correctingMessageId,
    correctionBusy,
    correctionDraft,
    correctionError,
    messageCheckBusy,
    messageCheckEnabled,
    messageCheckHydrated,
    messageDraft,
    messageError,
    messagePreview,
    messageSearchBusy,
    messageSearchError,
    messageSearchQuery,
    messageSearchResults,
    queuedActionBusyIds,
    queuedActionError,
    removeQueuedMessage,
    retryQueuedMessage,
    searchMessages,
    saveCorrection,
    sendMessage,
    sentMessages,
    setCorrectionDraft,
    setMessageCheckEnabled,
    setMessageDraft,
    setMessageSearchQuery,
    startCorrection
  } = useCoordinationState();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [removeQueuedMessageId, setRemoveQueuedMessageId] = useState<string>();

  return (
    <View style={styles.stack}>
      <AccessibleHeading style={styles.title}>{m("title")}</AccessibleHeading>
      <Text style={styles.body}>{m("body")}</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>{m("find")}</Text>
        <TextInput
          accessibilityLabel={m("searchLabel")}
          autoCapitalize="none"
          onChangeText={setMessageSearchQuery}
          placeholder={m("searchPlaceholder")}
          returnKeyType="search"
          onSubmitEditing={() => void searchMessages()}
          style={styles.input}
          value={messageSearchQuery}
        />
        <LabButton
          disabled={messageSearchQuery.trim().length < 2 || messageSearchBusy}
          label={messageSearchBusy ? m("searching") : m("search")}
          onPress={() => void searchMessages()}
          variant="secondary"
        />
        {messageSearchError ? <Text accessibilityRole="alert" style={styles.error}>{messageSearchError}</Text> : null}
        {messageSearchResults.map((result) => (
          <View accessibilityLabel={m("searchResult")} key={result.originalMessageEventId} style={styles.searchResult}>
            <Text style={styles.body}>{result.body}</Text>
            {result.corrected ? <Text style={styles.caption}>{m("corrected")}</Text> : null}
          </View>
        ))}
      </View>

      {!messageCheckEnabled ? (
        <View style={styles.assistCard}>
          <Text style={styles.heading}>{m("check")}</Text>
          <Text style={styles.body}>{m("checkBody")}</Text>
          <LabButton
            disabled={!messageCheckHydrated || messageCheckBusy}
            label={!messageCheckHydrated ? m("unavailable") : messageCheckBusy ? m("updating") : m("turnOn")}
            onPress={() => void setMessageCheckEnabled(true)}
          />
          <LabButton label={m("notNow")} onPress={() => setShowHowItWorks(false)} variant="secondary" />
          <Pressable
            accessibilityLabel={m("howLabel")}
            accessibilityRole="button"
            accessibilityState={{ expanded: showHowItWorks }}
            onPress={() => setShowHowItWorks((current) => !current)}
            style={styles.linkButton}
          >
            <Text style={styles.link}>{m("how")}</Text>
          </Pressable>
          {showHowItWorks ? (
            <Text style={styles.caption}>{m("howBody")}</Text>
          ) : null}
        </View>
      ) : (
        <View style={[styles.enabledRow, largeText ? styles.enabledRowLargeText : null]}>
          <Text style={styles.successText}>{m("checkOn")}</Text>
          <Pressable
            accessibilityLabel={m("turnOffLabel")}
            accessibilityRole="button"
            accessibilityState={{ disabled: !messageCheckHydrated || messageCheckBusy }}
            disabled={!messageCheckHydrated || messageCheckBusy}
            onPress={() => void setMessageCheckEnabled(false)}
            style={styles.linkButton}
          >
            <Text style={styles.link}>{m("turnOff")}</Text>
          </Pressable>
        </View>
      )}

      {sentMessages.map((message) => (
        <View accessibilityLabel={m("sent")} key={message.id} style={styles.sentBubble}>
          <Text style={styles.body}>{message.sentBody}</Text>
          {message.canCorrect && message.status !== "waiting" && correctingMessageId !== message.id ? (
            <LabButton label={m("correct")} onPress={() => startCorrection(message.id)} variant="secondary" />
          ) : null}
          {correctingMessageId === message.id ? (
            <View accessibilityLabel={m("correctionEditor")} style={styles.stack}>
              <Text style={styles.caption}>{m("originalRemains")}</Text>
              <TextInput
                accessibilityLabel={m("correctionWording")}
                multiline
                onChangeText={setCorrectionDraft}
                style={[styles.input, styles.messageInput]}
                value={correctionDraft}
              />
              {correctionError ? <Text accessibilityRole="alert" style={styles.error}>{correctionError}</Text> : null}
              <LabButton disabled={correctionBusy} label={correctionBusy ? m("saving") : m("saveCorrection")} onPress={() => void saveCorrection()} />
              <LabButton disabled={correctionBusy} label={m("cancelCorrection")} onPress={cancelCorrection} variant="secondary" />
            </View>
          ) : null}
          {message.queued && message.status === "needs-action" ? (
            <View accessibilityLabel={m("recovery")} style={styles.stack}>
              <Text style={styles.caption}>{m("recoveryBody")}</Text>
              <LabButton
                disabled={queuedActionBusyIds.includes(message.id)}
                label={queuedActionBusyIds.includes(message.id) ? m("trying") : m("tryAgain")}
                onPress={() => void retryQueuedMessage(message.id)}
              />
              {removeQueuedMessageId === message.id ? (
                <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.confirmCard}>
                  <Text style={styles.body}>{m("removeWarning")}</Text>
                  <LabButton
                    disabled={queuedActionBusyIds.includes(message.id)}
                    label={m("remove")}
                    onPress={() => {
                      setRemoveQueuedMessageId(undefined);
                      void removeQueuedMessage(message.id);
                    }}
                  />
                  <LabButton label={m("keep")} onPress={() => setRemoveQueuedMessageId(undefined)} variant="secondary" />
                </View>
              ) : (
                <LabButton
                  disabled={queuedActionBusyIds.includes(message.id)}
                  label={m("remove")}
                  onPress={() => setRemoveQueuedMessageId(message.id)}
                  variant="secondary"
                />
              )}
            </View>
          ) : null}
          <Text style={styles.caption}>{message.corrected ? `${m("corrected")} · ` : ""}{message.status === "waiting" ? m("waiting") : message.status === "needs-action" ? m("attention") : message.status}</Text>
        </View>
      ))}

      {queuedActionError ? <Text accessibilityRole="alert" style={styles.error}>{queuedActionError}</Text> : null}

      <TextInput
        accessibilityLabel={m("draft")}
        multiline
        onChangeText={setMessageDraft}
        placeholder={m("draftPlaceholder")}
        style={[styles.input, styles.messageInput]}
        value={messageDraft}
      />

      {messageCheckEnabled ? (
        <LabButton disabled={!messageDraft.trim() || messageCheckBusy} label={messageCheckBusy ? m("checking") : m("checkMessage")} onPress={() => void checkMessage()} />
      ) : null}

      {messagePreview ? (
        <View accessibilityLabel={m("result")} style={styles.assistCard}>
          <Text style={styles.heading}>{messagePreview.tone}</Text>
          <Text style={styles.body}>{messagePreview.summary}</Text>
          {messagePreview.rewordingSuggestion ? (
            <>
              <Text style={styles.fieldLabel}>{m("suggested")}</Text>
              <Text style={styles.body}>{messagePreview.rewordingSuggestion}</Text>
              <LabButton label={m("sendSuggested")} onPress={() => void sendMessage(true)} />
            </>
          ) : null}
          <LabButton label={m("sendOriginal")} onPress={() => void sendMessage(false)} variant="secondary" />
        </View>
      ) : null}

      {messageError ? (
        <View accessibilityRole="alert" style={styles.confirmCard}>
          <Text style={styles.error}>{messageError}</Text>
          {messageCheckEnabled && messageDraft.trim() ? <LabButton label={m("checkAgain")} onPress={() => void checkMessage()} /> : null}
          {messageDraft.trim() ? <LabButton label={m("sendOriginal")} onPress={() => void sendMessage(false)} variant="secondary" /> : null}
        </View>
      ) : null}

      {!messageCheckEnabled && messageDraft.trim() ? (
        <LabButton label={m("send")} onPress={() => void sendMessage(false)} />
      ) : null}
    </View>
  );
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
      <AccessibleHeading style={styles.title}>{w("records")}</AccessibleHeading>
      {loading ? <View style={styles.card}><Text style={styles.heading}>{w("opening")}</Text><Text style={styles.body}>{w("loading")}</Text></View> : null}
      {!loading && binders.length > 1 ? <View style={styles.card}>
        <Text style={styles.heading}>{w("binders")}</Text>
        {binders.filter((candidate) => candidate.status === "active").map((candidate) => (
          <Pressable accessibilityRole="button" key={candidate.id} onPress={() => selectBinder(candidate.id)} style={styles.actionCard}>
            <Text style={styles.actionTitle}>{candidate.name}</Text>
            <Text style={styles.caption}>{candidate.childLabel} · {w("private")}</Text>
          </Pressable>
        ))}
      </View> : null}
      {!loading && !binder ? <View style={styles.card}>
        <Text style={styles.heading}>{w("createBinder")}</Text>
        <Text style={styles.body}>{w("binderBody")}</Text>
        <TextInput accessibilityLabel={w("binderName")} onChangeText={setBinderName} placeholder={w("binderName")} style={styles.input} value={binderName} />
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
      <Pressable accessibilityRole="button" onPress={() => setScreen("home")} style={styles.actionCard}>
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
  useEffect(() => setProfileName(accountActions?.displayName ?? ""), [accountActions?.displayName]);
  if (replayIntroduction) {
    return <PublicOnboardingSlides compact onComplete={() => setReplayIntroduction(false)} />;
  }
  return (
    <View style={styles.stack}>
      <AccessibleHeading style={styles.title}>{t("more.title")}</AccessibleHeading>
      <Pressable accessibilityRole="button" onPress={() => setScreen("invite")} style={styles.actionCard}>
        <Text style={styles.actionTitle}>{t("more.family.title")}</Text>
        <Text style={styles.caption}>{t("more.family.body")}</Text>
      </Pressable>
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>{t("more.privacy.title")}</Text>
        <Text style={styles.caption}>{t("more.privacy.body")}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => setShowSupport((current) => !current)} style={styles.actionCard}>
        <Text style={styles.actionTitle}>{t("more.support.title")}</Text>
        <Text style={styles.caption}>{t("more.support.body")}</Text>
      </Pressable>
      {showSupport ? <View style={styles.actionCardLargeText}><SupportPanel /></View> : null}
      <Pressable accessibilityRole="button" onPress={() => setReplayIntroduction(true)} style={styles.actionCard}>
        <Text style={styles.actionTitle}>{t("more.introduction.title")}</Text>
        <Text style={styles.caption}>{t("more.introduction.body")}</Text>
      </Pressable>
      <LinkedSignInMethods />
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
  stack: { gap: spacing.lg },
  stackTight: { gap: spacing.sm },
  title: { ...typography.title, color: colors.text },
  heading: { ...typography.subheading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  caption: { ...typography.caption, color: colors.muted },
  fieldLabel: { ...typography.caption, color: colors.text, fontWeight: "800", marginTop: spacing.sm, textTransform: "uppercase" },
  brandHero: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  brandHeroCopy: { flex: 1, gap: spacing.xs },
  logo: { height: 64, width: 64 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.sm, justifyContent: "center", minHeight: 88, minWidth: "46%", padding: spacing.lg, shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  actionCardLargeText: { minWidth: "100%", width: "100%" },
  actionTitle: { ...typography.subheading, color: colors.text },
  languageOptions: { gap: spacing.sm, marginTop: spacing.sm },
  languageOption: { borderColor: colors.border, borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  languageOptionSelected: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  pressed: { opacity: 0.72 },
  summaryCard: { backgroundColor: colors.brand, borderRadius: 24, gap: spacing.sm, padding: spacing.lg },
  summaryRow: { alignItems: "center", borderTopColor: "rgba(255,255,255,0.16)", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm },
  summaryValue: { ...typography.body, color: colors.onBrand, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  successCard: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 22, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  confirmCard: { backgroundColor: colors.warningSurface, borderColor: colors.warningBorder, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  assistCard: { backgroundColor: colors.brandSoft, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  codeInput: { ...typography.title, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, color: colors.text, letterSpacing: 12, padding: spacing.lg, textAlign: "center" },
  invitationCode: { ...typography.heading, color: colors.brand, letterSpacing: 8, textAlign: "center" },
  qrCard: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  qrLabel: { ...typography.caption, color: colors.text, fontWeight: "800" },
  error: { ...typography.body, color: colors.dangerText, fontWeight: "700" },
  success: { ...typography.body, color: colors.successText, fontWeight: "700" },
  titleRow: { flexDirection: "row", justifyContent: "space-between" },
  segmented: { backgroundColor: colors.brandSoft, borderRadius: 18, flexDirection: "row", padding: spacing.xs },
  segment: { alignItems: "center", borderRadius: 14, flex: 1, justifyContent: "center", minHeight: 48, paddingVertical: spacing.md },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { ...typography.body, color: colors.muted, fontWeight: "700" },
  segmentTextActive: { color: colors.brand },
  calendarCanvas: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.md, minHeight: 180, padding: spacing.lg },
  calendarMonth: { ...typography.heading, color: colors.text },
  calendarEmpty: { ...typography.body, color: colors.muted },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { ...typography.caption, color: colors.muted, fontWeight: "800", textAlign: "center", width: "14.2857%" },
  monthCell: { borderTopColor: colors.border, borderTopWidth: 1, gap: 2, minHeight: 54, paddingHorizontal: 3, paddingTop: spacing.xs, width: "14.2857%" },
  dayNumber: { ...typography.caption, color: colors.text, fontWeight: "800" },
  monthEvent: { backgroundColor: colors.brandSoft, borderRadius: 6, color: colors.brand, fontSize: 9, fontWeight: "700", overflow: "hidden", paddingHorizontal: 3, paddingVertical: 2 },
  scheduleList: { gap: spacing.sm },
  scheduleRow: { borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, paddingTop: spacing.sm },
  scheduleDate: { ...typography.caption, color: colors.text, fontWeight: "800", width: 48 },
  scheduleContent: { flex: 1, gap: spacing.xs },
  scheduleEvent: { backgroundColor: colors.brandSoft, borderLeftColor: colors.brand, borderLeftWidth: 3, borderRadius: 12, gap: 2, padding: spacing.sm },
  layerRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md },
  layerRowLargeText: { alignItems: "stretch", flexDirection: "column" },
  layerIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 44 },
  layerCopy: { flex: 1 },
  layerDot: { borderRadius: 999, height: 16, width: 16 },
  smallButton: { alignItems: "center", backgroundColor: colors.brandSoft, borderRadius: 999, justifyContent: "center", minHeight: 44, minWidth: 64, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  smallButtonText: { ...typography.caption, color: colors.brand, fontWeight: "800" },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, color: colors.text, minHeight: 52, padding: spacing.md },
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
  searchResult: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.sm }
});
