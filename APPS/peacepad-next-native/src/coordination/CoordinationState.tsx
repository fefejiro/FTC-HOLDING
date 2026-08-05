import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MessagePreviewResponse } from "../api/contracts";
import {
  HttpPeacePadCoordinationApi,
  InvitationError,
  type CreatedInvitation,
  type PeacePadCoordinationApi
} from "../api/CoordinationApi";
import { defaultCalendarLayers, SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import { environmentConfig } from "../config/environment";
import { secureStagingSessionStore } from "../session/secureStagingSession";
import {
  createWriteContext,
  type CalendarLayer,
  type InvitationPreview,
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
};

const CoordinationStateContext = createContext<CoordinationStateValue | undefined>(undefined);

const seededInvitation: InvitationPreview = {
  invitationId: "invitation-demo",
  inviterDisplayName: "Jordan",
  familyDisplayName: "Shared parenting space",
  invitedRole: "parent",
  permissions: ["messages", "calendar", "shared-records"],
  expiresAt: "2099-01-01T00:00:00.000Z"
};

function createDefaultApi(): PeacePadCoordinationApi {
  if (environmentConfig.environment === "staging") {
    return new HttpPeacePadCoordinationApi(
      environmentConfig,
      fetch,
      async () => (await secureStagingSessionStore.read())?.accessToken
    );
  }
  return new SyntheticCoordinationApi([{ code: "CALM26", preview: seededInvitation }]);
}

function writeContext(expectedVersion: number | null = null) {
  return createWriteContext({
    idempotencyKey: `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    expectedVersion,
    region: "ca",
    actor: { identityId: "identity-current", sessionId: "session-device" }
  });
}

function invitationMessage(error: unknown): string {
  if (error instanceof InvitationError) return error.message;
  return "PeacePad could not verify that invitation. Try again.";
}

export function CoordinationStateProvider({
  api = createDefaultApi(),
  children,
  initialCalendarView = resolveCalendarStartView(process.env?.EXPO_PUBLIC_PEACEPAD_LAB_START_CALENDAR_VIEW)
}: {
  api?: PeacePadCoordinationApi;
  children: ReactNode;
  initialCalendarView?: CalendarView;
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

  useEffect(() => {
    if (environmentConfig.environment !== "staging") return;
    let active = true;
    void Promise.all([
      api.getMessageCheckPreference("conversation-primary"),
      api.listMessages("conversation-primary")
    ]).then(([preference, messages]) => {
      if (!active) return;
      setMessageCheckEnabledState(preference.enabled);
      setSentMessages(messages.filter((message) => message.eventType === "sent" && message.body).map((message) => ({
        id: message.id,
        originalBody: message.body ?? "",
        sentBody: message.body ?? "",
        sentAt: message.occurredAt
      })));
    }).catch(() => {
      // A conversation is established only after both staging participants connect.
    });
    return () => { active = false; };
  }, [api]);

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
    createInvitation: async () => {
      setInvitationBusy(true);
      setInvitationError(undefined);
      try {
        setCreatedInvitation(await api.createInvitation({
          familyCircleId: "family-current",
          invitedRole: "parent",
          permissions: ["messages", "calendar", "shared-records"],
          expiresInHours: 72
        }, writeContext()));
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
        await api.revokeInvitation(createdInvitation.invitation.id, writeContext(createdInvitation.invitation.version));
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
        setInvitationGrant(await api.acceptInvitation(invitationPreview.invitationId, writeContext()));
        setInvitationPreview(undefined);
      } catch (error) {
        setInvitationError(invitationMessage(error));
      } finally {
        setInvitationBusy(false);
      }
    },
    declineInvitation: async () => {
      if (invitationPreview) await api.declineInvitation(invitationPreview.invitationId, writeContext());
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
        writeContext(layer.version)
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
      }, writeContext());
      setEvents((current) => [...current, event]);
    },
    deleteEvent: async (eventId) => {
      await api.deleteScheduleEvent(eventId, writeContext());
      setEvents((current) => current.filter((event) => event.id !== eventId));
    },
    setMessageDraft: (draft) => {
      setMessageDraftState(draft);
      setMessagePreview(undefined);
      setMessageError(undefined);
    },
    setMessageCheckEnabled: async (enabled) => {
      await api.setMessageCheckPreference("conversation-primary", enabled, writeContext());
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
      try {
        const message = await api.sendMessage({
          familyCircleId: "family-current",
          conversationId: "conversation-primary",
          body: sentBody
        }, writeContext());
        setSentMessages((current) => [...current, {
          id: message.id,
          originalBody,
          sentBody: message.body ?? sentBody,
          sentAt: message.occurredAt
        }]);
        setMessageDraftState("");
        setMessagePreview(undefined);
      } catch (error) {
        setMessageError(error instanceof Error ? error.message : "PeacePad could not send that message.");
      } finally {
        setMessageCheckBusy(false);
      }
    }
  }), [
    api,
    calendarView,
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
