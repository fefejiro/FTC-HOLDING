import React, { useEffect, useState } from "react";
import { Image, Pressable, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { InvitationQr } from "../components/InvitationQr";
import { LabButton } from "../components/LabButton";
import type { LabScreen } from "../screens";
import { useLabState } from "../state/LabState";
import { colors, spacing, typography, usesLargeTextLayout } from "../theme";
import { useCoordinationState, type CalendarView } from "./CoordinationState";

type Navigate = (screen: LabScreen) => void;

const layerColors: Record<string, string> = {
  teal: "#24B9B5",
  violet: "#8B5CF6",
  amber: "#F59E0B",
  rose: "#EF476F",
  blue: "#3B82F6",
  green: "#62B44B"
};

const august2026Weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const august2026Week = [
  { day: 1, label: "Sat 1" },
  { day: 2, label: "Sun 2" },
  { day: 3, label: "Mon 3" },
  { day: 4, label: "Tue 4" },
  { day: 5, label: "Wed 5" },
  { day: 6, label: "Thu 6" },
  { day: 7, label: "Fri 7" }
] as const;

function eventDay(event: ReturnType<typeof useCoordinationState>["events"][number]): number {
  return new Date(event.startsAt).getUTCDate();
}

function CalendarViewPanel({
  calendarView,
  events,
  layers
}: {
  calendarView: CalendarView;
  events: ReturnType<typeof useCoordinationState>["events"];
  layers: ReturnType<typeof useCoordinationState>["layers"];
}) {
  const layerName = (calendarLayerId: string) =>
    layers.find((layer) => layer.id === calendarLayerId)?.name ?? "Calendar";

  if (calendarView === "month") {
    const cells: readonly { key: string; day?: number }[] = [
      ...Array.from({ length: 6 }, (_, index) => ({ key: `blank-${index}` })),
      ...Array.from({ length: 31 }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 }))
    ];
    return (
      <View accessibilityLabel="month calendar" style={styles.calendarCanvas}>
        <Text style={styles.calendarMonth}>August 2026</Text>
        <View style={styles.monthGrid}>
          {august2026Weekdays.map((weekday) => (
            <Text key={weekday} style={styles.weekday}>{weekday}</Text>
          ))}
          {cells.map((cell) => {
            const dayEvents = cell.day ? events.filter((event) => eventDay(event) === cell.day) : [];
            return (
              <View accessibilityLabel={cell.day ? `August ${cell.day}` : undefined} key={cell.key} style={styles.monthCell}>
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
      <View accessibilityLabel="week calendar" style={styles.calendarCanvas}>
        <Text style={styles.calendarMonth}>August 1–7</Text>
        <View style={styles.scheduleList}>
          {august2026Week.map(({ day, label }) => {
            const dayEvents = events.filter((event) => eventDay(event) === day);
            return (
              <View key={day} style={styles.scheduleRow}>
                <Text style={styles.scheduleDate}>{label}</Text>
                <View style={styles.scheduleContent}>
                  {dayEvents.length ? dayEvents.map((event) => (
                    <View key={event.id} style={styles.scheduleEvent}>
                      <Text style={styles.actionTitle}>{event.title}</Text>
                      <Text style={styles.caption}>{layerName(event.calendarLayerId)}</Text>
                    </View>
                  )) : <Text style={styles.caption}>No events</Text>}
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
    <View accessibilityLabel="day calendar" style={styles.calendarCanvas}>
      <Text style={styles.calendarMonth}>Saturday, August 1</Text>
      <View style={styles.scheduleList}>
        {dayEvents.length ? dayEvents.map((event) => (
          <View key={event.id} style={styles.scheduleEvent}>
            <Text style={styles.actionTitle}>{event.title}</Text>
            <Text style={styles.caption}>{layerName(event.calendarLayerId)}</Text>
          </View>
        )) : <Text style={styles.calendarEmpty}>No events yet</Text>}
      </View>
    </View>
  );
}

export function CoordinationHomeScreen({ setScreen }: { setScreen: Navigate }) {
  const largeText = usesLargeTextLayout(useWindowDimensions().fontScale);
  const { binder, evidence, timelineEntry } = useLabState();
  const { events, invitationGrant, sentMessages } = useCoordinationState();
  const recordCount = [binder, evidence, timelineEntry].filter(Boolean).length;

  const actions: readonly { label: string; detail: string; route: LabScreen }[] = [
    { label: "Send a message", detail: "Write clearly and review before sending.", route: "messages" },
    { label: "Add an event", detail: "Keep parenting plans and activities together.", route: "calendar" },
    { label: "Invite co-parent", detail: "Connect only after reviewing access.", route: "invite" },
    { label: "Add a record", detail: "Organize notes and source details.", route: "vault" }
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.brandHero}>
        <Image accessibilityLabel="PeacePad conch logo" source={require("../foundation/peacepad-conch.png")} style={styles.logo} />
        <View style={styles.brandHeroCopy}>
          <Text style={styles.title}>What would you like to do?</Text>
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
        <SummaryRow label="Saved records" value={String(recordCount)} />
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
      <Text style={styles.title}>Family connection</Text>
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
          <LabButton label="Accept invitation" onPress={() => void acceptInvitation()} />
          <LabButton label="Decline" onPress={() => void declineInvitation()} variant="secondary" />
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
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.body}>See parenting plans, requests, activities, and calls.</Text>
        </View>
      </View>

      <View accessibilityLabel="Calendar view" accessibilityRole="tablist" style={styles.segmented}>
        {views.map((view) => (
          <Pressable
            accessibilityLabel={`${view[0].toUpperCase() + view.slice(1)} calendar view`}
            accessibilityRole="tab"
            accessibilityState={{ selected: calendarView === view }}
            key={view}
            onPress={() => setCalendarView(view)}
            style={[styles.segment, calendarView === view ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, calendarView === view ? styles.segmentTextActive : null]}>
              {view[0].toUpperCase() + view.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <CalendarViewPanel calendarView={calendarView} events={visibleEvents} layers={layers} />

      <View style={styles.card}>
        <Text style={styles.heading}>Calendars</Text>
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
    checkMessage,
    messageCheckBusy,
    messageCheckEnabled,
    messageDraft,
    messageError,
    messagePreview,
    sendMessage,
    sentMessages,
    setMessageCheckEnabled,
    setMessageDraft
  } = useCoordinationState();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <View style={styles.stack}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.body}>Write to your co-parent. PeacePad never sends without your confirmation.</Text>

      {!messageCheckEnabled ? (
        <View style={styles.assistCard}>
          <Text style={styles.heading}>Message Check</Text>
          <Text style={styles.body}>Get suggestions for clarity and tone before you send. You choose what changes.</Text>
          <LabButton label="Turn on" onPress={() => void setMessageCheckEnabled(true)} />
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
        </View>
      ))}

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
              <LabButton label="Send suggested message" onPress={() => sendMessage(true)} />
            </>
          ) : null}
          <LabButton label="Send original" onPress={() => sendMessage(false)} variant="secondary" />
        </View>
      ) : null}

      {messageError ? (
        <View accessibilityRole="alert" style={styles.confirmCard}>
          <Text style={styles.error}>{messageError}</Text>
          <LabButton label="Try again" onPress={() => void checkMessage()} />
          <LabButton label="Send original" onPress={() => sendMessage(false)} variant="secondary" />
        </View>
      ) : null}

      {!messageCheckEnabled && messageDraft.trim() ? (
        <LabButton label="Send message" onPress={() => sendMessage(false)} />
      ) : null}
    </View>
  );
}

export function RecordsHomeScreen({ setScreen }: { setScreen: Navigate }) {
  const { binder, evidence, timelineEntry } = useLabState();
  const actions: readonly { label: string; detail: string; route: LabScreen }[] = [
    { label: binder ? "Open binder" : "Create a binder", detail: "Keep related records together.", route: "binder" },
    { label: "Add record details", detail: evidence ? "Review or update your saved record." : "Add dates, sources, and notes.", route: "vault" },
    { label: "Timeline", detail: timelineEntry ? "Review your latest linked entry." : "Confirmed records appear here.", route: "timeline" },
    { label: "Export preview", detail: "Choose what to include before sharing.", route: "export" }
  ];
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>Records</Text>
      <Text style={styles.body}>Organize information before you share it.</Text>
      {actions.map((action) => (
        <Pressable accessibilityRole="button" key={action.label} onPress={() => setScreen(action.route)} style={styles.actionCard}>
          <Text style={styles.actionTitle}>{action.label}</Text>
          <Text style={styles.caption}>{action.detail}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function MoreScreen({ setScreen }: { setScreen: Navigate }) {
  return (
    <View style={styles.stack}>
      <Text style={styles.title}>More</Text>
      <Pressable accessibilityRole="button" onPress={() => setScreen("invite")} style={styles.actionCard}>
        <Text style={styles.actionTitle}>Family connection</Text>
        <Text style={styles.caption}>Review or enter an invitation.</Text>
      </Pressable>
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Privacy and consent</Text>
        <Text style={styles.caption}>Review your choices and how PeacePad handles information.</Text>
      </View>
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Plans & Billing</Text>
        <Text style={styles.caption}>Manage access when subscriptions become available.</Text>
      </View>
      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Help & Support</Text>
        <Text style={styles.caption}>Get help using PeacePad.</Text>
      </View>
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
  pressed: { opacity: 0.72 },
  summaryCard: { backgroundColor: colors.brand, borderRadius: 24, gap: spacing.sm, padding: spacing.lg },
  summaryRow: { alignItems: "center", borderTopColor: "rgba(255,255,255,0.16)", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm },
  summaryValue: { ...typography.body, color: colors.white, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  successCard: { backgroundColor: "#E9F9F4", borderColor: "#B8E8D9", borderRadius: 22, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  confirmCard: { backgroundColor: "#FFF7E8", borderColor: "#F3D398", borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  assistCard: { backgroundColor: colors.brandSoft, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  codeInput: { ...typography.title, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, color: colors.text, letterSpacing: 12, padding: spacing.lg, textAlign: "center" },
  invitationCode: { ...typography.heading, color: colors.brand, letterSpacing: 8, textAlign: "center" },
  qrCard: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  qrLabel: { ...typography.caption, color: colors.text, fontWeight: "800" },
  error: { ...typography.body, color: "#B42318", fontWeight: "700" },
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
  chipTextActive: { color: colors.white },
  enabledRow: { alignItems: "center", backgroundColor: "#E9F9F4", borderRadius: 18, flexDirection: "row", justifyContent: "space-between", padding: spacing.md },
  enabledRowLargeText: { alignItems: "stretch", flexDirection: "column", gap: spacing.sm },
  successText: { ...typography.body, color: "#087A64", fontWeight: "800" },
  link: { ...typography.body, color: colors.brand, fontWeight: "800", textAlign: "center" },
  linkButton: { alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: spacing.sm },
  sentBubble: { alignSelf: "flex-end", backgroundColor: colors.brandSoft, borderRadius: 20, maxWidth: "86%", padding: spacing.md }
});
