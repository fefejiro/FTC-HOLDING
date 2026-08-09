import type { MessagePreviewResponse } from "./contracts";
import { PeacePadApiError } from "./PeacePadApiClient";
import {
  InvitationError,
  type CorrectMessageInput,
  type CreateAttachmentUploadIntentInput,
  type CreateCalendarLayerInput,
  type CreateConversationInput,
  type CreateInvitationInput,
  type CreatedInvitation,
  type CreatedFamily,
  type CreateScheduleEventInput,
  type RecordMessageLifecycleInput,
  type MessageSearchResult,
  type SendMessageInput,
  type PeacePadCoordinationApi
} from "./CoordinationApi";
import {
  PEACEPAD_V2_SCHEMA_VERSION,
  type AcceptedInvitation,
  type AttachmentUploadIntent,
  type ActorReference,
  type CalendarLayer,
  type Conversation,
  type EntityId,
  type FamilyInvitation,
  type InvitationPreview,
  type MessageCheckPreference,
  type MessageEvent,
  type ParticipantGrant,
  type RecordProvenance,
  type ScheduleEvent,
  type VersionedEntity,
  type WriteContext
} from "../domain/v2";

type SeedInvitation = Readonly<{
  code: string;
  preview: InvitationPreview;
  state?: "pending" | "expired" | "revoked" | "used";
}>;

const actor: ActorReference = {
  identityId: "identity-current",
  sessionId: "session-device"
};

function provenance(): RecordProvenance {
  return {
    createdAt: new Date().toISOString(),
    createdBy: actor,
    source: "app"
  };
}

function versioned(id: string): VersionedEntity {
  return {
    id,
    schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
    version: 1,
    region: "ca",
    provenance: provenance()
  };
}

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export const defaultCalendarLayers: readonly CalendarLayer[] = [
  ["layer-parenting", "Parenting Time", "parenting-time", "clock", "teal"],
  ["layer-expenses", "Expenses & Requests", "expenses-requests", "receipt", "green"],
  ["layer-events", "Events & Activities", "events-activities", "activity", "violet"],
  ["layer-calls", "Calls", "calls", "phone", "blue"]
].map(([id, name, kind, icon, colorToken]) => ({
  ...versioned(id),
  familyCircleId: "family-current",
  ownerIdentityId: "identity-current",
  name,
  kind: kind as CalendarLayer["kind"],
  icon: icon as CalendarLayer["icon"],
  colorToken: colorToken as CalendarLayer["colorToken"],
  visibility: { scope: "private" }
}));

export class SyntheticCoordinationApi implements PeacePadCoordinationApi {
  private readonly invitations = new Map<string, SeedInvitation>();
  private readonly invitationsById = new Map<string, SeedInvitation>();
  private readonly invitationStates = new Map<string, NonNullable<SeedInvitation["state"]>>();
  private createdInvitationCount = 0;
  private layers = [...defaultCalendarLayers];
  private events: ScheduleEvent[] = [];
  private conversations: Conversation[] = [{
    ...versioned("conversation-primary"),
    familyCircleId: "family-current",
    participantIdentityIds: ["identity-current", "identity-coparent"],
    status: "active"
  }, {
    ...versioned("conversation-1"),
    familyCircleId: "family-current",
    participantIdentityIds: ["identity-current", "identity-coparent"],
    status: "active"
  }];
  private messages: MessageEvent[] = [];
  private messageCheckPreferences = new Map<string, MessageCheckPreference>();
  private previewAttempts = 0;

  constructor(seedInvitations: readonly SeedInvitation[] = []) {
    seedInvitations.forEach((seed) => {
      this.invitations.set(normalizeCode(seed.code), seed);
      this.invitationsById.set(seed.preview.invitationId, seed);
      this.invitationStates.set(seed.preview.invitationId, seed.state ?? "pending");
    });
  }

  async createInvitation(input: CreateInvitationInput, _context: WriteContext): Promise<CreatedInvitation> {
    const invitationId = `invitation-${Date.now().toString(36)}`;
    this.createdInvitationCount += 1;
    const code = `P${this.createdInvitationCount.toString(36).padStart(5, "0")}`.toUpperCase();
    const invitation: FamilyInvitation = {
      ...versioned(invitationId),
      familyCircleId: input.familyCircleId,
      invitedRole: input.invitedRole,
      permissions: input.permissions,
      invitedByIdentityId: "identity-current",
      expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString(),
      status: "pending",
      acceptedParticipantGrantId: null
    };
    const seed: SeedInvitation = {
      code,
      preview: {
        invitationId,
        version: invitation.version,
        inviterDisplayName: "PeacePad member",
        familyDisplayName: "Shared parenting space",
        invitedRole: input.invitedRole,
        permissions: input.permissions,
        expiresAt: invitation.expiresAt
      },
      state: "pending"
    };
    this.invitations.set(code, seed);
    this.invitationsById.set(invitationId, seed);
    this.invitationStates.set(invitationId, "pending");
    return { invitation, code, deepLink: `peacepadnextlab://invite/${code}` };
  }

  async createAttachmentUploadIntent(input: CreateAttachmentUploadIntentInput, _context: WriteContext): Promise<AttachmentUploadIntent> {
    this.assertCurrentFamily(input.familyCircleId);
    const now = new Date();
    return {
      ...versioned(`attachment-intent-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      ownerIdentityId: "identity-current",
      target: input.target,
      originalFileName: input.originalFileName,
      mediaType: input.mediaType,
      byteLength: input.byteLength,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      status: "metadata-prepared",
      uploadTransport: "disabled",
      uploadUrl: null
    };
  }

  async resolveInvitation(code: string): Promise<InvitationPreview> {
    this.previewAttempts += 1;
    if (this.previewAttempts > 8) {
      throw new InvitationError("rate-limited", "Too many attempts. Wait a moment and try again.");
    }
    const seed = this.invitations.get(normalizeCode(code));
    if (!seed) throw new InvitationError("invalid", "Check the code and try again.");
    const state = this.invitationStates.get(seed.preview.invitationId) ?? "pending";
    if (state !== "pending") {
      throw new InvitationError(state, `This invitation is ${state}.`);
    }
    return seed.preview;
  }

  async acceptInvitation(invitationId: EntityId, context: WriteContext): Promise<AcceptedInvitation> {
    const seed = this.invitationsById.get(invitationId);
    const state = seed ? this.invitationStates.get(invitationId) ?? "pending" : "invalid";
    if (!seed || state !== "pending") {
      throw new InvitationError(state === "pending" ? "invalid" : state, "This invitation is not available.");
    }
    if (context.expectedVersion !== seed.preview.version) {
      throw new PeacePadApiError("The invitation changed. Review it again before accepting.", "http", 409);
    }
    this.invitationStates.set(invitationId, "used");
    const grant: ParticipantGrant = {
      ...versioned(`grant-${invitationId}`),
      familyCircleId: "family-current",
      identityId: "identity-current",
      role: seed.preview.invitedRole,
      permissions: seed.preview.permissions,
      grantedAt: new Date().toISOString(),
      revokedAt: null,
      grantedBy: "identity-inviter"
    };
    const conversation: Conversation = {
      ...versioned(`conversation-${invitationId}`),
      familyCircleId: grant.familyCircleId,
      participantIdentityIds: [grant.identityId, grant.grantedBy],
      status: "active"
    };
    return { grant, conversation };
  }

  async declineInvitation(invitationId: EntityId, context: WriteContext): Promise<void> {
    this.assertInvitationVersion(invitationId, context.expectedVersion);
    this.transitionInvitation(invitationId, "used");
  }

  async deleteAccount(context: WriteContext) {
    return {
      identityId: context.actor.identityId,
      region: context.region,
      status: "deleted" as const,
      deletedAt: new Date().toISOString(),
      version: (context.expectedVersion ?? 0) + 1,
      authIdentityDeleted: true,
      refreshSessionsRevoked: true,
      authCleanupPending: false
    };
  }

  async createFamily(familyName: string, _context: WriteContext): Promise<CreatedFamily> {
    if (!familyName.trim()) throw new PeacePadApiError("Enter a family name.", "http", 400);
    return {
      familyId: "family-current",
      participantGrantId: "grant-current",
      familyName: familyName.trim(),
      region: "ca"
    };
  }

  async revokeInvitation(invitationId: EntityId, context: WriteContext): Promise<void> {
    this.assertInvitationVersion(invitationId, context.expectedVersion);
    this.transitionInvitation(invitationId, "revoked");
  }

  async listCalendarLayers(familyCircleId: EntityId): Promise<readonly CalendarLayer[]> {
    return this.layers.filter((layer) => layer.familyCircleId === familyCircleId);
  }

  async createCalendarLayer(input: CreateCalendarLayerInput, _context: WriteContext): Promise<CalendarLayer> {
    this.assertCurrentFamily(input.familyCircleId);
    const layer: CalendarLayer = { ...versioned(`layer-${Date.now().toString(36)}`), ...input };
    this.layers = [...this.layers, layer];
    return layer;
  }

  async updateCalendarLayer(layer: CalendarLayer, _context: WriteContext): Promise<CalendarLayer> {
    this.assertCurrentFamily(layer.familyCircleId);
    if (!this.layers.some((item) => item.id === layer.id && item.familyCircleId === layer.familyCircleId)) {
      throw new PeacePadApiError("Calendar not found.", "http", 404);
    }
    const updated = { ...layer, version: layer.version + 1 };
    this.layers = this.layers.map((item) => (item.id === layer.id ? updated : item));
    return updated;
  }

  async deleteCalendarLayer(layerId: EntityId, _context: WriteContext): Promise<void> {
    this.layers = this.layers.filter((layer) => layer.id !== layerId);
    this.events = this.events.filter((event) => event.calendarLayerId !== layerId);
  }

  async listScheduleEvents(familyCircleId: EntityId): Promise<readonly ScheduleEvent[]> {
    return this.events.filter((event) => event.familyCircleId === familyCircleId);
  }

  async createScheduleEvent(input: CreateScheduleEventInput, _context: WriteContext): Promise<ScheduleEvent> {
    this.assertCurrentFamily(input.familyCircleId);
    if (!this.layers.some((layer) => layer.id === input.calendarLayerId && layer.familyCircleId === input.familyCircleId)) {
      throw new PeacePadApiError("Calendar not found.", "http", 404);
    }
    const event: ScheduleEvent = { ...versioned(`event-${Date.now().toString(36)}`), ...input };
    this.events = [...this.events, event];
    return event;
  }

  async updateScheduleEvent(event: ScheduleEvent, _context: WriteContext): Promise<ScheduleEvent> {
    this.assertCurrentFamily(event.familyCircleId);
    if (!this.events.some((item) => item.id === event.id && item.familyCircleId === event.familyCircleId)) {
      throw new PeacePadApiError("Event not found.", "http", 404);
    }
    const updated = { ...event, version: event.version + 1 };
    this.events = this.events.map((item) => (item.id === event.id ? updated : item));
    return updated;
  }

  async deleteScheduleEvent(eventId: EntityId, _context: WriteContext): Promise<void> {
    this.events = this.events.filter((event) => event.id !== eventId);
  }

  async listConversations(familyCircleId: EntityId): Promise<readonly Conversation[]> {
    return this.conversations.filter((conversation) => conversation.familyCircleId === familyCircleId);
  }

  async createConversation(input: CreateConversationInput, _context: WriteContext): Promise<Conversation> {
    this.assertCurrentFamily(input.familyCircleId);
    const participants = [...new Set(input.participantIdentityIds)];
    if (!participants.includes("identity-current") || participants.length < 2) {
      throw new PeacePadApiError("Choose at least two conversation participants.", "http", 400);
    }
    const conversation: Conversation = {
      ...versioned(`conversation-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      participantIdentityIds: participants,
      status: "active"
    };
    this.conversations = [...this.conversations, conversation];
    return conversation;
  }

  async listMessages(conversationId: EntityId): Promise<readonly MessageEvent[]> {
    this.assertConversation(conversationId);
    return this.messages.filter((message) => message.conversationId === conversationId);
  }

  async sendMessage(input: SendMessageInput, _context: WriteContext): Promise<MessageEvent> {
    const conversation = this.assertConversation(input.conversationId);
    if (conversation.familyCircleId !== input.familyCircleId || !input.body.trim()) {
      throw new PeacePadApiError("Enter a message for this conversation.", "http", 400);
    }
    const message: MessageEvent = {
      ...versioned(`message-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      conversationId: input.conversationId,
      eventType: "sent",
      originalMessageEventId: null,
      body: input.body.trim(),
      occurredAt: new Date().toISOString()
    };
    this.messages = [...this.messages, message];
    return message;
  }

  async recordMessageLifecycle(input: RecordMessageLifecycleInput, _context: WriteContext): Promise<MessageEvent> {
    const conversation = this.assertConversation(input.conversationId);
    const original = this.messages.find((message) => message.id === input.originalMessageEventId && message.eventType === "sent");
    if (!original || original.familyCircleId !== input.familyCircleId || conversation.familyCircleId !== input.familyCircleId) {
      throw new PeacePadApiError("Message not found.", "http", 404);
    }
    const existing = this.messages.find((message) => message.eventType === input.eventType && message.originalMessageEventId === original.id);
    if (existing) return existing;
    const event: MessageEvent = {
      ...versioned(`message-${input.eventType}-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      conversationId: input.conversationId,
      eventType: input.eventType,
      originalMessageEventId: original.id,
      body: null,
      occurredAt: new Date().toISOString()
    };
    this.messages = [...this.messages, event];
    return event;
  }

  async correctMessage(input: CorrectMessageInput, _context: WriteContext): Promise<MessageEvent> {
    const conversation = this.assertConversation(input.conversationId);
    const body = input.body.trim();
    const original = this.messages.find((message) => message.id === input.originalMessageEventId && message.eventType === "sent");
    if (!original || original.familyCircleId !== input.familyCircleId || conversation.familyCircleId !== input.familyCircleId) {
      throw new PeacePadApiError("Message not found.", "http", 404);
    }
    if (original.provenance.createdBy.identityId !== "identity-current") {
      throw new PeacePadApiError("Only the sender can correct this message.", "http", 403);
    }
    if (!body || body.length > 10000) throw new PeacePadApiError("Enter a correction under 10,000 characters.", "http", 400);
    if (this.effectiveMessage(original).body === body) throw new PeacePadApiError("The correction must change the message.", "http", 400);
    const correction: MessageEvent = {
      ...versioned(`message-correction-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      conversationId: input.conversationId,
      eventType: "correction",
      originalMessageEventId: original.id,
      body,
      occurredAt: new Date().toISOString()
    };
    this.messages = [...this.messages, correction];
    return correction;
  }

  async searchMessages(conversationId: EntityId, query: string, limit = 20): Promise<readonly MessageSearchResult[]> {
    this.assertConversation(conversationId);
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized.length < 2 || normalized.length > 100) throw new PeacePadApiError("Enter between 2 and 100 characters to search.", "http", 400);
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    return this.messages
      .filter((message) => message.conversationId === conversationId && message.eventType === "sent" && message.body)
      .map((message) => this.effectiveMessage(message))
      .filter((message) => message.body.toLocaleLowerCase().includes(normalized))
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || right.originalMessageEventId.localeCompare(left.originalMessageEventId))
      .slice(0, boundedLimit);
  }

  async getMessageCheckPreference(conversationId: EntityId): Promise<MessageCheckPreference> {
    this.assertConversation(conversationId);
    return this.messageCheckPreferences.get(conversationId) ?? {
      ...versioned(`message-check-${conversationId}`),
      identityId: "identity-current",
      conversationId,
      enabled: false,
      aiAssistanceEnabled: false
    };
  }

  async setMessageCheckPreference(
    conversationId: EntityId,
    enabled: boolean,
    _context: WriteContext
  ): Promise<MessageCheckPreference> {
    this.assertConversation(conversationId);
    const preference: MessageCheckPreference = {
      ...versioned(`message-check-${conversationId}`),
      identityId: "identity-current",
      conversationId,
      enabled,
      aiAssistanceEnabled: false
    };
    this.messageCheckPreferences.set(conversationId, preference);
    return preference;
  }

  async previewMessage(conversationId: EntityId, content: string): Promise<MessagePreviewResponse> {
    this.assertConversation(conversationId);
    const originalMessage = content.trim();
    if (!originalMessage) throw new Error("Enter a message to check.");
    const needsPause = /\b(always|never|your fault|lying|liar|useless)\b|!{2,}/i.test(originalMessage);
    return {
      tone: needsPause ? "pause suggested" : "clear",
      summary: needsPause
        ? "Consider focusing on the practical request."
        : "This message is direct and focused on practical details.",
      rewordingSuggestion: needsPause ? "Please confirm the practical details when you can." : null,
      originalMessage
    };
  }

  private transitionInvitation(invitationId: EntityId, nextState: "used" | "revoked") {
    if (!this.invitationsById.has(invitationId)) {
      throw new InvitationError("invalid", "This invitation is not available.");
    }
    const state = this.invitationStates.get(invitationId) ?? "pending";
    if (state !== "pending") {
      throw new InvitationError(state, "This invitation is not available.");
    }
    this.invitationStates.set(invitationId, nextState);
  }

  private assertInvitationVersion(invitationId: EntityId, expectedVersion: number | null) {
    const seed = this.invitationsById.get(invitationId);
    if (seed && expectedVersion !== seed.preview.version) {
      throw new PeacePadApiError("The invitation changed. Review it again before continuing.", "http", 409);
    }
  }

  private assertCurrentFamily(familyCircleId: EntityId) {
    if (familyCircleId !== "family-current") {
      throw new PeacePadApiError("You do not have access to that family.", "http", 403);
    }
  }


  private assertConversation(conversationId: EntityId) {
    const conversation = this.conversations.find((item) => item.id === conversationId);
    if (!conversation || !conversation.participantIdentityIds.includes("identity-current")) {
      throw new PeacePadApiError("Conversation not found.", "http", 404);
    }
    return conversation;
  }

  private effectiveMessage(original: MessageEvent): MessageSearchResult {
    const corrections = this.messages
      .filter((message) => message.eventType === "correction" && message.originalMessageEventId === original.id && message.body)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id));
    const effective = corrections[corrections.length - 1] ?? original;
    return {
      originalMessageEventId: original.id,
      effectiveMessageEventId: effective.id,
      body: effective.body ?? "",
      occurredAt: original.occurredAt,
      corrected: effective.id !== original.id
    };
  }
}
