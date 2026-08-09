import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { MessagePreviewResponse } from "../api/contracts";
import {
  InvitationError,
  type CreatedInvitation,
  type MessageSearchResult,
  type PeacePadCoordinationApi
} from "../api/CoordinationApi";
import { defaultCalendarLayers, SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import {
  MAX_OUTBOX_BODY_LENGTH,
  isTransientMessageError,
  secureMessageOutboxStore,
  type MessageOutboxStore
} from "../messaging/secureMessageOutbox";
import {
  createWriteContext,
  type CalendarLayer,
  type EntityId,
  type InvitationPreview,
  type MessageCheckPreference,
  type MessageEvent,
  type ParticipantGrant,
  type ScheduleEvent
} from "../domain/v2";
import { colors, spacing } from "../theme";

declare const process: {
  env?: Record<string, string | undefined>;
};

export type CalendarView = "month" | "week" | "day";

export function resolveCalendarStartView(value?: string): CalendarView {
  return value === "week" || value === "day" ? value : "month";
}

export type SentMessage = Readonly<{
  id: string;
  originalBody: string;
  sentBody: string;
  sentAt: string;
  status: "waiting" | "sent" | "delivered" | "viewed";
  corrected: boolean;
  canCorrect: boolean;
}>;

type CoordinationStateValue = {
  coordinationHydrated: boolean;
  invitationCode: string;
  createdInvitation?: CreatedInvitation;
  invitationPreview?: InvitationPreview;
  invitationGrant?: ParticipantGrant;
  invitationError?: string;
  invitationBusy: boolean;
  calendarView: CalendarView;
  layers: readonly CalendarLayer[];
  visibleLayerIds: readonly string[];
  events: readonly ScheduleEvent[];
  messageCheckEnabled: boolean;
  messageCheckHydrated: boolean;
  messageDraft: string;
  messagePreview?: MessagePreviewResponse;
  messageCheckBusy: boolean;
  messageError?: string;
  sentMessages: readonly SentMessage[];
  messageSearchQuery: string;
  messageSearchResults: readonly MessageSearchResult[];
  messageSearchBusy: boolean;
  messageSearchError?: string;
  correctingMessageId?: string;
  correctionDraft: string;
  correctionBusy: boolean;
  correctionError?: string;
  setInvitationCode: (code: string) => void;
  createInvitation: () => Promise<void>;
  revokeCreatedInvitation: () => Promise<void>;
  resolveInvitation: () => Promise<void>;
  acceptInvitation: () => Promise<void>;
  declineInvitation: () => Promise<void>;
  setCalendarView: (view: CalendarView) => void;
  toggleLayerFilter: (layerId: string) => void;
  setLayerShared: (layerId: string, shared: boolean) => Promise<void>;
  addEvent: (input: { layerId: string; title: string; startsAt: string; endsAt: string }) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  setMessageDraft: (draft: string) => void;
  setMessageCheckEnabled: (enabled: boolean) => Promise<void>;
  checkMessage: () => Promise<void>;
  sendMessage: (useSuggestion: boolean) => Promise<void>;
  setMessageSearchQuery: (query: string) => void;
  searchMessages: () => Promise<void>;
  startCorrection: (messageId: string) => void;
  cancelCorrection: () => void;
  setCorrectionDraft: (draft: string) => void;
  saveCorrection: () => Promise<void>;
};

const CoordinationStateContext = createContext<CoordinationStateValue | undefined>(undefined);

export type CoordinationRuntime = Readonly<{
  actorIdentityId: EntityId;
  identityVersion: number;
  sessionId: EntityId;
  familyCircleId: EntityId;
  participantGrantId: EntityId;
  conversationId: EntityId;
  region: "ca" | "us";
}>;

const DEMO_RUNTIME: CoordinationRuntime = {
  actorIdentityId: "identity-current",
  identityVersion: 1,
  sessionId: "verified-device-session",
  familyCircleId: "family-current",
  participantGrantId: "grant-current",
  conversationId: "conversation-primary",
  region: "ca"
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidCoordinationRuntime(runtime?: CoordinationRuntime | null): runtime is CoordinationRuntime {
  return Boolean(runtime
    && UUID_PATTERN.test(runtime.actorIdentityId)
    && Number.isInteger(runtime.identityVersion)
    && runtime.identityVersion >= 1
    && UUID_PATTERN.test(runtime.sessionId)
    && UUID_PATTERN.test(runtime.familyCircleId)
    && UUID_PATTERN.test(runtime.participantGrantId)
    && UUID_PATTERN.test(runtime.conversationId)
    && (runtime.region === "ca" || runtime.region === "us"));
}

const seededInvitation: InvitationPreview = {
  invitationId: "invitation-demo",
  version: 1,
  inviterDisplayName: "Jordan",
  familyDisplayName: "Shared parenting space",
  invitedRole: "parent",
  permissions: ["messages", "calendar", "shared-records"],
  expiresAt: "2099-01-01T00:00:00.000Z"
};

function createDefaultApi(): PeacePadCoordinationApi {
  return new SyntheticCoordinationApi([{ code: "CALM26", preview: seededInvitation }]);
}

function writeContext(runtime: CoordinationRuntime, expectedVersion: number | null = null) {
  return createWriteContext({
    idempotencyKey: `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    expectedVersion,
    region: runtime.region,
    actor: { identityId: runtime.actorIdentityId, sessionId: runtime.sessionId }
  });
}

function invitationMessage(error: unknown): string {
  if (error instanceof InvitationError) return error.message;
  return "PeacePad could not verify that invitation. Try again.";
}

export function visibleMessages(events: readonly MessageEvent[], actorIdentityId: string): readonly SentMessage[] {
  return events.filter((event) => event.eventType === "sent" && event.body).map((message) => {
    const lifecycle = events.filter((event) => event.originalMessageEventId === message.id);
    const corrections = lifecycle
      .filter((event) => event.eventType === "correction" && event.body)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id));
    const effective = corrections[corrections.length - 1] ?? message;
    const status = lifecycle.some((event) => event.eventType === "viewed")
      ? "viewed" as const
      : lifecycle.some((event) => event.eventType === "delivered")
        ? "delivered" as const
        : "sent" as const;
    return {
      id: message.id,
      originalBody: message.body ?? "",
      sentBody: effective.body ?? "",
      sentAt: message.occurredAt,
      status,
      corrected: effective.id !== message.id,
      canCorrect: message.provenance.createdBy.identityId === actorIdentityId
    };
  });
}

export function CoordinationStateProvider({
  api,
  children,
  initialCalendarView = resolveCalendarStartView(process.env?.EXPO_PUBLIC_PEACEPAD_LAB_START_CALENDAR_VIEW),
  outbox = secureMessageOutboxStore,
  runtime
}: {
  api?: PeacePadCoordinationApi;
  children: ReactNode;
  initialCalendarView?: CalendarView;
  outbox?: MessageOutboxStore;
  runtime?: CoordinationRuntime | null;
}) {
  const resolvedApi = useMemo(() => api ?? createDefaultApi(), [api]);
  const demoMode = !api || api instanceof SyntheticCoordinationApi;
  const activeRuntime = demoMode ? DEMO_RUNTIME : (isValidCoordinationRuntime(runtime) ? runtime : undefined);
  const [invitationCode, setInvitationCodeState] = useState("");
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitation>();
  const [invitationPreview, setInvitationPreview] = useState<InvitationPreview>();
  const [invitationGrant, setInvitationGrant] = useState<ParticipantGrant>();
  const [invitationError, setInvitationError] = useState<string>();
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>(initialCalendarView);
  const [coordinationHydrated, setCoordinationHydrated] = useState(demoMode);
  const [layers, setLayers] = useState<readonly CalendarLayer[]>(demoMode ? defaultCalendarLayers : []);
  const [visibleLayerIds, setVisibleLayerIds] = useState<readonly string[]>(demoMode ? defaultCalendarLayers.map((layer) => layer.id) : []);
  const [events, setEvents] = useState<readonly ScheduleEvent[]>([]);
  const [messageCheckEnabled, setMessageCheckEnabledState] = useState(false);
  const [messageCheckHydrated, setMessageCheckHydrated] = useState(demoMode);
  const [messageCheckPreference, setMessageCheckPreference] = useState<MessageCheckPreference>();
  const [messageDraft, setMessageDraftState] = useState("");
  const [messagePreview, setMessagePreview] = useState<MessagePreviewResponse>();
  const [messageCheckBusy, setMessageCheckBusy] = useState(false);
  const [messageError, setMessageError] = useState<string>();
  const [sentMessages, setSentMessages] = useState<readonly SentMessage[]>([]);
  const [messageSearchQuery, setMessageSearchQueryState] = useState("");
  const [messageSearchResults, setMessageSearchResults] = useState<readonly MessageSearchResult[]>([]);
  const [messageSearchBusy, setMessageSearchBusy] = useState(false);
  const [messageSearchError, setMessageSearchError] = useState<string>();
  const [correctingMessageId, setCorrectingMessageId] = useState<string>();
  const [correctionDraft, setCorrectionDraftState] = useState("");
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const [correctionError, setCorrectionError] = useState<string>();
  const hydrationGeneration = useRef(0);

  useEffect(() => {
    const generation = ++hydrationGeneration.current;
    setCoordinationHydrated(false);
    setLayers(demoMode ? defaultCalendarLayers : []);
    setVisibleLayerIds(demoMode ? defaultCalendarLayers.map((layer) => layer.id) : []);
    setEvents([]);
    setSentMessages([]);
    setMessageSearchResults([]);
    setMessageSearchQueryState("");
    setCorrectingMessageId(undefined);
    setCorrectionDraftState("");
    setMessageCheckEnabledState(false);
    setMessageCheckPreference(undefined);
    setMessagePreview(undefined);
    setMessageError(undefined);

    if (demoMode) {
      setCoordinationHydrated(true);
      setMessageCheckHydrated(true);
      return;
    }
    if (!activeRuntime) {
      setMessageCheckHydrated(false);
      return;
    }

    setMessageCheckHydrated(false);
    void Promise.all([
      resolvedApi.listCalendarLayers(activeRuntime.familyCircleId),
      resolvedApi.listScheduleEvents(activeRuntime.familyCircleId),
      resolvedApi.listMessages(activeRuntime.conversationId),
      resolvedApi.getMessageCheckPreference(activeRuntime.conversationId)
    ]).then(([nextLayers, nextEvents, nextMessages, preference]) => {
        if (hydrationGeneration.current !== generation) return;
        setLayers(nextLayers);
        setVisibleLayerIds(nextLayers.map((layer) => layer.id));
        setEvents(nextEvents);
        setSentMessages(visibleMessages(nextMessages, activeRuntime.actorIdentityId));
        setMessageCheckPreference(preference);
        setMessageCheckEnabledState(preference.enabled);
        setMessageCheckHydrated(true);
        setCoordinationHydrated(true);
      })
      .catch((error) => {
        if (hydrationGeneration.current !== generation) return;
        setMessageError(error instanceof Error ? error.message : "PeacePad coordination is unavailable.");
        setMessageCheckHydrated(false);
        setCoordinationHydrated(false);
      });
  }, [activeRuntime?.conversationId, activeRuntime?.familyCircleId, activeRuntime?.actorIdentityId, demoMode, resolvedApi]);

  const value = useMemo<CoordinationStateValue>(() => ({
    coordinationHydrated,
    invitationCode,
    createdInvitation,
    invitationPreview,
    invitationGrant,
    invitationError,
    invitationBusy,
    calendarView,
    layers,
    visibleLayerIds,
    events,
    messageCheckEnabled,
    messageCheckHydrated,
    messageDraft,
    messagePreview,
    messageCheckBusy,
    messageError,
    sentMessages,
    messageSearchQuery,
    messageSearchResults,
    messageSearchBusy,
    messageSearchError,
    correctingMessageId,
    correctionDraft,
    correctionBusy,
    correctionError,
    createInvitation: async () => {
      setInvitationBusy(true);
      setInvitationError(undefined);
      try {
        if (!activeRuntime) throw new Error("Sign in to use family coordination.");
        setCreatedInvitation(await resolvedApi.createInvitation({
          familyCircleId: activeRuntime.familyCircleId,
          invitedRole: "parent",
          permissions: ["message.write", "calendar.write"],
          expiresInHours: 72
        }, writeContext(activeRuntime)));
      } catch (error) {
        setInvitationError(invitationMessage(error));
      } finally {
        setInvitationBusy(false);
      }
    },
    revokeCreatedInvitation: async () => {
      if (!createdInvitation) return;
      setInvitationBusy(true);
      setInvitationError(undefined);
      try {
        if (!activeRuntime) throw new Error("Sign in to use family coordination.");
        await resolvedApi.revokeInvitation(createdInvitation.invitation.id, writeContext(activeRuntime, createdInvitation.invitation.version));
        setCreatedInvitation(undefined);
      } catch (error) {
        setInvitationError(invitationMessage(error));
      } finally {
        setInvitationBusy(false);
      }
    },
    setInvitationCode: (code) => {
      setInvitationCodeState(code.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6));
      setInvitationPreview(undefined);
      setInvitationError(undefined);
    },
    resolveInvitation: async () => {
      setInvitationBusy(true);
      setInvitationError(undefined);
      setInvitationPreview(undefined);
      try {
        setInvitationPreview(await resolvedApi.resolveInvitation(invitationCode));
      } catch (error) {
        setInvitationError(invitationMessage(error));
      } finally {
        setInvitationBusy(false);
      }
    },
    acceptInvitation: async () => {
      if (!invitationPreview) return;
      setInvitationBusy(true);
      setInvitationError(undefined);
      try {
        if (!activeRuntime) throw new Error("Sign in to use family coordination.");
        setInvitationGrant(await resolvedApi.acceptInvitation(
          invitationPreview.invitationId,
          writeContext(activeRuntime, invitationPreview.version),
        ));
        setInvitationPreview(undefined);
      } catch (error) {
        setInvitationError(invitationMessage(error));
      } finally {
        setInvitationBusy(false);
      }
    },
    declineInvitation: async () => {
      if (invitationPreview) {
        if (!activeRuntime) throw new Error("Sign in to use family coordination.");
        await resolvedApi.declineInvitation(
          invitationPreview.invitationId,
          writeContext(activeRuntime, invitationPreview.version),
        );
      }
      setInvitationPreview(undefined);
      setInvitationCodeState("");
    },
    setCalendarView,
    toggleLayerFilter: (layerId) => setVisibleLayerIds((current) =>
      current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId]
    ),
    setLayerShared: async (layerId, shared) => {
      const layer = layers.find((item) => item.id === layerId);
      if (!layer) return;
      if (!activeRuntime) throw new Error("Sign in to use family coordination.");
      const updated = await resolvedApi.updateCalendarLayer(
        { ...layer, visibility: shared ? { scope: "family" } : { scope: "private" } },
        writeContext(activeRuntime, layer.version)
      );
      setLayers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    },
    addEvent: async ({ layerId, title, startsAt, endsAt }) => {
      const layer = layers.find((item) => item.id === layerId);
      if (!layer || !title.trim()) return;
      if (!activeRuntime) throw new Error("Sign in to use family coordination.");
      const event = await resolvedApi.createScheduleEvent({
        familyCircleId: layer.familyCircleId,
        calendarLayerId: layer.id,
        childProfileIds: [],
        eventType: layer.kind === "parenting-time" ? "parenting-time" : "appointment",
        title: title.trim(),
        description: null,
        startsAt,
        endsAt,
        status: "planned",
        recurrence: null,
        visibilityOverride: null
      }, writeContext(activeRuntime));
      setEvents((current) => [...current, event]);
    },
    deleteEvent: async (eventId) => {
      const event = events.find((item) => item.id === eventId);
      if (!event) return;
      if (!activeRuntime) throw new Error("Sign in to use family coordination.");
      await resolvedApi.deleteScheduleEvent(eventId, writeContext(activeRuntime, event.version));
      setEvents((current) => current.filter((event) => event.id !== eventId));
    },
    setMessageDraft: (draft) => {
      setMessageDraftState(draft);
      setMessagePreview(undefined);
      setMessageError(undefined);
    },
    setMessageCheckEnabled: async (enabled) => {
      if (!activeRuntime || (!demoMode && !messageCheckHydrated)) return;
      setMessageCheckBusy(true);
      setMessageError(undefined);
      try {
        const current = messageCheckPreference
          ?? await resolvedApi.getMessageCheckPreference(activeRuntime.conversationId);
        const updated = await resolvedApi.setMessageCheckPreference(
          activeRuntime.conversationId,
          enabled,
          writeContext(activeRuntime, current.version)
        );
        setMessageCheckPreference(updated);
        setMessageCheckEnabledState(updated.enabled);
        setMessageCheckHydrated(true);
        if (!updated.enabled) setMessagePreview(undefined);
      } catch (error) {
        setMessageError(error instanceof Error ? error.message : "Message Check is unavailable.");
      } finally {
        setMessageCheckBusy(false);
      }
    },
    checkMessage: async () => {
      if (!activeRuntime || !messageCheckHydrated || !messageCheckEnabled) return;
      setMessageCheckBusy(true);
      setMessageError(undefined);
      try {
        setMessagePreview(await resolvedApi.previewMessage(activeRuntime.conversationId, messageDraft));
      } catch (error) {
        setMessageError(error instanceof Error ? error.message : "Message Check is unavailable.");
      } finally {
        setMessageCheckBusy(false);
      }
    },
    sendMessage: async (useSuggestion) => {
      const originalBody = messageDraft.trim();
      if (!originalBody) return;
      const sentBody = useSuggestion && messagePreview?.rewordingSuggestion
        ? messagePreview.rewordingSuggestion
        : originalBody;
      setMessageCheckBusy(true);
      setMessageError(undefined);
      if (!activeRuntime) return;
      const context = writeContext(activeRuntime);
      try {
        const message = await resolvedApi.sendMessage({
          familyCircleId: activeRuntime.familyCircleId,
          conversationId: activeRuntime.conversationId,
          body: sentBody
        }, context);
        setSentMessages((current) => [...current, {
          id: message.id,
          originalBody,
          sentBody: message.body ?? sentBody,
          sentAt: message.occurredAt,
          status: "sent",
          corrected: false,
          canCorrect: true
        }]);
        setMessageDraftState("");
        setMessagePreview(undefined);
      } catch (error) {
        if (isTransientMessageError(error) && sentBody.length <= MAX_OUTBOX_BODY_LENGTH) {
          const queueId = `outbox_${context.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(-64)}`;
          try {
            const queuedAt = new Date().toISOString();
            await outbox.enqueue({
              id: queueId,
              input: { familyCircleId: activeRuntime.familyCircleId, conversationId: activeRuntime.conversationId, body: sentBody },
              context,
              queuedAt,
              attempts: 0
            });
            setSentMessages((current) => [...current, { id: queueId, originalBody, sentBody, sentAt: queuedAt, status: "waiting", corrected: false, canCorrect: false }]);
            setMessageDraftState("");
            setMessagePreview(undefined);
            setMessageError("Waiting for a connection. PeacePad will retry this message safely.");
          } catch (queueError) {
            setMessageError(queueError instanceof Error ? queueError.message : "PeacePad could not queue that message.");
          }
        } else {
          setMessageError(error instanceof Error ? error.message : "PeacePad could not send that message.");
        }
      } finally {
        setMessageCheckBusy(false);
      }
    },
    setMessageSearchQuery: (query) => {
      setMessageSearchQueryState(query.slice(0, 100));
      setMessageSearchError(undefined);
      if (!query.trim()) setMessageSearchResults([]);
    },
    searchMessages: async () => {
      const query = messageSearchQuery.trim();
      if (query.length < 2) {
        setMessageSearchError("Enter at least two characters to search.");
        return;
      }
      setMessageSearchBusy(true);
      setMessageSearchError(undefined);
      try {
        if (!activeRuntime) throw new Error("Sign in to search family messages.");
        setMessageSearchResults(await resolvedApi.searchMessages(activeRuntime.conversationId, query));
      } catch (error) {
        setMessageSearchError(error instanceof Error ? error.message : "PeacePad could not search messages.");
      } finally {
        setMessageSearchBusy(false);
      }
    },
    startCorrection: (messageId) => {
      const message = sentMessages.find((item) => item.id === messageId);
      if (!message?.canCorrect || message.status === "waiting") return;
      setCorrectingMessageId(message.id);
      setCorrectionDraftState(message.sentBody);
      setCorrectionError(undefined);
    },
    cancelCorrection: () => {
      setCorrectingMessageId(undefined);
      setCorrectionDraftState("");
      setCorrectionError(undefined);
    },
    setCorrectionDraft: (draft) => {
      setCorrectionDraftState(draft.slice(0, 10000));
      setCorrectionError(undefined);
    },
    saveCorrection: async () => {
      const message = sentMessages.find((item) => item.id === correctingMessageId);
      const body = correctionDraft.trim();
      if (!message?.canCorrect || message.status === "waiting") return;
      if (!body || body === message.sentBody) {
        setCorrectionError("Enter changed wording before saving the correction.");
        return;
      }
      setCorrectionBusy(true);
      setCorrectionError(undefined);
      try {
        if (!activeRuntime) throw new Error("Sign in to correct family messages.");
        const correction = await resolvedApi.correctMessage({
          familyCircleId: activeRuntime.familyCircleId,
          conversationId: activeRuntime.conversationId,
          originalMessageEventId: message.id,
          body
        }, writeContext(activeRuntime));
        setSentMessages((current) => current.map((item) => item.id === message.id ? {
          ...item,
          sentBody: correction.body ?? body,
          corrected: true
        } : item));
        setCorrectingMessageId(undefined);
        setCorrectionDraftState("");
        setMessageSearchResults([]);
      } catch (error) {
        setCorrectionError(error instanceof Error ? error.message : "PeacePad could not save that correction.");
      } finally {
        setCorrectionBusy(false);
      }
    }
  }), [
    activeRuntime,
    calendarView,
    coordinationHydrated,
    correctingMessageId,
    correctionBusy,
    correctionDraft,
    correctionError,
    createdInvitation,
    events,
    invitationBusy,
    invitationCode,
    invitationError,
    invitationGrant,
    invitationPreview,
    layers,
    messageCheckBusy,
    messageCheckEnabled,
    messageCheckHydrated,
    messageCheckPreference,
    messageDraft,
    messageError,
    messagePreview,
    messageSearchBusy,
    messageSearchError,
    messageSearchQuery,
    messageSearchResults,
    outbox,
    resolvedApi,
    sentMessages,
    visibleLayerIds
  ]);

  if (!demoMode && !coordinationHydrated) {
    return <View style={hydrationStyles.page}><ActivityIndicator color={colors.brand} /><Text style={hydrationStyles.title}>Loading your family space</Text><Text style={hydrationStyles.body}>{messageError ?? "Restoring messages, calendars, and preferences securely."}</Text></View>;
  }
  return <CoordinationStateContext.Provider value={value}>{children}</CoordinationStateContext.Provider>;
}

export function useCoordinationState(): CoordinationStateValue {
  const value = useContext(CoordinationStateContext);
  if (!value) throw new Error("useCoordinationState must be used inside CoordinationStateProvider");
  return value;
}

const hydrationStyles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: spacing.md },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: spacing.sm }
});
