import React, { useEffect, useState } from "react";
import { Image, Pressable, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { InvitationQr } from "../components/InvitationQr";
import { LabButton } from "../components/LabButton";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { languageNames, supportedLocales, useLocalization } from "../localization/LocalizationProvider";
import { calendarText, formatCalendarDate, formatCalendarDay } from "../localization/calendarLocalization";
import { formatLocalizedDate } from "../localization/localizedDate";
import { colors, spacing, typography, usesLargeTextLayout } from "../theme";
import { useRecordsState } from "../records/RecordsState";
import type { AttachmentMediaType } from "../domain/v2";
import { useOptionalStagingAccountActions } from "../session/StagingAccountActions";
import { useCoordinationState, type CalendarView } from "./CoordinationState";

export type CoordinationScreen = "home" | "messages" | "calendar" | "invite" | "records" | "more";
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
  const { events, invitationGrant, sentMessages } = useCoordinationState();

  const actions: readonly { label: string; detail: string; route: CoordinationScreen }[] = [
    { label: "Send a message", detail: "Write clearly and review before sending.", route: "messages" },
    { label: "Add an event", detail: "Keep parenting plans and activities together.", route: "calendar" },
    { label: "Invite co-parent", detail: "Connect only after reviewing access.", route: "invite" },
    { label: "Add a record", detail: "Organize notes and source details.", route: "records" }
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.brandHero}>
        <Image accessibilityLabel="PeacePad conch logo" source={require("../foundation/peacepad-conch.png")} style={styles.logo} />
        <View style={styles.brandHeroCopy}>
          <AccessibleHeading style={styles.title}>What would you like to do?</AccessibleHeading>
          <Text style={styles.body}>Messages, plans, and records in one calm place.</Text>
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
        <Text style={styles.heading}>Today</Text>
        <SummaryRow label="Upcoming events" value={String(events.length)} />
        <SummaryRow label="Saved records" value="0" />
        <SummaryRow label="Messages sent this session" value={String(sentMessages.length)} />
        <SummaryRow label="Family connection" value={invitationGrant ? "Connected" : "Not connected"} />
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
          "PeacePad invitation",
          "Review the access before you connect.",
          `Code: ${createdInvitation.code}`,
          createdInvitation.deepLink
        ].join("\n\n")
      });
    } catch {
      setShareError("Sharing is unavailable. Use the six-character code instead.");
    }
  };

  return (
    <View style={styles.stack}>
      <AccessibleHeading style={styles.title}>Family connection</AccessibleHeading>
      <Text style={styles.body}>Invite a co-parent or enter a code you received.</Text>

      <View accessibilityLabel="Invitation action" accessibilityRole="tablist" style={styles.segmented}>
        <Pressable
          accessibilityLabel="Invite someone"
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "create" }}
          onPress={() => setMode("create")}
          style={[styles.segment, mode === "create" ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentText, mode === "create" ? styles.segmentTextActive : null]}>Invite someone</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Enter a code"
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === "join" }}
          onPress={() => setMode("join")}
          style={[styles.segment, mode === "join" ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentText, mode === "join" ? styles.segmentTextActive : null]}>Enter a code</Text>
        </Pressable>
      </View>

      {mode === "create" ? (
        <View accessibilityLabel="Create family invitation" style={styles.card}>
          <Text style={styles.heading}>Invite a co-parent</Text>
          <Text style={styles.body}>They will review your name, the shared space, and access before connecting.</Text>
          <Text style={styles.fieldLabel}>Access</Text>
          <Text style={styles.body}>• Messages</Text>
          <Text style={styles.body}>• Calendar</Text>
          <Text style={styles.body}>• Shared records</Text>

          {!createdInvitation ? (
            <LabButton
              disabled={invitationBusy}
              label={invitationBusy ? "Creating…" : "Create invitation"}
              onPress={() => void createInvitation()}
            />
          ) : (
            <View accessibilityLabel="Invitation ready" style={styles.stackTight}>
              <Text style={styles.fieldLabel}>Invitation code</Text>
              <Text accessibilityLabel={`Invitation code ${createdInvitation.code}`} style={styles.invitationCode}>
                {createdInvitation.code}
              </Text>
              <View
                accessibilityHint="Scanning opens the invitation review screen. It does not connect anyone automatically."
                accessibilityLabel="Scannable invitation QR"
                accessibilityRole="image"
                style={styles.qrCard}
              >
                <InvitationQr value={createdInvitation.deepLink} />
                <Text style={styles.qrLabel}>Scan to review access</Text>
              </View>
              <Text style={styles.caption}>Single use • expires in 72 hours</Text>
              <LabButton label="Share invitation" onPress={() => void shareCreatedInvitation()} />
              <LabButton
                disabled={invitationBusy}
                label={invitationBusy ? "Cancelling…" : "Cancel invitation"}
                onPress={() => void revokeCreatedInvitation()}
                variant="secondary"
              />
            </View>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.body}>Enter the six-character code from your invitation.</Text>
          <TextInput
            accessibilityLabel="Invitation code"
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
            label={invitationBusy ? "Checking…" : "Review invitation"}
            onPress={() => void resolveInvitation()}
          />
        </>
      )}

      {invitationError ? <Text accessibilityRole="alert" style={styles.error}>{invitationError}</Text> : null}
      {shareError ? <Text accessibilityRole="alert" style={styles.error}>{shareError}</Text> : null}

      {invitationPreview ? (
        <View accessibilityLabel="Invitation preview" style={styles.card}>
          <Text style={styles.heading}>{invitationPreview.inviterDisplayName} invited you</Text>
          <Text style={styles.body}>{invitationPreview.familyDisplayName}</Text>
          <Text style={styles.fieldLabel}>Role</Text>
          <Text style={styles.body}>{invitationPreview.invitedRole}</Text>
          <Text style={styles.fieldLabel}>Access</Text>
          {invitationPreview.permissions.map((permission) => (
            <Text key={permission} style={styles.body}>• {permission.replace(/-/g, " ")}</Text>
          ))}
          <Text style={styles.caption}>Nothing is shared until you accept.</Text>
          {connectedInvitationAcceptanceBlocked ? (
            <Text accessibilityRole="alert" style={styles.caption}>
              This account is already connected to a family. Family switching is not available yet, so this invitation cannot be accepted here.
            </Text>
          ) : (
            <LabButton disabled={invitationBusy} label="Accept invitation" onPress={() => void acceptInvitation()} />
          )}
          <LabButton disabled={invitationBusy} label="Decline" onPress={() => void declineInvitation()} variant="secondary" />
        </View>
      ) : null}

      {invitationGrant ? (
        <View accessibilityLabel="Invitation accepted" style={styles.successCard}>
          <Text style={styles.heading}>You’re connected</Text>
          <Text style={styles.body}>Your approved family access is now active.</Text>
        </View>
      ) : null}
    </View>
  );
}

export function CalendarScreen() {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);
  const { locale } = useLocalization();
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

      <View style={styles.card}>
        <Text style={styles.heading}>{calendarText(locale, "calendars")}</Text>
        {layers.map((layer) => {
          const visible = visibleLayerIds.includes(layer.id);
          const shared = layer.visibility.scope !== "private";
          return (
            <View key={layer.id} style={[styles.layerRow, largeText ? styles.layerRowLargeText : null]}>
              <Pressable
                accessibilityLabel={`${visible ? "Hide" : "Show"} ${layer.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: visible }}
                onPress={() => toggleLayerFilter(layer.id)}
                style={styles.layerIdentity}
              >
                <View style={[styles.layerDot, { backgroundColor: layerColors[layer.colorToken] }]} />
                <View style={styles.layerCopy}>
                  <Text style={styles.actionTitle}>{layer.name}</Text>
                  <Text style={styles.caption}>{shared ? "Shared with family" : "Private"}</Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityLabel={`${shared ? "Make private" : "Share"} ${layer.name}`}
                accessibilityRole="button"
                onPress={() => shared ? void setLayerShared(layer.id, false) : setPendingShareLayerId(layer.id)}
                style={styles.smallButton}
              >
                <Text style={styles.smallButtonText}>{shared ? "Private" : "Share"}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {pendingShareLayerId ? (
        <View accessibilityRole="alert" style={styles.confirmCard}>
          <Text style={styles.heading}>Share this calendar?</Text>
          <Text style={styles.body}>Future events in this calendar will be visible to family participants.</Text>
          <LabButton label="Confirm sharing" onPress={() => {
            void setLayerShared(pendingShareLayerId, true);
            setPendingShareLayerId(undefined);
          }} />
          <LabButton label="Keep private" onPress={() => setPendingShareLayerId(undefined)} variant="secondary" />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.heading}>Add event</Text>
        <TextInput accessibilityLabel="Event title" onChangeText={setEventTitle} placeholder="Event title" style={styles.input} value={eventTitle} />
        <Text style={styles.fieldLabel}>Calendar</Text>
        <View style={styles.wrap}>
          {layers.map((layer) => (
            <Pressable
              accessibilityLabel={`Use ${layer.name} calendar`}
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
        <LabButton label="Save event" disabled={!eventTitle.trim()} onPress={() => {
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
              <Text style={styles.body}>Delete this event? Shared participants may lose access to it.</Text>
              <LabButton label="Confirm delete" onPress={() => { void deleteEvent(event.id); setPendingDeleteEventId(undefined); }} />
              <LabButton label="Cancel" onPress={() => setPendingDeleteEventId(undefined)} variant="secondary" />
            </View>
          ) : (
            <LabButton label="Delete event" onPress={() => setPendingDeleteEventId(event.id)} variant="secondary" />
          )}
        </View>
      ))}
    </View>
  );
}

export function MessagesScreen() {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);
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
      <AccessibleHeading style={styles.title}>Messages</AccessibleHeading>
      <Text style={styles.body}>Write to your co-parent. PeacePad never sends without your confirmation.</Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Find a message</Text>
        <TextInput
          accessibilityLabel="Search messages"
          autoCapitalize="none"
          onChangeText={setMessageSearchQuery}
          placeholder="Search this conversation"
          returnKeyType="search"
          onSubmitEditing={() => void searchMessages()}
          style={styles.input}
          value={messageSearchQuery}
        />
        <LabButton
          disabled={messageSearchQuery.trim().length < 2 || messageSearchBusy}
          label={messageSearchBusy ? "Searching..." : "Search"}
          onPress={() => void searchMessages()}
          variant="secondary"
        />
        {messageSearchError ? <Text accessibilityRole="alert" style={styles.error}>{messageSearchError}</Text> : null}
        {messageSearchResults.map((result) => (
          <View accessibilityLabel="Message search result" key={result.originalMessageEventId} style={styles.searchResult}>
            <Text style={styles.body}>{result.body}</Text>
            {result.corrected ? <Text style={styles.caption}>Corrected</Text> : null}
          </View>
        ))}
      </View>

      {!messageCheckEnabled ? (
        <View style={styles.assistCard}>
          <Text style={styles.heading}>Message Check</Text>
          <Text style={styles.body}>Get suggestions for clarity and tone before you send. You choose what changes.</Text>
          <LabButton
            disabled={!messageCheckHydrated || messageCheckBusy}
            label={!messageCheckHydrated ? "Message Check unavailable" : messageCheckBusy ? "Updating..." : "Turn on"}
            onPress={() => void setMessageCheckEnabled(true)}
          />
          <LabButton label="Not now" onPress={() => setShowHowItWorks(false)} variant="secondary" />
          <Pressable
            accessibilityLabel="How Message Check works"
            accessibilityRole="button"
            accessibilityState={{ expanded: showHowItWorks }}
            onPress={() => setShowHowItWorks((current) => !current)}
            style={styles.linkButton}
          >
            <Text style={styles.link}>How it works</Text>
          </Pressable>
          {showHowItWorks ? (
            <Text style={styles.caption}>The first version uses rule-based checks. Optional AI assistance remains separate and off.</Text>
          ) : null}
        </View>
      ) : (
        <View style={[styles.enabledRow, largeText ? styles.enabledRowLargeText : null]}>
          <Text style={styles.successText}>Message Check on</Text>
          <Pressable
            accessibilityLabel="Turn off Message Check"
            accessibilityRole="button"
            accessibilityState={{ disabled: !messageCheckHydrated || messageCheckBusy }}
            disabled={!messageCheckHydrated || messageCheckBusy}
            onPress={() => void setMessageCheckEnabled(false)}
            style={styles.linkButton}
          >
            <Text style={styles.link}>Turn off</Text>
          </Pressable>
        </View>
      )}

      {sentMessages.map((message) => (
        <View accessibilityLabel="Sent message" key={message.id} style={styles.sentBubble}>
          <Text style={styles.body}>{message.sentBody}</Text>
          {message.canCorrect && message.status !== "waiting" && correctingMessageId !== message.id ? (
            <LabButton label="Correct message" onPress={() => startCorrection(message.id)} variant="secondary" />
          ) : null}
          {correctingMessageId === message.id ? (
            <View accessibilityLabel="Message correction editor" style={styles.stack}>
              <Text style={styles.caption}>The original remains in the record.</Text>
              <TextInput
                accessibilityLabel="Correction wording"
                multiline
                onChangeText={setCorrectionDraft}
                style={[styles.input, styles.messageInput]}
                value={correctionDraft}
              />
              {correctionError ? <Text accessibilityRole="alert" style={styles.error}>{correctionError}</Text> : null}
              <LabButton disabled={correctionBusy} label={correctionBusy ? "Saving..." : "Save correction"} onPress={() => void saveCorrection()} />
              <LabButton disabled={correctionBusy} label="Cancel correction" onPress={cancelCorrection} variant="secondary" />
            </View>
          ) : null}
          {message.queued && message.status === "needs-action" ? (
            <View accessibilityLabel="Queued message recovery" style={styles.stack}>
              <Text style={styles.caption}>This message is still stored on this device and has not been confirmed as sent.</Text>
              <LabButton
                disabled={queuedActionBusyIds.includes(message.id)}
                label={queuedActionBusyIds.includes(message.id) ? "Trying..." : "Try again"}
                onPress={() => void retryQueuedMessage(message.id)}
              />
              {removeQueuedMessageId === message.id ? (
                <View accessibilityRole="alert" style={styles.confirmCard}>
                  <Text style={styles.body}>Removing this copy stops this device from retrying. It does not recall a message that may already have been received.</Text>
                  <LabButton
                    disabled={queuedActionBusyIds.includes(message.id)}
                    label="Remove from this device"
                    onPress={() => {
                      setRemoveQueuedMessageId(undefined);
                      void removeQueuedMessage(message.id);
                    }}
                  />
                  <LabButton label="Keep message" onPress={() => setRemoveQueuedMessageId(undefined)} variant="secondary" />
                </View>
              ) : (
                <LabButton
                  disabled={queuedActionBusyIds.includes(message.id)}
                  label="Remove from this device"
                  onPress={() => setRemoveQueuedMessageId(message.id)}
                  variant="secondary"
                />
              )}
            </View>
          ) : null}
          <Text style={styles.caption}>{message.corrected ? "Corrected · " : ""}{message.status === "waiting" ? "Waiting to send" : message.status === "needs-action" ? "Needs attention" : message.status}</Text>
        </View>
      ))}

      {queuedActionError ? <Text accessibilityRole="alert" style={styles.error}>{queuedActionError}</Text> : null}

      <TextInput
        accessibilityLabel="Message draft"
        multiline
        onChangeText={setMessageDraft}
        placeholder="Write a message"
        style={[styles.input, styles.messageInput]}
        value={messageDraft}
      />

      {messageCheckEnabled ? (
        <LabButton disabled={!messageDraft.trim() || messageCheckBusy} label={messageCheckBusy ? "Checking…" : "Check message"} onPress={() => void checkMessage()} />
      ) : null}

      {messagePreview ? (
        <View accessibilityLabel="Message Check result" style={styles.assistCard}>
          <Text style={styles.heading}>{messagePreview.tone}</Text>
          <Text style={styles.body}>{messagePreview.summary}</Text>
          {messagePreview.rewordingSuggestion ? (
            <>
              <Text style={styles.fieldLabel}>Suggested wording</Text>
              <Text style={styles.body}>{messagePreview.rewordingSuggestion}</Text>
              <LabButton label="Send suggested message" onPress={() => void sendMessage(true)} />
            </>
          ) : null}
          <LabButton label="Send original" onPress={() => void sendMessage(false)} variant="secondary" />
        </View>
      ) : null}

      {messageError ? (
        <View accessibilityRole="alert" style={styles.confirmCard}>
          <Text style={styles.error}>{messageError}</Text>
          {messageCheckEnabled && messageDraft.trim() ? <LabButton label="Check again" onPress={() => void checkMessage()} /> : null}
          {messageDraft.trim() ? <LabButton label="Send original" onPress={() => void sendMessage(false)} variant="secondary" /> : null}
        </View>
      ) : null}

      {!messageCheckEnabled && messageDraft.trim() ? (
        <LabButton label="Send message" onPress={() => void sendMessage(false)} />
      ) : null}
    </View>
  );
}

export function RecordsHomeScreen({ setScreen }: { setScreen: Navigate }) {
  const { locale } = useLocalization();
  const { events, sentMessages } = useCoordinationState();
  const { archiveBinder, binder, binders, attachmentIntent, busy, createBinder, error: recordsError, linkTimelineSource, loading, prepareAttachment, reload, selectBinder, timelineEntries } = useRecordsState();
  const [binderName, setBinderName] = useState("");
  const [childLabel, setChildLabel] = useState("");
  const [fileName, setFileName] = useState("");
  const [mediaType, setMediaType] = useState<AttachmentMediaType>("application/pdf");
  const [byteLength, setByteLength] = useState("");
  const [error, setError] = useState<string>();

  const saveBinder = async () => {
    if (binderName.trim().length < 3) { setError("Enter a Case Binder name."); return; }
    if (childLabel.trim().length < 2) { setError("Enter a child label."); return; }
    setError(undefined);
    try { await createBinder(binderName, childLabel); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Check the Case Binder details."); }
  };
  const prepare = async () => {
    setError(undefined);
    try {
      await prepareAttachment({ originalFileName: fileName, mediaType, byteLength: Number(byteLength) });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Check the attachment details."); }
  };
  const linkSource = async (kind: "message-event" | "schedule-event", sourceId: string) => {
    setError(undefined);
    try { await linkTimelineSource(kind, sourceId); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "PeacePad could not link this source."); }
  };
  const linkedSourceIds = new Set(timelineEntries.map((entry) => entry.source.sourceId));
  const messageCandidate = sentMessages.find((message) => !message.queued && !linkedSourceIds.has(message.id));
  const eventCandidate = events.find((event) => !linkedSourceIds.has(event.id));
  return (
    <View style={styles.stack}>
      <AccessibleHeading style={styles.title}>Records</AccessibleHeading>
      {loading ? <View style={styles.card}><Text style={styles.heading}>Opening Records</Text><Text style={styles.body}>Loading your private Case Binders.</Text></View> : null}
      {!loading && binders.length > 1 ? <View style={styles.card}>
        <Text style={styles.heading}>Your Case Binders</Text>
        {binders.filter((candidate) => candidate.status === "active").map((candidate) => (
          <Pressable accessibilityRole="button" key={candidate.id} onPress={() => selectBinder(candidate.id)} style={styles.actionCard}>
            <Text style={styles.actionTitle}>{candidate.name}</Text>
            <Text style={styles.caption}>{candidate.childLabel} · Private</Text>
          </Pressable>
        ))}
      </View> : null}
      {!loading && !binder ? <View style={styles.card}>
        <Text style={styles.heading}>Create a Case Binder</Text>
        <Text style={styles.body}>Keep private records organized by family and child.</Text>
        <TextInput accessibilityLabel="Binder name" onChangeText={setBinderName} placeholder="Binder name" style={styles.input} value={binderName} />
        <TextInput accessibilityLabel="Child label" onChangeText={setChildLabel} placeholder="Child label" style={styles.input} value={childLabel} />
        <LabButton disabled={busy} label={busy ? "Creating..." : "Create Case Binder"} onPress={() => void saveBinder()} />
      </View> : !loading && binder ? <View style={styles.card}>
        <Text style={styles.heading}>{binder.name}</Text>
        <Text style={styles.caption}>{binder.childLabel} - Private</Text>
        <Text style={styles.fieldLabel}>Private timeline</Text>
        {timelineEntries.length === 0 ? <Text style={styles.caption}>No sources linked yet.</Text> : timelineEntries.map((entry) => (
          <View accessibilityLabel={`${entry.source.kind === "message-event" ? "Message" : "Calendar event"} timeline entry`} key={entry.id} style={styles.successCard}>
            <Text style={styles.heading}>{entry.source.kind === "message-event" ? "Message" : "Calendar event"}</Text>
            <Text style={styles.caption}>{formatLocalizedDate(locale, entry.occurredAt, { dateStyle: "medium", timeStyle: "short" })}</Text>
          </View>
        ))}
        {messageCandidate ? <LabButton disabled={busy} label="Link latest message" onPress={() => void linkSource("message-event", messageCandidate.id)} variant="secondary" /> : null}
        {eventCandidate ? <LabButton disabled={busy} label="Link next calendar event" onPress={() => void linkSource("schedule-event", eventCandidate.id)} variant="secondary" /> : null}
        <Text style={styles.fieldLabel}>Prepare attachment details</Text>
        <TextInput accessibilityLabel="Original file name" onChangeText={setFileName} placeholder="school-note.pdf" style={styles.input} value={fileName} />
        <TextInput accessibilityLabel="Media type" onChangeText={(value) => setMediaType(value as AttachmentMediaType)} placeholder="application/pdf" style={styles.input} value={mediaType} />
        <TextInput accessibilityLabel="File size in bytes" keyboardType="number-pad" onChangeText={setByteLength} placeholder="1200" style={styles.input} value={byteLength} />
        <LabButton disabled={busy} label={busy ? "Preparing..." : "Prepare details"} onPress={() => void prepare()} />
        {attachmentIntent ? <View accessibilityLabel="Attachment details prepared" style={styles.successCard}>
          <Text style={styles.heading}>Details prepared</Text>
          <Text style={styles.body}>{attachmentIntent.originalFileName}</Text>
          <Text style={styles.caption}>No file was uploaded.</Text>
        </View> : null}
        <LabButton disabled={busy} label="Archive Case Binder" onPress={() => void archiveBinder().catch(() => undefined)} variant="secondary" />
      </View> : null}
      {error || recordsError ? <Text accessibilityRole="alert" style={styles.error}>{error ?? recordsError}</Text> : null}
      {recordsError && !loading ? <LabButton label="Try again" onPress={() => void reload()} variant="secondary" /> : null}
      <Pressable accessibilityRole="button" onPress={() => setScreen("home")} style={styles.actionCard}>
        <Text style={styles.actionTitle}>Return home</Text>
        <Text style={styles.caption}>Choose another task.</Text>
      </Pressable>
    </View>
  );
}

export function MoreScreen({ setScreen }: { setScreen: Navigate }) {
  const accountActions = useOptionalStagingAccountActions();
  const { locale, setLocale, t } = useLocalization();
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>{t("more.support.title")}</Text>
        <Text style={styles.caption}>{t("more.support.body")}</Text>
      </View>
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
      {accountActions ? confirmDelete ? <View accessibilityLiveRegion="assertive" accessibilityRole="alert" accessibilityViewIsModal style={styles.confirmCard}>
        <AccessibleHeading style={styles.actionTitle}>{t("account.deleteTitle")}</AccessibleHeading>
        <Text style={styles.caption}>{t("account.deleteWarning")}</Text>
        <LabButton disabled={accountActions.deleting} label={accountActions.deleting ? t("account.deleting") : t("account.deletePermanently")} onPress={() => void accountActions.deleteAccount().catch(() => undefined)} />
        <LabButton disabled={accountActions.deleting} label={t("account.cancel")} onPress={() => setConfirmDelete(false)} variant="secondary" />
        {accountActions.error ? <Text accessibilityRole="alert" style={styles.error}>{accountActions.error}</Text> : null}
      </View> : <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} style={styles.actionCard}>
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
