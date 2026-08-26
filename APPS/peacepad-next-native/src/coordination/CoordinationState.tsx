import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
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
  earliestQueuedMessageRetryAt,
  isTransientMessageError,
  isQueuedMessageInScope,
  removeQueuedMessage as removeSingleQueuedMessage,
  retryQueuedMessage as retrySingleQueuedMessage,
  retryQueuedMessages,
  secureMessageOutboxStore,
  type MessageOutboxScope,
  type MessageOutboxStore,
  type QueuedMessage,
  type QueuedMessageErrorKind
} from "../messaging/secureMessageOutbox";
import {
  createWriteContext,
  type AcceptedInvitation,
  type CalendarLayer,
  type EntityId,
  type InvitationPreview,
  type MessageCheckPreference,
  type MessageEvent,
  type ParticipantGrant,
  type ScheduleEvent
} from "../domain/v2";
import { colors, spacing } from "../theme";
import {
  expoConnectivityMonitor,
  usableConnectivity,
  type ConnectivityMonitor,
  type ConnectivitySnapshot
} from "../connectivity/ConnectivityMonitor";

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
  status: "waiting" | "needs-action" | "sent" | "delivered" | "viewed";
  corrected: boolean;
  canCorrect: boolean;
  queued: boolean;
  queueErrorKind?: QueuedMessageErrorKind;
}>;

type CoordinationStateValue = {
  coordinationHydrated: boolean;
  invitationCode: string;
  createdInvitation?: CreatedInvitation;
  invitationPreview?: InvitationPreview;
  invitationGrant?: ParticipantGrant;
  invitationError?: string;
  invitationBusy: boolean;
  connectedInvitationAcceptanceBlocked: boolean;
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
  queuedActionBusyIds: readonly string[];
  queuedActionError?: string;
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
  retryQueuedMessage: (messageId: string) => Promise<void>;
  removeQueuedMessage: (messageId: string) => Promise<void>;
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
  participantGrantVersion: number;
  conversationId: EntityId;
  region: "ca" | "us";
}>;

const DEMO_RUNTIME: CoordinationRuntime = {
  actorIdentityId: "identity-current",
  identityVersion: 1,
  sessionId: "verified-device-session",
  familyCircleId: "family-current",
  participantGrantId: "grant-current",
  participantGrantVersion: 1,
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
    && Number.isInteger(runtime.participantGrantVersion)
    && runtime.participantGrantVersion >= 1
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

function messageOutboxScope(runtime: CoordinationRuntime): MessageOutboxScope {
  return {
    actorIdentityId: runtime.actorIdentityId,
    sessionId: runtime.sessionId,
    familyCircleId: runtime.familyCircleId,
    conversationId: runtime.conversationId,
    region: runtime.region
  };
}

function queuedVisibleMessages(queuedMessages: readonly QueuedMessage[], scope: MessageOutboxScope): readonly SentMessage[] {
  return queuedMessages
    .filter((queued) => isQueuedMessageInScope(queued, scope))
    .map((queued) => ({
      id: queued.id,
      originalBody: queued.originalBody,
      sentBody: queued.input.body,
      sentAt: queued.queuedAt,
      status: queued.status,
      corrected: false,
      canCorrect: false,
      queued: true,
      queueErrorKind: queued.lastErrorKind
    }));
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
      canCorrect: message.provenance.createdBy.identityId === actorIdentityId,
      queued: false
    };
  });
}

export function CoordinationStateProvider({
  api,
  children,
  connectivity = expoConnectivityMonitor,
  initialCalendarView = resolveCalendarStartView(process.env?.EXPO_PUBLIC_PEACEPAD_LAB_START_CALENDAR_VIEW),
  onInvitationAccepted,
  outbox = secureMessageOutboxStore,
  runtime
}: {
  api?: PeacePadCoordinationApi;
  children: ReactNode;
  connectivity?: ConnectivityMonitor;
  initialCalendarView?: CalendarView;
  onInvitationAccepted?: (result: AcceptedInvitation) => Promise<void>;
  outbox?: MessageOutboxStore;
  runtime?: CoordinationRuntime | null;
}) {
  const { t } = useOptionalLocalization();
  // A runtime identity is only issued by the verified network-backed session.
  // Never silently fall back to seeded synthetic data when a runtime is present:
  // doing so would make a miswired production screen look healthy while
  // writing nowhere. The lab path remains explicitly synthetic when neither
  // api nor runtime is supplied.
  const resolvedApi = useMemo(() => {
    if (runtime && (!api || api instanceof SyntheticCoordinationApi)) {
      throw new Error("PeacePad production runtime requires the network-backed coordination API.");
    }
    return api ?? createDefaultApi();
  }, [api, runtime]);
  const demoMode = !runtime && (!api || api instanceof SyntheticCoordinationApi);
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
  const [queuedActionBusyIds, setQueuedActionBusyIds] = useState<readonly string[]>([]);
  const [queuedActionError, setQueuedActionError] = useState<string>();
  const [outboxScheduleVersion, setOutboxScheduleVersion] = useState(0);
  const [networkAvailable, setNetworkAvailable] = useState(true);
  const [messageSearchQuery, setMessageSearchQueryState] = useState("");
  const [messageSearchResults, setMessageSearchResults] = useState<readonly MessageSearchResult[]>([]);
  const [messageSearchBusy, setMessageSearchBusy] = useState(false);
  const [messageSearchError, setMessageSearchError] = useState<string>();
  const [correctingMessageId, setCorrectingMessageId] = useState<string>();
  const [correctionDraft, setCorrectionDraftState] = useState("");
  const [correctionBusy, setCorrectionBusy] = useState(false);
  const [correctionError, setCorrectionError] = useState<string>();
  const hydrationGeneration = useRef(0);
  const retriedRuntimeScopes = useRef(new Set<string>());
  const queuedActionLocks = useRef(new Set<string>());
  const scheduledRetryScopeLocks = useRef(new Set<string>());
  const networkAvailableRef = useRef(true);

  useEffect(() => {
    if (demoMode || !activeRuntime) return;
    let cancelled = false;
    const updateConnectivity = (snapshot: ConnectivitySnapshot) => {
      if (cancelled) return;
      const usable = usableConnectivity(snapshot);
      if (usable === undefined || usable === networkAvailableRef.current) return;
      const reconnected = usable && !networkAvailableRef.current;
      networkAvailableRef.current = usable;
      setNetworkAvailable(usable);
      if (reconnected) setOutboxScheduleVersion((current) => current + 1);
    };
    void connectivity.getCurrent().then(updateConnectivity).catch(() => undefined);
    const subscription = connectivity.subscribe(updateConnectivity);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [activeRuntime?.actorIdentityId, activeRuntime?.conversationId, activeRuntime?.familyCircleId, activeRuntime?.region, activeRuntime?.sessionId, connectivity, demoMode]);

  useEffect(() => {
    const generation = ++hydrationGeneration.current;
    let cancelled = false;
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
    setQueuedActionBusyIds([]);
    setQueuedActionError(undefined);
    queuedActionLocks.current.clear();

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
    const outboxScope = messageOutboxScope(activeRuntime);
    const retryScopeKey = [outboxScope.actorIdentityId, outboxScope.sessionId, outboxScope.region, outboxScope.familyCircleId, outboxScope.conversationId].join(":");
    const retry = retriedRuntimeScopes.current.has(retryScopeKey)
      ? Promise.resolve()
      : connectivity.getCurrent().catch(() => undefined).then((snapshot) => {
        if (snapshot && usableConnectivity(snapshot) === false) return;
        retriedRuntimeScopes.current.add(retryScopeKey);
        return retryQueuedMessages(
          resolvedApi,
          outbox,
          outboxScope,
          () => new Date(),
          () => !cancelled && hydrationGeneration.current === generation
        ).then(() => undefined);
      });
    void retry.then(() => Promise.all([
      resolvedApi.listCalendarLayers(activeRuntime.familyCircleId),
      resolvedApi.listScheduleEvents(activeRuntime.familyCircleId),
      resolvedApi.listMessages(activeRuntime.conversationId),
      resolvedApi.getMessageCheckPreference(activeRuntime.conversationId),
      outbox.list()
    ])).then(([nextLayers, nextEvents, nextMessages, preference, queuedMessages]) => {
        if (cancelled || hydrationGeneration.current !== generation) return;
        setLayers(nextLayers);
        setVisibleLayerIds(nextLayers.map((layer) => layer.id));
        setEvents(nextEvents);
        const waitingMessages = queuedVisibleMessages(queuedMessages, outboxScope);
        setSentMessages([...visibleMessages(nextMessages, activeRuntime.actorIdentityId), ...waitingMessages]);
        setMessageCheckPreference(preference);
        setMessageCheckEnabledState(preference.enabled);
        setMessageCheckHydrated(true);
        setCoordinationHydrated(true);
      })
      .catch((error) => {
        if (cancelled || hydrationGeneration.current !== generation) return;
        setMessageError(error instanceof Error ? error.message : "PeacePad coordination is unavailable.");
        setMessageCheckHydrated(false);
        setCoordinationHydrated(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRuntime?.conversationId, activeRuntime?.familyCircleId, activeRuntime?.actorIdentityId, activeRuntime?.region, activeRuntime?.sessionId, connectivity, demoMode, outbox, resolvedApi]);

  useEffect(() => {
    if (demoMode || !activeRuntime || !coordinationHydrated || !networkAvailable) return;
    const generation = hydrationGeneration.current;
    const scope = messageOutboxScope(activeRuntime);
    const scopeKey = [scope.actorIdentityId, scope.sessionId, scope.region, scope.familyCircleId, scope.conversationId].join(":");
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const arm = async () => {
      const queuedMessages = await outbox.list();
      if (cancelled || hydrationGeneration.current !== generation) return;
      const retryAt = earliestQueuedMessageRetryAt(queuedMessages, scope);
      if (retryAt === undefined) return;
      const delay = Math.max(0, Math.min(retryAt - Date.now(), 2_147_483_647));
      const runRetry = () => {
        if (cancelled || hydrationGeneration.current !== generation) return;
        if (scheduledRetryScopeLocks.current.has(scopeKey)) {
          timer = setTimeout(runRetry, 100);
          return;
        }
        scheduledRetryScopeLocks.current.add(scopeKey);
        let retryCompleted = false;
        void retryQueuedMessages(
          resolvedApi,
          outbox,
          scope,
          () => new Date(),
          () => !cancelled && hydrationGeneration.current === generation
        )
          .then(async () => {
            retryCompleted = true;
            if (cancelled || hydrationGeneration.current !== generation) return;
            const [canonicalMessages, remainingQueued] = await Promise.all([
              resolvedApi.listMessages(activeRuntime.conversationId),
              outbox.list()
            ]);
            if (cancelled || hydrationGeneration.current !== generation) return;
            setSentMessages([
              ...visibleMessages(canonicalMessages, activeRuntime.actorIdentityId),
              ...queuedVisibleMessages(remainingQueued, scope)
            ]);
          })
          .catch((error) => {
            if (cancelled || hydrationGeneration.current !== generation) return;
            setMessageError(error instanceof Error ? error.message : "PeacePad could not retry queued messages.");
          })
          .finally(() => {
            scheduledRetryScopeLocks.current.delete(scopeKey);
            if (retryCompleted && !cancelled && hydrationGeneration.current === generation) {
              setOutboxScheduleVersion((current) => current + 1);
            }
          });
      };
      timer = setTimeout(runRetry, delay);
    };

    void arm().catch((error) => {
      if (cancelled || hydrationGeneration.current !== generation) return;
      setMessageError(error instanceof Error ? error.message : "PeacePad could not read queued messages.");
    });
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [activeRuntime?.actorIdentityId, activeRuntime?.conversationId, activeRuntime?.familyCircleId, activeRuntime?.region, activeRuntime?.sessionId, coordinationHydrated, demoMode, networkAvailable, outbox, outboxScheduleVersion, resolvedApi]);

  const value = useMemo<CoordinationStateValue>(() => ({
    coordinationHydrated,
    invitationCode,
    createdInvitation,
    invitationPreview,
    invitationGrant,
    invitationError,
    invitationBusy,
    connectedInvitationAcceptanceBlocked: !demoMode && !onInvitationAccepted,
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
    queuedActionBusyIds,
    queuedActionError,
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
          permissions: ["messages", "calendar", "shared-records", "calls"],
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
        if (!demoMode && !onInvitationAccepted) {
          throw new Error("Finish this invitation from an account without an active family. Family switching is not available yet.");
        }
        if (!activeRuntime) throw new Error("Sign in to use family coordination.");
        const result = await resolvedApi.acceptInvitation(
          invitationPreview.invitationId,
          writeContext(activeRuntime, invitationPreview.version),
        );
        if (onInvitationAccepted) await onInvitationAccepted(result);
        setInvitationGrant(result.grant);
        setInvitationPreview(undefined);
      } catch (error) {
        setInvitationError(invitationMessage(error));
      } finally {
        setInvitationBusy(false);
      }
    },
    declineInvitation: async () => {
      if (!invitationPreview) return;
      setInvitationBusy(true);
      setInvitationError(undefined);
      try {
        if (!activeRuntime) throw new Error("Sign in to use family coordination.");
        await resolvedApi.declineInvitation(invitationPreview.invitationId, writeContext(activeRuntime, invitationPreview.version));
        setInvitationPreview(undefined);
        setInvitationCodeState("");
      } catch (error) {
        setInvitationError(invitationMessage(error));
      } finally {
        setInvitationBusy(false);
      }
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
          canCorrect: true,
          queued: false
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
              originalBody,
              context,
              queuedAt,
              nextAttemptAt: queuedAt,
              attempts: 0,
              status: "waiting"
            });
            setSentMessages((current) => [...current, { id: queueId, originalBody, sentBody, sentAt: queuedAt, status: "waiting", corrected: false, canCorrect: false, queued: true }]);
            setMessageDraftState("");
            setMessagePreview(undefined);
            setMessageError("Waiting for a connection. PeacePad will retry this message safely.");
            setOutboxScheduleVersion((current) => current + 1);
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
    retryQueuedMessage: async (messageId) => {
      if (!activeRuntime || queuedActionLocks.current.has(messageId)) return;
      const message = sentMessages.find((item) => item.id === messageId);
      if (!message?.queued || message.status !== "needs-action") return;
      const generation = hydrationGeneration.current;
      const scope = messageOutboxScope(activeRuntime);
      queuedActionLocks.current.add(messageId);
      setQueuedActionBusyIds((current) => current.includes(messageId) ? current : [...current, messageId]);
      setQueuedActionError(undefined);
      try {
        const result = await retrySingleQueuedMessage(resolvedApi, outbox, scope, messageId);
        if (hydrationGeneration.current !== generation) return;
        if (result === "sent") {
          setSentMessages((current) => current.filter((item) => item.id !== messageId));
        }
        if (result === "retained") {
          setQueuedActionError("PeacePad could not send this queued message. It remains on this device.");
        }
        try {
          const [canonicalMessages, queuedMessages] = await Promise.all([
            resolvedApi.listMessages(activeRuntime.conversationId),
            outbox.list()
          ]);
          if (hydrationGeneration.current !== generation) return;
          setSentMessages([
            ...visibleMessages(canonicalMessages, activeRuntime.actorIdentityId),
            ...queuedVisibleMessages(queuedMessages, scope)
          ]);
        } catch {
          if (hydrationGeneration.current === generation && result === "sent") {
            setQueuedActionError("Message sent. PeacePad could not refresh this conversation yet.");
          }
        }
      } catch {
        if (hydrationGeneration.current === generation) {
          setQueuedActionError("PeacePad could not update this queued message. It remains on this device.");
        }
      } finally {
        if (hydrationGeneration.current === generation) {
          queuedActionLocks.current.delete(messageId);
          setQueuedActionBusyIds((current) => current.filter((id) => id !== messageId));
        }
      }
    },
    removeQueuedMessage: async (messageId) => {
      if (!activeRuntime || queuedActionLocks.current.has(messageId)) return;
      const message = sentMessages.find((item) => item.id === messageId);
      if (!message?.queued || message.status !== "needs-action") return;
      const generation = hydrationGeneration.current;
      const scope = messageOutboxScope(activeRuntime);
      queuedActionLocks.current.add(messageId);
      setQueuedActionBusyIds((current) => current.includes(messageId) ? current : [...current, messageId]);
      setQueuedActionError(undefined);
      try {
        const removed = await removeSingleQueuedMessage(outbox, scope, messageId);
        if (hydrationGeneration.current !== generation) return;
        if (!removed) {
          setQueuedActionError("PeacePad could not remove this queued message from this device.");
          return;
        }
        setSentMessages((current) => current.filter((item) => item.id !== messageId));
        try {
          const [canonicalMessages, queuedMessages] = await Promise.all([
            resolvedApi.listMessages(activeRuntime.conversationId),
            outbox.list()
          ]);
          if (hydrationGeneration.current !== generation) return;
          setSentMessages([
            ...visibleMessages(canonicalMessages, activeRuntime.actorIdentityId),
            ...queuedVisibleMessages(queuedMessages, scope)
          ]);
        } catch {
          if (hydrationGeneration.current === generation) {
            setQueuedActionError("Removed from this device. PeacePad could not refresh this conversation yet.");
          }
        }
      } catch {
        if (hydrationGeneration.current === generation) {
          setQueuedActionError("PeacePad could not remove this queued message from this device.");
        }
      } finally {
        if (hydrationGeneration.current === generation) {
          queuedActionLocks.current.delete(messageId);
          setQueuedActionBusyIds((current) => current.filter((id) => id !== messageId));
        }
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
    demoMode,
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
    queuedActionBusyIds,
    queuedActionError,
    messageSearchBusy,
    messageSearchError,
    messageSearchQuery,
    messageSearchResults,
    onInvitationAccepted,
    outbox,
    resolvedApi,
    sentMessages,
    visibleLayerIds
  ]);

  if (!demoMode && !coordinationHydrated) {
    return <View style={hydrationStyles.page}><ActivityIndicator color={colors.brand} /><Text accessibilityRole="header" style={hydrationStyles.title}>{t("runtime.loadingFamily")}</Text><Text style={hydrationStyles.body}>{messageError ?? t("runtime.restoringFamily")}</Text></View>;
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
