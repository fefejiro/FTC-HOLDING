import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";
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
  type InvitationPreview,
  type MessageEvent,
  type ParticipantGrant,
  type ScheduleEvent
} from "../domain/v2";

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

function writeContext(actorIdentityId: string, expectedVersion: number | null = null) {
  return createWriteContext({
    idempotencyKey: `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    expectedVersion,
    region: "ca",
    actor: { identityId: actorIdentityId, sessionId: "verified-device-session" }
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
  api = createDefaultApi(),
  children,
  initialCalendarView = resolveCalendarStartView(process.env?.EXPO_PUBLIC_PEACEPAD_LAB_START_CALENDAR_VIEW),
  outbox = secureMessageOutboxStore
}: {
  api?: PeacePadCoordinationApi;
  children: ReactNode;
  initialCalendarView?: CalendarView;
  outbox?: MessageOutboxStore;
}) {
  const [invitationCode, setInvitationCodeState] = useState("");
  const [createdInvitation, setCreatedInvitation] = useState<CreatedInvitation>();
  const [invitationPreview, setInvitationPreview] = useState<InvitationPreview>();
  const [invitationGrant, setInvitationGrant] = useState<ParticipantGrant>();
  const [invitationError, setInvitationError] = useState<string>();
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>(initialCalendarView);
  const [layers, setLayers] = useState<readonly CalendarLayer[]>(defaultCalendarLayers);
  const [visibleLayerIds, setVisibleLayerIds] = useState<readonly string[]>(defaultCalendarLayers.map((layer) => layer.id));
  const [events, setEvents] = useState<readonly ScheduleEvent[]>([]);
  const [messageCheckEnabled, setMessageCheckEnabledState] = useState(false);
  const [messageDraft, setMessageDraftState] = useState("");
  const [messagePreview, setMessagePreview] = useState<MessagePreviewResponse>();
  const [messageCheckBusy, setMessageCheckBusy] = useState(false);
  const [messageError, setMessageError] = useState<string>();
  const [sentMessages, setSentMessages] = useState<readonly SentMessage[]>([]);
  const [messageSearchQuery, setMessageSearchQueryState] = useState("");
  const [messageSearchResults, setMessageSearchResults] = useState<readonly MessageSearchResult[]>([]);
  const [messageSearchBusy, setMessageSearchBusy] = useState(false);
  const [messageSearchError, setMessageSearchError] = useState<string>();
  const [actorIdentityId, setActorIdentityId] = useState("identity-current");
  const [correctingMessageId, setCorrectingMessageId] = useState<string>();
  const [correctionDraft, setCorrectionDraftState] = useState("");
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const [correctionError, setCorrectionError] = useState<string>();

  const value = useMemo<CoordinationStateValue>(() => ({
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
        setCreatedInvitation(await api.createInvitation({
          familyCircleId: "family-current",
          invitedRole: "parent",
          permissions: ["messages", "calendar", "shared-records"],
          expiresInHours: 72
        }, writeContext(actorIdentityId)));
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
        await api.revokeInvitation(createdInvitation.invitation.id, writeContext(actorIdentityId, createdInvitation.invitation.version));
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
        setInvitationPreview(await api.resolveInvitation(invitationCode));
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
        setInvitationGrant(await api.acceptInvitation(
          invitationPreview.invitationId,
          writeContext(actorIdentityId, invitationPreview.version),
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
        await api.declineInvitation(
          invitationPreview.invitationId,
          writeContext(actorIdentityId, invitationPreview.version),
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
      const updated = await api.updateCalendarLayer(
        { ...layer, visibility: shared ? { scope: "family" } : { scope: "private" } },
        writeContext(actorIdentityId, layer.version)
      );
      setLayers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    },
    addEvent: async ({ layerId, title, startsAt, endsAt }) => {
      const layer = layers.find((item) => item.id === layerId);
      if (!layer || !title.trim()) return;
      const event = await api.createScheduleEvent({
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
      }, writeContext(actorIdentityId));
      setEvents((current) => [...current, event]);
    },
    deleteEvent: async (eventId) => {
      await api.deleteScheduleEvent(eventId, writeContext(actorIdentityId));
      setEvents((current) => current.filter((event) => event.id !== eventId));
    },
    setMessageDraft: (draft) => {
      setMessageDraftState(draft);
      setMessagePreview(undefined);
      setMessageError(undefined);
    },
    setMessageCheckEnabled: async (enabled) => {
      await api.setMessageCheckPreference("conversation-primary", enabled, writeContext(actorIdentityId));
      setMessageCheckEnabledState(enabled);
      if (!enabled) setMessagePreview(undefined);
    },
    checkMessage: async () => {
      if (!messageCheckEnabled) return;
      setMessageCheckBusy(true);
      setMessageError(undefined);
      try {
        setMessagePreview(await api.previewMessage("conversation-primary", messageDraft));
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
      const context = writeContext(actorIdentityId);
      try {
        const message = await api.sendMessage({
          familyCircleId: "family-current",
          conversationId: "conversation-primary",
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
              input: { familyCircleId: "family-current", conversationId: "conversation-primary", body: sentBody },
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
        setMessageSearchResults(await api.searchMessages("conversation-primary", query));
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
        const correction = await api.correctMessage({
          familyCircleId: "family-current",
          conversationId: "conversation-primary",
          originalMessageEventId: message.id,
          body
        }, writeContext(actorIdentityId));
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
    api,
    actorIdentityId,
    calendarView,
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
    messageDraft,
    messageError,
    messagePreview,
    messageSearchBusy,
    messageSearchError,
    messageSearchQuery,
    messageSearchResults,
    outbox,
    sentMessages,
    visibleLayerIds
  ]);

  return <CoordinationStateContext.Provider value={value}>{children}</CoordinationStateContext.Provider>;
}

export function useCoordinationState(): CoordinationStateValue {
  const value = useContext(CoordinationStateContext);
  if (!value) throw new Error("useCoordinationState must be used inside CoordinationStateProvider");
  return value;
}
