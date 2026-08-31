import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useOptionalLocalization } from "../localization/LocalizationProvider";
import type { MessagePreviewResponse } from "../api/contracts";
import {
  InvitationError,
  type CreatedInvitation,
  type MessageSearchResult,
  type CoachConversationTurn,
  type CoachConversationTurnInput,
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
  type AttachmentMediaType,
  type ConversationAttachment,
  type EntityId,
  type InvitationPreview,
  type MessageCheckPreference,
  type MessageEvent,
  type ParentingTask,
  type ParentingScheduleException,
  type ParentingSchedulePlan,
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
  connected: boolean;
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
  tasks: readonly ParentingTask[];
  parentingSchedulePlan: ParentingSchedulePlan | null;
  parentingScheduleExceptions: readonly ParentingScheduleException[];
  actorIdentityId?: EntityId;
  messageCheckEnabled: boolean;
  messageCheckHydrated: boolean;
  messageDraft: string;
  messagePreview?: MessagePreviewResponse;
  messageCheckBusy: boolean;
  messageError?: string;
  sentMessages: readonly SentMessage[];
  messageAttachments: readonly ConversationAttachment[];
  attachmentBusy: boolean;
  attachmentError?: string;
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
  saveParentingSchedulePlan: (input: Readonly<{
    calendarLayerId: EntityId;
    pattern: import("../domain/v2").ParentingSchedulePattern;
    startDate: string;
    primaryParent: "you" | "other";
    timezone: string;
    status: "active" | "paused";
  }>) => Promise<void>;
  createParentingScheduleException: (input: Readonly<{
    assignedParent: "you" | "other";
    kind: ParentingScheduleException["kind"];
    startDate: string;
    endDate: string;
    note: string | null;
  }>) => Promise<void>;
  resolveParentingScheduleException: (exceptionId: EntityId, resolution: "accepted" | "declined" | "cancelled") => Promise<void>;
  addEvent: (input: {
    layerId: string;
    title: string;
    startsAt: string;
    endsAt: string;
    eventType?: "parenting-time" | "appointment" | "holiday" | "change-request";
  }) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addTask: (input: { title: string; dueAt?: string; shared: boolean }) => Promise<ParentingTask | undefined>;
  setTaskCompleted: (taskId: string, completed: boolean) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setMessageDraft: (draft: string) => void;
  uploadMessageAttachment: (input: Readonly<{ originalFileName: string; mediaType: AttachmentMediaType; bytes: ArrayBuffer }>) => Promise<void>;
  openMessageAttachment: (attachmentId: string) => Promise<string>;
  transcribeCoachAudio: (bytes: ArrayBuffer, mediaType: "audio/m4a" | "audio/mp4" | "audio/webm") => Promise<string>;
  coachConversationTurn: (input: Omit<CoachConversationTurnInput, "conversationId">) => Promise<CoachConversationTurn>;
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
  /** A private space deliberately has no message/call conversation yet. */
  conversationId?: EntityId;
  region: "ca" | "us";
}>;

const DEMO_RUNTIME: CoordinationRuntime = {
  actorIdentityId: "11111111-1111-4111-8111-111111111111",
  identityVersion: 1,
  sessionId: "22222222-2222-4222-8222-222222222222",
  familyCircleId: "33333333-3333-4333-8333-333333333333",
  participantGrantId: "44444444-4444-4444-8444-444444444444",
  participantGrantVersion: 1,
  conversationId: "55555555-5555-4555-8555-555555555555",
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
    && (runtime.conversationId === undefined || UUID_PATTERN.test(runtime.conversationId))
    && (runtime.region === "ca" || runtime.region === "us"));
}

export function hasConnectedConversation(runtime?: CoordinationRuntime | null): runtime is CoordinationRuntime & Readonly<{ conversationId: EntityId }> {
  return Boolean(runtime && isValidCoordinationRuntime(runtime) && runtime.conversationId && UUID_PATTERN.test(runtime.conversationId));
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
  if (!hasConnectedConversation(runtime)) throw new Error("Connect another parent before using shared messages.");
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
  const [tasks, setTasks] = useState<readonly ParentingTask[]>([]);
  const [parentingSchedulePlan, setParentingSchedulePlan] = useState<ParentingSchedulePlan | null>(null);
  const [parentingScheduleExceptions, setParentingScheduleExceptions] = useState<readonly ParentingScheduleException[]>([]);
  const [messageCheckEnabled, setMessageCheckEnabledState] = useState(false);
  const [messageCheckHydrated, setMessageCheckHydrated] = useState(demoMode);
  const [messageCheckPreference, setMessageCheckPreference] = useState<MessageCheckPreference>();
  const [messageDraft, setMessageDraftState] = useState("");
  const [messagePreview, setMessagePreview] = useState<MessagePreviewResponse>();
  const [messageCheckBusy, setMessageCheckBusy] = useState(false);
  const [messageError, setMessageError] = useState<string>();
  const [sentMessages, setSentMessages] = useState<readonly SentMessage[]>([]);
  const [messageAttachments, setMessageAttachments] = useState<readonly ConversationAttachment[]>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string>();
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
    setTasks([]);
    setParentingSchedulePlan(null);
    setParentingScheduleExceptions([]);
    setSentMessages([]);
    setMessageAttachments([]);
    setAttachmentError(undefined);
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

    const connectedRuntime = hasConnectedConversation(activeRuntime) ? activeRuntime : undefined;
    setMessageCheckHydrated(!connectedRuntime);
    const outboxScope = connectedRuntime ? messageOutboxScope(connectedRuntime) : undefined;
    const retryScopeKey = outboxScope
      ? [outboxScope.actorIdentityId, outboxScope.sessionId, outboxScope.region, outboxScope.familyCircleId, outboxScope.conversationId].join(":")
      : undefined;
    const retry = !outboxScope || !retryScopeKey || retriedRuntimeScopes.current.has(retryScopeKey)
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
    const parentingTasks = typeof (resolvedApi as Partial<PeacePadCoordinationApi>).listParentingTasks === "function"
      ? resolvedApi.listParentingTasks(activeRuntime.familyCircleId)
      : Promise.resolve([] as readonly ParentingTask[]);
    const conversationAttachments = connectedRuntime
      && typeof (resolvedApi as Partial<PeacePadCoordinationApi>).listConversationAttachments === "function"
      ? resolvedApi.listConversationAttachments(connectedRuntime.conversationId)
      : Promise.resolve([] as readonly ConversationAttachment[]);
    const parentingSchedule = typeof (resolvedApi as Partial<PeacePadCoordinationApi>).getParentingSchedulePlan === "function"
      ? resolvedApi.getParentingSchedulePlan(activeRuntime.familyCircleId)
      : Promise.resolve(null);
    const parentingScheduleExceptionsRequest = typeof (resolvedApi as Partial<PeacePadCoordinationApi>).listParentingScheduleExceptions === "function"
      ? resolvedApi.listParentingScheduleExceptions(activeRuntime.familyCircleId)
      : Promise.resolve([] as readonly ParentingScheduleException[]);
    void retry.then(() => Promise.all([
      resolvedApi.listCalendarLayers(activeRuntime.familyCircleId),
      resolvedApi.listScheduleEvents(activeRuntime.familyCircleId),
      parentingTasks,
      connectedRuntime ? resolvedApi.listMessages(connectedRuntime.conversationId) : Promise.resolve([]),
      conversationAttachments,
      connectedRuntime ? resolvedApi.getMessageCheckPreference(connectedRuntime.conversationId) : Promise.resolve(undefined),
      connectedRuntime ? outbox.list() : Promise.resolve([]),
      parentingSchedule,
      parentingScheduleExceptionsRequest
    ])).then(([nextLayers, nextEvents, nextTasks, nextMessages, nextAttachments, preference, queuedMessages, nextParentingSchedule, nextScheduleExceptions]) => {
        if (cancelled || hydrationGeneration.current !== generation) return;
        setLayers(nextLayers);
        setVisibleLayerIds(nextLayers.map((layer) => layer.id));
        setEvents(nextEvents);
        setTasks(nextTasks);
        setParentingSchedulePlan(nextParentingSchedule);
        setParentingScheduleExceptions(nextScheduleExceptions);
        const waitingMessages = outboxScope ? queuedVisibleMessages(queuedMessages, outboxScope) : [];
        setSentMessages([...visibleMessages(nextMessages, activeRuntime.actorIdentityId), ...waitingMessages]);
        setMessageAttachments(nextAttachments);
        setMessageCheckPreference(preference);
        setMessageCheckEnabledState(preference?.enabled ?? false);
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
    if (demoMode || !hasConnectedConversation(activeRuntime) || !coordinationHydrated || !networkAvailable) return;
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
    connected: hasConnectedConversation(activeRuntime),
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
    tasks,
    parentingSchedulePlan,
    parentingScheduleExceptions,
    actorIdentityId: activeRuntime?.actorIdentityId,
    messageCheckEnabled,
    messageCheckHydrated,
    messageDraft,
    messagePreview,
    messageCheckBusy,
    messageError,
    sentMessages,
    messageAttachments,
    attachmentBusy,
    attachmentError,
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
    saveParentingSchedulePlan: async (input) => {
      if (!activeRuntime) throw new Error("Sign in to save a parenting schedule.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || Number.isNaN(Date.parse(`${input.startDate}T00:00:00.000Z`))) throw new Error("Enter a valid schedule start date.");
      const conversations = await resolvedApi.listConversations(activeRuntime.familyCircleId);
      const participants = conversations.find((item) => item.id === activeRuntime.conversationId)?.participantIdentityIds ?? [];
      const otherIdentityId = participants.find((identityId) => identityId !== activeRuntime.actorIdentityId) ?? null;
      if (input.primaryParent === "other" && !otherIdentityId) throw new Error("Connect the other parent before assigning their first parenting block.");
      const saved = await resolvedApi.saveParentingSchedulePlan(
        {
          familyCircleId: activeRuntime.familyCircleId,
          calendarLayerId: input.calendarLayerId,
          pattern: input.pattern,
          startDate: input.startDate,
          primaryParentIdentityId: input.primaryParent === "you" ? activeRuntime.actorIdentityId : otherIdentityId!,
          secondaryParentIdentityId: input.primaryParent === "you" ? otherIdentityId : activeRuntime.actorIdentityId,
          timezone: input.timezone,
          status: input.status
        },
        writeContext(activeRuntime, parentingSchedulePlan?.version ?? null)
      );
      setParentingSchedulePlan(saved);
    },
    createParentingScheduleException: async (input) => {
      if (!activeRuntime || !parentingSchedulePlan) throw new Error("Save the shared parenting plan before adding an exception.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)
        || Number.isNaN(Date.parse(`${input.startDate}T00:00:00.000Z`)) || Number.isNaN(Date.parse(`${input.endDate}T00:00:00.000Z`))
        || input.endDate < input.startDate) throw new Error("Enter a valid date range for this change.");
      const conversations = await resolvedApi.listConversations(activeRuntime.familyCircleId);
      const participants = conversations.find((item) => item.id === activeRuntime.conversationId)?.participantIdentityIds ?? [];
      const otherIdentityId = participants.find((identityId) => identityId !== activeRuntime.actorIdentityId) ?? null;
      if (input.assignedParent === "other" && !otherIdentityId) throw new Error("Connect the other parent before assigning this exception.");
      const created = await resolvedApi.createParentingScheduleException({
        familyCircleId: activeRuntime.familyCircleId,
        parentingSchedulePlanId: parentingSchedulePlan.id,
        assignedParentIdentityId: input.assignedParent === "you" ? activeRuntime.actorIdentityId : otherIdentityId!,
        kind: input.kind,
        startDate: input.startDate,
        endDate: input.endDate,
        note: input.note
      }, writeContext(activeRuntime));
      setParentingScheduleExceptions((current) => [created, ...current]);
    },
    resolveParentingScheduleException: async (exceptionId, resolution) => {
      if (!activeRuntime) throw new Error("Sign in to respond to this schedule request.");
      const current = parentingScheduleExceptions.find((item) => item.id === exceptionId);
      if (!current) return;
      const updated = await resolvedApi.resolveParentingScheduleException(exceptionId, resolution, writeContext(activeRuntime, current.version));
      setParentingScheduleExceptions((items) => items.map((item) => item.id === updated.id ? updated : item));
    },
    addEvent: async ({ layerId, title, startsAt, endsAt, eventType }) => {
      const layer = layers.find((item) => item.id === layerId);
      if (!layer || !title.trim()) return;
      if (!activeRuntime) throw new Error("Sign in to use family coordination.");
      const resolvedEventType = eventType ?? (layer.kind === "parenting-time" ? "parenting-time" : "appointment");
      if (resolvedEventType === "change-request" && !hasConnectedConversation(activeRuntime)) {
        throw new Error("Connect another parent before requesting a schedule change.");
      }
      const event = await resolvedApi.createScheduleEvent({
        familyCircleId: layer.familyCircleId,
        calendarLayerId: layer.id,
        childProfileIds: [],
        eventType: resolvedEventType,
        title: title.trim(),
        description: null,
        startsAt,
        endsAt,
        status: resolvedEventType === "change-request" ? "requested" : "planned",
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
    addTask: async ({ title, dueAt, shared }) => {
      const normalizedTitle = title.trim();
      if (!normalizedTitle) return undefined;
      if (!activeRuntime) throw new Error("Sign in to use PeacePad tasks.");
      const task = await resolvedApi.createParentingTask({
        familyCircleId: activeRuntime.familyCircleId,
        title: normalizedTitle,
        dueAt: dueAt?.trim() || null,
        assignedToIdentityId: null,
        visibility: shared && hasConnectedConversation(activeRuntime) ? { scope: "family" } : { scope: "private" }
      }, writeContext(activeRuntime));
      setTasks((current) => [...current, task]);
      return task;
    },
    setTaskCompleted: async (taskId, completed) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;
      if (!activeRuntime) throw new Error("Sign in to use PeacePad tasks.");
      const updated = await resolvedApi.updateParentingTask(
        { ...task, status: completed ? "completed" : "open" },
        writeContext(activeRuntime, task.version)
      );
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    },
    deleteTask: async (taskId) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;
      if (!activeRuntime) throw new Error("Sign in to use PeacePad tasks.");
      await resolvedApi.deleteParentingTask(task.id, writeContext(activeRuntime, task.version));
      setTasks((current) => current.filter((item) => item.id !== task.id));
    },
    setMessageDraft: (draft) => {
      setMessageDraftState(draft);
      setMessagePreview(undefined);
      setMessageError(undefined);
    },
    uploadMessageAttachment: async ({ originalFileName, mediaType, bytes }) => {
      if (!hasConnectedConversation(activeRuntime)) throw new Error("Connect another parent before sharing a file.");
      setAttachmentBusy(true);
      setAttachmentError(undefined);
      try {
        const context = writeContext(activeRuntime);
        const intent = await resolvedApi.createAttachmentUploadIntent({
          familyCircleId: activeRuntime.familyCircleId,
          target: { kind: "conversation", conversationId: activeRuntime.conversationId },
          originalFileName,
          mediaType,
          byteLength: bytes.byteLength
        }, context);
        await resolvedApi.uploadPrivateAttachment(intent, bytes);
        const attachment = await resolvedApi.completeConversationAttachment(intent.id, { ...context, expectedVersion: intent.version });
        setMessageAttachments((current) => [attachment, ...current.filter((item) => item.id !== attachment.id)]);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "PeacePad could not share that attachment.";
        setAttachmentError(message);
        throw cause;
      } finally {
        setAttachmentBusy(false);
      }
    },
    openMessageAttachment: async (attachmentId) => {
      const result = await resolvedApi.getConversationAttachmentDownload(attachmentId);
      return result.downloadUrl;
    },
    transcribeCoachAudio: async (bytes, mediaType) => {
      const result = await resolvedApi.transcribeCoachAudio(bytes, mediaType);
      return result.transcript;
    },
    coachConversationTurn: async (input) => {
      return resolvedApi.coachConversationTurn({
        ...input,
        conversationId: hasConnectedConversation(activeRuntime) ? activeRuntime.conversationId : undefined
      });
    },
    setMessageCheckEnabled: async (enabled) => {
      if (!hasConnectedConversation(activeRuntime) || (!demoMode && !messageCheckHydrated)) return;
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
      if (!hasConnectedConversation(activeRuntime) || !messageCheckHydrated || !messageCheckEnabled) return;
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
      if (!hasConnectedConversation(activeRuntime)) {
        setMessageError("Connect another parent before sending a shared message.");
        setMessageCheckBusy(false);
        return;
      }
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
      if (!hasConnectedConversation(activeRuntime) || queuedActionLocks.current.has(messageId)) return;
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
      if (!hasConnectedConversation(activeRuntime) || queuedActionLocks.current.has(messageId)) return;
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
        if (!hasConnectedConversation(activeRuntime)) throw new Error("Connect another parent before searching shared messages.");
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
        if (!hasConnectedConversation(activeRuntime)) throw new Error("Connect another parent before correcting shared messages.");
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
    messageAttachments,
    attachmentBusy,
    attachmentError,
    tasks,
    parentingSchedulePlan,
    parentingScheduleExceptions,
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
