import type { MessagePreviewResponse } from "./contracts";
import { PeacePadApiError } from "./PeacePadApiClient";
import {
  InvitationError,
  type AudioCallSession,
  type AudioCallSignal,
  type AudioCallSignalReceipt,
  type DevicePushRegistration,
  type RegisterDevicePushInput,
  type RevokedDevicePushRegistration,
  type CorrectMessageInput,
  type CreateAttachmentUploadIntentInput,
  type CreateCaseBinderInput,
  type CreateCalendarLayerInput,
  type CreateParentingTaskInput,
  type CreateConversationInput,
  type CreateInvitationInput,
  type CreatedInvitation,
  type CreatedFamily,
  type AccountExportManifest,
  type CreateScheduleEventInput,
  type SaveParentingSchedulePlanInput,
  type CreateParentingScheduleExceptionInput,
  type CreateChildProfileInput,
  type CreateChildUpdateInput,
  type CreateExpenseInput,
  type CreateSettlementInput,
  type SupportSearchInput,
  type CreateScheduledCallInput,
  type CreateConchSessionInput,
  type RecordMessageLifecycleInput,
  type MessageSearchResult,
  type LinkTimelineSourceInput,
  type SendMessageInput,
  type PersonalityPreference,
  type PersonalityType,
  type PeacePadCoordinationApi
} from "./CoordinationApi";
import {
  PEACEPAD_V2_SCHEMA_VERSION,
  type AcceptedInvitation,
  type AttachmentUploadIntent,
  type CaseBinder,
  type ActorReference,
  type CalendarLayer,
  type Conversation,
  type ConversationAttachment,
  type ConversationAttachmentDownload,
  type ExpenseReceiptAttachment,
  type ExpenseReceiptDownload,
  type EntityId,
  type FamilyInvitation,
  type InvitationPreview,
  type MessageCheckPreference,
  type MessageEvent,
  type ParticipantGrant,
  type PrivateAttachment,
  type PrivateAttachmentDownload,
  type PrivateTimelineEntry,
  type ParentingTask,
  type ParentingScheduleException,
  type ParentingSchedulePlan,
  type RecordProvenance,
  type ScheduleEvent,
  type VersionedEntity,
  type WriteContext
} from "../domain/v2";
import type {
  ChildUpdate,
  ConchReaction,
  ConchSession,
  ConchTurn,
  ExpenseSettlement,
  FamilyBalance,
  FamilyExpense,
  MediaCallSession,
  ScheduledCall,
  SupportResource
} from "../domain/parentCore";
import type { ChildProfile } from "../domain/v2";

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

// The synthetic API keeps older fixture ids stable for focused unit tests,
// while the app's demo runtime deliberately uses UUID-shaped values.
const demoFamilyCircleId = "33333333-3333-4333-8333-333333333333";
const demoConversationId = "55555555-5555-4555-8555-555555555555";
const demoActorIdentityId = "11111111-1111-4111-8111-111111111111";

function matchesSyntheticFamily(storedFamilyCircleId: EntityId, requestedFamilyCircleId: EntityId): boolean {
  return storedFamilyCircleId === requestedFamilyCircleId
    || (storedFamilyCircleId === "family-current" && requestedFamilyCircleId === demoFamilyCircleId);
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
  private parentingSchedulePlan: ParentingSchedulePlan | null = null;
  private parentingScheduleExceptions: ParentingScheduleException[] = [];
  private tasks: ParentingTask[] = [];
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
  private binders: CaseBinder[] = [];
  private timelineEntries: PrivateTimelineEntry[] = [];
  private attachments: PrivateAttachment[] = [];
  private conversationAttachments: ConversationAttachment[] = [];
  private expenseReceipts: ExpenseReceiptAttachment[] = [];
  private attachmentIntents = new Map<string, AttachmentUploadIntent>();
  private audioCall: AudioCallSession | null = null;
  private devicePushRegistration: DevicePushRegistration | null = null;
  private personalityPreference: PersonalityPreference = {
    identityId: actor.identityId,
    region: "ca",
    personalityType: null,
    updatedAt: null,
    version: 0,
    schemaVersion: "2.0"
  };
  private childProfiles: ChildProfile[] = [];
  private childUpdates: ChildUpdate[] = [];
  private expenses: FamilyExpense[] = [];
  private settlements: ExpenseSettlement[] = [];
  private scheduledCalls: ScheduledCall[] = [];
  private videoCall: MediaCallSession | null = null;
  private conchSession: ConchSession | null = null;
  private conchTurns: ConchTurn[] = [];

  constructor(seedInvitations: readonly SeedInvitation[] = []) {
    seedInvitations.forEach((seed) => {
      this.invitations.set(normalizeCode(seed.code), seed);
      this.invitationsById.set(seed.preview.invitationId, seed);
      this.invitationStates.set(seed.preview.invitationId, seed.state ?? "pending");
    });
  }

  async getCurrentAudioCall(conversationId: EntityId): Promise<AudioCallSession | null> {
    return this.audioCall?.conversationId === conversationId ? this.audioCall : null;
  }

  async createAudioCall(conversationId: EntityId, _context: WriteContext): Promise<AudioCallSession> {
    if (this.audioCall && ["ringing", "active"].includes(this.audioCall.status)) {
      throw new PeacePadApiError("A call is already in progress.", "http", 409);
    }
    const now = new Date();
    this.audioCall = {
      id: `call-${Date.now().toString(36)}`,
      familyCircleId: "family-current",
      conversationId,
      callerIdentityId: "identity-current",
      calleeIdentityId: "identity-coparent",
      type: "audio",
      status: "ringing",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      acceptedAt: null,
      endedAt: null,
      endedByIdentityId: null,
      endReason: null,
      schemaVersion: "2.0",
      version: 1,
      region: "ca"
    };
    return this.audioCall;
  }

  async acceptAudioCall(callId: EntityId, context: WriteContext): Promise<AudioCallSession> {
    return this.transitionAudioCall(callId, context, "active", null);
  }

  async declineAudioCall(callId: EntityId, context: WriteContext): Promise<AudioCallSession> {
    return this.transitionAudioCall(callId, context, "declined", "declined");
  }

  async endAudioCall(callId: EntityId, context: WriteContext): Promise<AudioCallSession> {
    return this.transitionAudioCall(
      callId,
      context,
      "ended",
      this.audioCall?.status === "ringing" ? "caller_cancelled" : "participant_ended"
    );
  }

  async sendAudioCallSignal(callId: EntityId, _signal: AudioCallSignal, context: WriteContext): Promise<AudioCallSignalReceipt> {
    if (!this.audioCall || this.audioCall.id !== callId || this.audioCall.version !== context.expectedVersion || !["ringing", "active"].includes(this.audioCall.status)) {
      throw new PeacePadApiError("The call changed. Refresh before continuing.", "http", 409);
    }
    const sentAt = new Date().toISOString();
    return {
      delivered: true,
      callId,
      peerIdentityId: this.audioCall.calleeIdentityId,
      callVersion: this.audioCall.version,
      sentAt,
      expiresAt: new Date(Date.now() + 15_000).toISOString()
    };
  }

  async getAudioCallTurnCredentials(_callId: EntityId, _context: WriteContext): Promise<never> {
    throw new PeacePadApiError("Secure audio relay is unavailable in demo mode.", "http", 503);
  }

  private transitionAudioCall(
    callId: EntityId,
    context: WriteContext,
    status: AudioCallSession["status"],
    endReason: AudioCallSession["endReason"]
  ): AudioCallSession {
    if (!this.audioCall || this.audioCall.id !== callId || this.audioCall.version !== context.expectedVersion) {
      throw new PeacePadApiError("The call changed. Refresh before continuing.", "http", 409);
    }
    const now = new Date().toISOString();
    this.audioCall = {
      ...this.audioCall,
      status,
      acceptedAt: status === "active" ? now : this.audioCall.acceptedAt,
      endedAt: ["declined", "ended", "expired"].includes(status) ? now : null,
      endedByIdentityId: ["declined", "ended"].includes(status) ? actor.identityId : null,
      endReason,
      version: this.audioCall.version + 1
    };
    return this.audioCall;
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
    const intent: AttachmentUploadIntent = {
      ...versioned(`attachment-intent-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      ownerIdentityId: "identity-current",
      target: input.target,
      originalFileName: input.originalFileName,
      mediaType: input.mediaType,
      byteLength: input.byteLength,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      status: "awaiting-upload",
      uploadTransport: "supabase-signed",
      uploadUrl: "https://storage.peacepad.test/upload/fictional",
      objectPath: input.target.kind === "private-binder"
        ? `ca/identity-current/${input.target.binderId}/fictional`
        : input.target.kind === "conversation"
          ? `ca/conversations/${input.target.conversationId}/fictional`
          : "ca/expense-receipts/identity-current/fictional"
    };
    this.attachmentIntents.set(intent.id, intent);
    return intent;
  }

  async registerDevicePush(input: RegisterDevicePushInput, _context: WriteContext): Promise<DevicePushRegistration> {
    this.devicePushRegistration = {
      registrationId: `push-${Date.now().toString(36)}`,
      platform: input.platform,
      transport: input.transport,
      appId: input.appId,
      version: (this.devicePushRegistration?.version ?? 0) + 1
    };
    return this.devicePushRegistration;
  }

  async revokeDevicePush(registrationId: EntityId, context: WriteContext): Promise<RevokedDevicePushRegistration> {
    if (
      !this.devicePushRegistration
      || this.devicePushRegistration.registrationId !== registrationId
      || this.devicePushRegistration.version !== context.expectedVersion
    ) throw new PeacePadApiError("The notification registration changed.", "http", 409);
    const response = { registrationId, status: "revoked" as const, version: this.devicePushRegistration.version + 1 };
    this.devicePushRegistration = null;
    return response;
  }

  async uploadPrivateAttachment(intent: AttachmentUploadIntent, bytes: ArrayBuffer): Promise<void> {
    if (!this.attachmentIntents.has(intent.id) || bytes.byteLength !== intent.byteLength) {
      throw new PeacePadApiError("The fictional private upload could not be verified.", "http", 400);
    }
  }

  async completePrivateAttachment(attachmentId: EntityId, _context: WriteContext): Promise<PrivateAttachment> {
    const intent = this.attachmentIntents.get(attachmentId);
    if (!intent || intent.target.kind !== "private-binder") throw new PeacePadApiError("Attachment not found.", "http", 404);
    const attachment: PrivateAttachment = {
      ...versioned(intent.id),
      familyCircleId: intent.familyCircleId,
      ownerIdentityId: intent.ownerIdentityId,
      target: intent.target,
      originalFileName: intent.originalFileName,
      mediaType: intent.mediaType,
      byteLength: intent.byteLength,
      status: "available"
    };
    this.attachments = [attachment, ...this.attachments.filter((candidate) => candidate.id !== attachment.id)];
    return attachment;
  }

  async listPrivateAttachments(binderId: EntityId): Promise<readonly PrivateAttachment[]> {
    return this.attachments.filter((attachment) => attachment.target.binderId === binderId);
  }

  async getPrivateAttachmentDownload(attachmentId: EntityId): Promise<PrivateAttachmentDownload> {
    const attachment = this.attachments.find((candidate) => candidate.id === attachmentId);
    if (!attachment) throw new PeacePadApiError("Attachment not found.", "http", 404);
    return {
      attachment,
      downloadUrl: "https://storage.peacepad.test/download/fictional",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    };
  }

  async completeConversationAttachment(attachmentId: EntityId, _context: WriteContext): Promise<ConversationAttachment> {
    const intent = this.attachmentIntents.get(attachmentId);
    if (!intent || intent.target.kind !== "conversation") throw new PeacePadApiError("Conversation attachment not found.", "http", 404);
    const attachment: ConversationAttachment = {
      ...versioned(intent.id), familyCircleId: intent.familyCircleId, ownerIdentityId: intent.ownerIdentityId,
      target: intent.target, originalFileName: intent.originalFileName, mediaType: intent.mediaType,
      byteLength: intent.byteLength, status: "available", occurredAt: new Date().toISOString()
    };
    this.conversationAttachments = [attachment, ...this.conversationAttachments.filter((item) => item.id !== attachment.id)];
    return attachment;
  }

  async listConversationAttachments(conversationId: EntityId): Promise<readonly ConversationAttachment[]> {
    return this.conversationAttachments.filter((attachment) => attachment.target.conversationId === conversationId);
  }

  async getConversationAttachmentDownload(attachmentId: EntityId): Promise<ConversationAttachmentDownload> {
    const attachment = this.conversationAttachments.find((item) => item.id === attachmentId);
    if (!attachment) throw new PeacePadApiError("Conversation attachment not found.", "http", 404);
    return { attachment, downloadUrl: "https://storage.peacepad.test/download/conversation-fictional", expiresAt: new Date(Date.now() + 60_000).toISOString() };
  }

  async completeExpenseReceipt(attachmentId: EntityId, _context: WriteContext): Promise<ExpenseReceiptAttachment> {
    const intent = this.attachmentIntents.get(attachmentId);
    if (!intent || intent.target.kind !== "expense-receipt" || !["image/jpeg", "image/png", "application/pdf"].includes(intent.mediaType)) throw new PeacePadApiError("Expense receipt not found.", "http", 404);
    const attachment: ExpenseReceiptAttachment = {
      ...versioned(intent.id), familyCircleId: intent.familyCircleId, ownerIdentityId: intent.ownerIdentityId,
      target: intent.target, originalFileName: intent.originalFileName,
      mediaType: intent.mediaType as ExpenseReceiptAttachment["mediaType"], byteLength: intent.byteLength,
      status: "available", linkedExpenseId: null
    };
    this.expenseReceipts = [attachment, ...this.expenseReceipts.filter((item) => item.id !== attachment.id)];
    return attachment;
  }

  async getExpenseReceiptDownload(attachmentId: EntityId): Promise<ExpenseReceiptDownload> {
    const attachment = this.expenseReceipts.find((item) => item.id === attachmentId);
    if (!attachment) throw new PeacePadApiError("Expense receipt not found.", "http", 404);
    return { attachment, downloadUrl: "https://storage.peacepad.test/download/receipt-fictional", expiresAt: new Date(Date.now() + 60_000).toISOString() };
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

  async listPrivateTimeline(binderId: EntityId): Promise<readonly PrivateTimelineEntry[]> {
    return this.timelineEntries.filter((entry) => entry.caseBinderId === binderId);
  }

  async linkTimelineSource(input: LinkTimelineSourceInput, _context: WriteContext): Promise<PrivateTimelineEntry> {
    this.assertCurrentFamily(input.familyCircleId);
    const binder = this.binders.find((candidate) => candidate.id === input.caseBinderId && candidate.status === "active");
    if (!binder) throw new PeacePadApiError("Case Binder not found.", "http", 404);
    const message = input.sourceKind === "message-event"
      ? this.messages.find((candidate) => candidate.id === input.sourceId && ["sent", "correction"].includes(candidate.eventType))
      : undefined;
    const event = input.sourceKind === "schedule-event" ? this.events.find((candidate) => candidate.id === input.sourceId) : undefined;
    if (!message && !event) throw new PeacePadApiError("Timeline source not found.", "http", 404);
    if (this.timelineEntries.some((candidate) => candidate.caseBinderId === input.caseBinderId && candidate.source.sourceId === input.sourceId)) {
      throw new PeacePadApiError("This source is already linked.", "http", 409);
    }
    const entry: PrivateTimelineEntry = {
      ...versioned(`timeline-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      ownerIdentityId: "identity-current",
      caseBinderId: input.caseBinderId,
      source: message ? {
        kind: "message-event",
        sourceId: message.id,
        eventType: message.eventType === "correction" ? "correction" : "sent",
        sourceVersion: null
      } : {
        kind: "schedule-event",
        sourceId: event!.id,
        eventType: event!.eventType,
        sourceVersion: event!.version
      },
      occurredAt: message?.occurredAt ?? event!.startsAt
    };
    this.timelineEntries = [...this.timelineEntries, entry];
    return entry;
  }

  async listCaseBinders(familyCircleId: EntityId): Promise<readonly CaseBinder[]> {
    this.assertCurrentFamily(familyCircleId);
    return this.binders.filter((binder) => binder.familyCircleId === familyCircleId);
  }

  async createCaseBinder(input: CreateCaseBinderInput, _context: WriteContext): Promise<CaseBinder> {
    this.assertCurrentFamily(input.familyCircleId);
    const binder: CaseBinder = {
      ...versioned(`binder-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      ownerIdentityId: actor.identityId,
      name: input.name.trim(),
      childLabel: input.childLabel.trim(),
      status: "active"
    };
    this.binders = [...this.binders, binder];
    return binder;
  }

  async archiveCaseBinder(binderId: EntityId, _context: WriteContext): Promise<CaseBinder> {
    const current = this.binders.find((binder) => binder.id === binderId);
    if (!current) throw new PeacePadApiError("Case Binder not found.", "http", 404);
    const archived = { ...current, status: "archived" as const, version: current.version + 1 };
    this.binders = this.binders.map((binder) => binder.id === binderId ? archived : binder);
    return archived;
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
      authCleanupPending: false,
      privateStorageDeleted: true,
      privateStorageCleanupPending: false
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

  async prepareAccountExport(context: WriteContext): Promise<AccountExportManifest> {
    return {
      identityId: context.actor.identityId,
      region: context.region,
      schemaVersion: "2.0",
      generatedAt: new Date().toISOString(),
      contentIncluded: false,
      status: "manifest-ready",
      counts: {
        families: 1,
        conversations: this.conversations.length,
        messageEvents: this.messages.length,
        calendarEvents: this.events.length,
        privateRecords: this.binders.length,
        privateAttachments: this.attachments.length,
        legacyTasks: 0,
        legacyExpenses: 0
      }
    };
  }

  async leaveFamily(familyCircleId: EntityId, context: WriteContext) {
    return {
      familyCircleId,
      participantGrantId: "grant-current",
      status: "left" as const,
      leftAt: new Date().toISOString(),
      version: (context.expectedVersion ?? 0) + 1
    };
  }

  async revokeInvitation(invitationId: EntityId, context: WriteContext): Promise<void> {
    this.assertInvitationVersion(invitationId, context.expectedVersion);
    this.transitionInvitation(invitationId, "revoked");
  }

  async listCalendarLayers(familyCircleId: EntityId): Promise<readonly CalendarLayer[]> {
    return this.layers.filter((layer) => matchesSyntheticFamily(layer.familyCircleId, familyCircleId));
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
    return this.events.filter((event) => matchesSyntheticFamily(event.familyCircleId, familyCircleId));
  }

  async createScheduleEvent(input: CreateScheduleEventInput, _context: WriteContext): Promise<ScheduleEvent> {
    this.assertCurrentFamily(input.familyCircleId);
    if (!this.layers.some((layer) => layer.id === input.calendarLayerId && matchesSyntheticFamily(layer.familyCircleId, input.familyCircleId))) {
      throw new PeacePadApiError("Calendar not found.", "http", 404);
    }
    const event: ScheduleEvent = { ...versioned(`event-${Date.now().toString(36)}`), ...input };
    this.events = [...this.events, event];
    return event;
  }

  async updateScheduleEvent(event: ScheduleEvent, _context: WriteContext): Promise<ScheduleEvent> {
    this.assertCurrentFamily(event.familyCircleId);
    if (!this.events.some((item) => item.id === event.id && matchesSyntheticFamily(item.familyCircleId, event.familyCircleId))) {
      throw new PeacePadApiError("Event not found.", "http", 404);
    }
    const updated = { ...event, version: event.version + 1 };
    this.events = this.events.map((item) => (item.id === event.id ? updated : item));
    return updated;
  }

  async deleteScheduleEvent(eventId: EntityId, _context: WriteContext): Promise<void> {
    this.events = this.events.filter((event) => event.id !== eventId);
  }

  async listParentingTasks(familyCircleId: EntityId): Promise<readonly ParentingTask[]> {
    return this.tasks.filter((task) => matchesSyntheticFamily(task.familyCircleId, familyCircleId));
  }

  async createParentingTask(input: CreateParentingTaskInput, context: WriteContext): Promise<ParentingTask> {
    this.assertCurrentFamily(input.familyCircleId);
    if (!input.title.trim() || input.title.trim().length > 160) {
      throw new PeacePadApiError("Enter a task of up to 160 characters.", "http", 400);
    }
    const task: ParentingTask = {
      ...versioned(`task-${Date.now().toString(36)}`),
      ...input,
      title: input.title.trim(),
      createdByIdentityId: context.actor.identityId,
      status: "open",
      completedAt: null,
      completedByIdentityId: null
    };
    this.tasks = [...this.tasks, task];
    return task;
  }

  async updateParentingTask(task: ParentingTask, context: WriteContext): Promise<ParentingTask> {
    this.assertCurrentFamily(task.familyCircleId);
    if (!this.tasks.some((item) => item.id === task.id && item.familyCircleId === task.familyCircleId)) {
      throw new PeacePadApiError("Task not found.", "http", 404);
    }
    const completed = task.status === "completed";
    const updated: ParentingTask = {
      ...task,
      version: task.version + 1,
      completedAt: completed ? (task.completedAt ?? new Date().toISOString()) : null,
      completedByIdentityId: completed ? (task.completedByIdentityId ?? context.actor.identityId) : null
    };
    this.tasks = this.tasks.map((item) => item.id === task.id ? updated : item);
    return updated;
  }

  async deleteParentingTask(taskId: EntityId, _context: WriteContext): Promise<void> {
    this.tasks = this.tasks.filter((task) => task.id !== taskId);
  }

  async listConversations(familyCircleId: EntityId): Promise<readonly Conversation[]> {
    return this.conversations.filter((conversation) => matchesSyntheticFamily(conversation.familyCircleId, familyCircleId));
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
    if (!matchesSyntheticFamily(conversation.familyCircleId, input.familyCircleId) || !input.body.trim()) {
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
    if (!original || !matchesSyntheticFamily(original.familyCircleId, input.familyCircleId) || !matchesSyntheticFamily(conversation.familyCircleId, input.familyCircleId)) {
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
    if (!original || !matchesSyntheticFamily(original.familyCircleId, input.familyCircleId) || !matchesSyntheticFamily(conversation.familyCircleId, input.familyCircleId)) {
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

  async updateProfile(displayName: string, context: WriteContext) {
    const normalized = displayName.trim();
    if (!normalized || normalized.length > 120) throw new Error("Enter a valid profile name.");
    return {
      identityId: context.actor.identityId,
      displayName: normalized,
      region: context.region,
      version: (context.expectedVersion ?? 0) + 1
    } as const;
  }

  async getPersonalityPreference(): Promise<PersonalityPreference> {
    return this.personalityPreference;
  }

  async setPersonalityPreference(personalityType: PersonalityType | null, context: WriteContext): Promise<PersonalityPreference> {
    if (context.actor.identityId !== this.personalityPreference.identityId || context.region !== this.personalityPreference.region) {
      throw new PeacePadApiError("You do not have access to this communication profile.", "http", 403);
    }
    if (context.expectedVersion !== this.personalityPreference.version) {
      throw new PeacePadApiError("The communication profile changed. Review it again before continuing.", "http", 409);
    }
    this.personalityPreference = {
      ...this.personalityPreference,
      personalityType,
      updatedAt: new Date().toISOString(),
      version: this.personalityPreference.version + 1
    };
    return this.personalityPreference;
  }

  async getParentingSchedulePlan(familyCircleId: EntityId): Promise<ParentingSchedulePlan | null> {
    return this.parentingSchedulePlan && matchesSyntheticFamily(this.parentingSchedulePlan.familyCircleId, familyCircleId)
      ? this.parentingSchedulePlan
      : null;
  }

  async saveParentingSchedulePlan(input: SaveParentingSchedulePlanInput, context: WriteContext): Promise<ParentingSchedulePlan> {
    const previous = this.parentingSchedulePlan;
    if (previous && context.expectedVersion !== previous.version) throw new PeacePadApiError("The parenting plan changed. Refresh before saving.", "http", 409);
    this.parentingSchedulePlan = {
      ...versioned(previous?.id ?? `parenting-plan-${Date.now().toString(36)}`),
      ...input,
      createdByIdentityId: previous?.createdByIdentityId ?? actor.identityId,
      updatedAt: new Date().toISOString(),
      version: (previous?.version ?? 0) + 1
    };
    return this.parentingSchedulePlan;
  }

  async listParentingScheduleExceptions(familyCircleId: EntityId): Promise<readonly ParentingScheduleException[]> {
    return this.parentingScheduleExceptions.filter((item) => matchesSyntheticFamily(item.familyCircleId, familyCircleId));
  }

  async createParentingScheduleException(input: CreateParentingScheduleExceptionInput, _context: WriteContext): Promise<ParentingScheduleException> {
    const item: ParentingScheduleException = {
      ...versioned(`schedule-exception-${Date.now().toString(36)}`),
      ...input,
      requestedByIdentityId: actor.identityId,
      status: "proposed",
      resolvedByIdentityId: null,
      resolvedAt: null
    };
    this.parentingScheduleExceptions = [item, ...this.parentingScheduleExceptions];
    return item;
  }

  async resolveParentingScheduleException(exceptionId: EntityId, resolution: "accepted" | "declined" | "cancelled", context: WriteContext): Promise<ParentingScheduleException> {
    const current = this.parentingScheduleExceptions.find((item) => item.id === exceptionId);
    if (!current || current.version !== context.expectedVersion) throw new PeacePadApiError("The schedule request changed. Refresh before responding.", "http", 409);
    const updated = { ...current, status: resolution, resolvedByIdentityId: actor.identityId, resolvedAt: new Date().toISOString(), version: current.version + 1 } as ParentingScheduleException;
    this.parentingScheduleExceptions = this.parentingScheduleExceptions.map((item) => item.id === exceptionId ? updated : item);
    return updated;
  }

  async transcribeCoachAudio(bytes: ArrayBuffer, mediaType: "audio/m4a" | "audio/mp4" | "audio/webm") {
    if (bytes.byteLength < 1 || !mediaType.startsWith("audio/")) throw new PeacePadApiError("Voice recording is empty.", "http", 400);
    return { transcript: "Please confirm the pickup time when you can." } as const;
  }

  async listChildProfiles(familyCircleId: EntityId): Promise<readonly ChildProfile[]> {
    this.assertCurrentFamily(familyCircleId);
    return this.childProfiles.filter((profile) => matchesSyntheticFamily(profile.familyCircleId, familyCircleId));
  }

  async createChildProfile(input: CreateChildProfileInput, context: WriteContext): Promise<ChildProfile> {
    this.assertCurrentFamily(input.familyCircleId);
    const displayName = input.displayName.trim();
    if (displayName.length < 2 || displayName.length > 80) throw new PeacePadApiError("Enter a valid child name or label.", "http", 400);
    const profile: ChildProfile = {
      ...versioned(`child-${Date.now().toString(36)}`),
      familyCircleId: input.familyCircleId,
      displayName,
      managedByAdultIdentityIds: [context.actor.identityId],
      directLoginEnabled: false
    };
    this.childProfiles = [...this.childProfiles, profile];
    return profile;
  }

  async updateChildProfile(profile: ChildProfile, context: WriteContext): Promise<ChildProfile> {
    const existing = this.childProfiles.find((item) => item.id === profile.id);
    if (!existing || !existing.managedByAdultIdentityIds.includes(context.actor.identityId)) throw new PeacePadApiError("Child profile not found.", "http", 404);
    if (context.expectedVersion !== existing.version) throw new PeacePadApiError("This child profile changed. Review it again.", "http", 409);
    const updated = { ...profile, displayName: profile.displayName.trim(), version: existing.version + 1 };
    this.childProfiles = this.childProfiles.map((item) => item.id === updated.id ? updated : item);
    return updated;
  }

  async listChildUpdates(familyCircleId: EntityId, childProfileId?: EntityId): Promise<readonly ChildUpdate[]> {
    this.assertCurrentFamily(familyCircleId);
    return this.childUpdates.filter((item) => matchesSyntheticFamily(item.familyCircleId, familyCircleId) && (!childProfileId || item.childProfileId === childProfileId));
  }

  async createChildUpdate(input: CreateChildUpdateInput, context: WriteContext): Promise<ChildUpdate> {
    this.assertCurrentFamily(input.familyCircleId);
    if (!this.childProfiles.some((profile) => profile.id === input.childProfileId)) throw new PeacePadApiError("Choose a child profile first.", "http", 400);
    const update: ChildUpdate = {
      ...versioned(`child-update-${Date.now().toString(36)}`),
      ...input,
      title: input.title.trim(),
      body: input.body.trim(),
      authorIdentityId: context.actor.identityId
    };
    this.childUpdates = [update, ...this.childUpdates];
    return update;
  }

  async listExpenses(familyCircleId: EntityId): Promise<readonly FamilyExpense[]> {
    this.assertCurrentFamily(familyCircleId);
    return this.expenses.filter((expense) => matchesSyntheticFamily(expense.familyCircleId, familyCircleId));
  }

  async createExpense(input: CreateExpenseInput, context: WriteContext): Promise<FamilyExpense> {
    this.assertCurrentFamily(input.familyCircleId);
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new PeacePadApiError("Enter a valid expense amount.", "http", 400);
    const receipt = input.receiptAttachmentId
      ? this.expenseReceipts.find((item) => item.id === input.receiptAttachmentId && item.familyCircleId === input.familyCircleId && item.linkedExpenseId === null)
      : undefined;
    if (input.receiptAttachmentId && !receipt) throw new PeacePadApiError("That receipt is not available for this expense.", "http", 400);
    const expense: FamilyExpense = {
      ...versioned(`expense-${Date.now().toString(36)}`),
      ...input,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      createdByIdentityId: context.actor.identityId,
      status: "open"
    };
    this.expenses = [expense, ...this.expenses];
    if (receipt) {
      this.expenseReceipts = this.expenseReceipts.map((item) => item.id === receipt.id ? { ...item, linkedExpenseId: expense.id, version: item.version + 1 } : item);
    }
    return expense;
  }

  async updateExpense(expense: FamilyExpense, context: WriteContext): Promise<FamilyExpense> {
    const existing = this.expenses.find((item) => item.id === expense.id);
    if (!existing) throw new PeacePadApiError("Expense not found.", "http", 404);
    if (context.expectedVersion !== existing.version) throw new PeacePadApiError("This expense changed. Review it again.", "http", 409);
    const updated = { ...expense, version: existing.version + 1 };
    this.expenses = this.expenses.map((item) => item.id === updated.id ? updated : item);
    return updated;
  }

  async listSettlements(familyCircleId: EntityId): Promise<readonly ExpenseSettlement[]> {
    this.assertCurrentFamily(familyCircleId);
    return this.settlements.filter((settlement) => matchesSyntheticFamily(settlement.familyCircleId, familyCircleId));
  }

  async requestSettlement(input: CreateSettlementInput, context: WriteContext): Promise<ExpenseSettlement> {
    const expense = this.expenses.find((item) => item.id === input.expenseId && matchesSyntheticFamily(item.familyCircleId, input.familyCircleId));
    if (!expense) throw new PeacePadApiError("Expense not found.", "http", 404);
    const now = new Date().toISOString();
    const settlement: ExpenseSettlement = {
      ...versioned(`settlement-${Date.now().toString(36)}`),
      ...input,
      requestedByIdentityId: context.actor.identityId,
      status: "pending",
      requestedAt: now,
      resolvedAt: null
    };
    this.settlements = [settlement, ...this.settlements];
    this.expenses = this.expenses.map((item) => item.id === expense.id ? { ...item, status: "settlement-requested", version: item.version + 1 } : item);
    return settlement;
  }

  async resolveSettlement(settlementId: EntityId, resolution: "confirmed" | "disputed" | "cancelled", context: WriteContext): Promise<ExpenseSettlement> {
    const existing = this.settlements.find((item) => item.id === settlementId);
    if (!existing) throw new PeacePadApiError("Settlement request not found.", "http", 404);
    if (context.expectedVersion !== existing.version) throw new PeacePadApiError("This settlement changed. Review it again.", "http", 409);
    const updated = { ...existing, status: resolution, resolvedAt: new Date().toISOString(), version: existing.version + 1 };
    this.settlements = this.settlements.map((item) => item.id === settlementId ? updated : item);
    this.expenses = this.expenses.map((item) => item.id === existing.expenseId ? { ...item, status: resolution === "confirmed" ? "settled" : resolution === "disputed" ? "disputed" : "open", version: item.version + 1 } : item);
    return updated;
  }

  async getFamilyBalance(familyCircleId: EntityId): Promise<FamilyBalance> {
    this.assertCurrentFamily(familyCircleId);
    const pending = this.settlements.filter((item) => matchesSyntheticFamily(item.familyCircleId, familyCircleId) && item.status === "pending");
    const owesMinor = pending.filter((item) => item.requestedFromIdentityId === actor.identityId).reduce((total, item) => total + item.amountMinor, 0);
    const owedMinor = pending.filter((item) => item.requestedByIdentityId === actor.identityId).reduce((total, item) => total + item.amountMinor, 0);
    return { familyCircleId, identityId: actor.identityId, currency: "CAD", owesMinor, owedMinor, netMinor: owedMinor - owesMinor, calculatedAt: new Date().toISOString() };
  }

  async searchSupport(input: SupportSearchInput): Promise<readonly SupportResource[]> {
    if (input.query.trim().length < 2) throw new PeacePadApiError("Enter a city or postal code.", "http", 400);
    return [];
  }

  async listScheduledCalls(familyCircleId: EntityId): Promise<readonly ScheduledCall[]> {
    this.assertCurrentFamily(familyCircleId);
    return this.scheduledCalls.filter((item) => matchesSyntheticFamily(item.familyCircleId, familyCircleId));
  }

  async createScheduledCall(input: CreateScheduledCallInput, context: WriteContext): Promise<ScheduledCall> {
    const call: ScheduledCall = { ...versioned(`scheduled-call-${Date.now().toString(36)}`), ...input, createdByIdentityId: context.actor.identityId, status: "scheduled" };
    this.scheduledCalls = [call, ...this.scheduledCalls];
    return call;
  }

  async cancelScheduledCall(callId: EntityId, context: WriteContext): Promise<ScheduledCall> {
    const existing = this.scheduledCalls.find((item) => item.id === callId);
    if (!existing) throw new PeacePadApiError("Scheduled call not found.", "http", 404);
    if (context.expectedVersion !== existing.version) throw new PeacePadApiError("This scheduled call changed. Review it again.", "http", 409);
    const updated = { ...existing, status: "cancelled" as const, version: existing.version + 1 };
    this.scheduledCalls = this.scheduledCalls.map((item) => item.id === callId ? updated : item);
    return updated;
  }

  async createMediaCall(conversationId: EntityId, mediaType: "audio" | "video", context: WriteContext): Promise<MediaCallSession> {
    if (mediaType === "audio") return this.createAudioCall(conversationId, context);
    const now = new Date();
    this.videoCall = {
      id: `video-call-${Date.now().toString(36)}`,
      familyCircleId: "family-current",
      conversationId,
      callerIdentityId: context.actor.identityId,
      calleeIdentityId: "identity-coparent",
      type: "video",
      status: "ringing",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      acceptedAt: null,
      endedAt: null,
      endedByIdentityId: null,
      endReason: null,
      schemaVersion: "2.0",
      version: 1,
      region: context.region
    };
    return this.videoCall;
  }

  async getCurrentMediaCall(conversationId: EntityId): Promise<MediaCallSession | null> {
    if (this.videoCall?.conversationId === conversationId && ["ringing", "active"].includes(this.videoCall.status)) return this.videoCall;
    return this.getCurrentAudioCall(conversationId);
  }

  async createConchSession(input: CreateConchSessionInput, context: WriteContext): Promise<ConchSession> {
    const now = new Date().toISOString();
    this.conchSession = {
      ...versioned(`conch-${Date.now().toString(36)}`),
      ...input,
      participantIdentityIds: [context.actor.identityId, "identity-coparent"],
      createdByIdentityId: context.actor.identityId,
      status: "invited",
      consentedIdentityIds: [context.actor.identityId],
      currentSpeakerIdentityId: null,
      turnStartedAt: null,
      recordingEnabled: false,
      transcriptEnabled: false,
      summaryConsentIdentityIds: [],
      endedAt: null,
      provenance: { ...provenance(), createdAt: now }
    };
    return this.conchSession;
  }

  async getCurrentConchSession(conversationId: EntityId): Promise<ConchSession | null> {
    return this.conchSession?.conversationId === conversationId && !["ended", "declined", "expired"].includes(this.conchSession.status) ? this.conchSession : null;
  }

  async getCurrentConchTurn(sessionId: EntityId): Promise<ConchTurn | null> {
    return this.conchTurns.find((item) => item.conchSessionId === sessionId && item.endedAt === null) ?? null;
  }

  async respondToConchSession(sessionId: EntityId, response: "accept" | "decline", context: WriteContext): Promise<ConchSession> {
    const session = this.requireConch(sessionId, context.expectedVersion);
    const consented = response === "accept" ? [...new Set([...session.consentedIdentityIds, context.actor.identityId])] : session.consentedIdentityIds;
    this.conchSession = { ...session, status: response === "accept" ? "active" : "declined", consentedIdentityIds: consented, currentSpeakerIdentityId: response === "accept" ? session.createdByIdentityId : null, turnStartedAt: response === "accept" ? new Date().toISOString() : null, version: session.version + 1 };
    if (response === "accept") {
      this.conchTurns = [{ ...versioned(`conch-turn-${Date.now().toString(36)}`), conchSessionId: session.id, speakerIdentityId: session.createdByIdentityId, startedAt: this.conchSession.turnStartedAt!, endedAt: null, outcome: null, reactions: [] }, ...this.conchTurns];
    }
    return this.conchSession;
  }

  async consentToConchSession(sessionId: EntityId, summaryConsent: boolean, context: WriteContext): Promise<ConchSession> {
    const session = this.requireConch(sessionId, context.expectedVersion);
    const summaryConsentIdentityIds = summaryConsent ? [...new Set([...session.summaryConsentIdentityIds, context.actor.identityId])] : session.summaryConsentIdentityIds.filter((id) => id !== context.actor.identityId);
    this.conchSession = { ...session, summaryConsentIdentityIds, version: session.version + 1 };
    return this.conchSession;
  }

  async passConchTurn(sessionId: EntityId, context: WriteContext): Promise<Readonly<{ session: ConchSession; turn: ConchTurn }>> {
    const session = this.requireConch(sessionId, context.expectedVersion);
    if (session.status !== "active" || session.currentSpeakerIdentityId !== context.actor.identityId) throw new PeacePadApiError("It is not your turn to pass the Conch.", "http", 409);
    const activeTurn = this.conchTurns.find((item) => item.conchSessionId === session.id && item.endedAt === null && item.speakerIdentityId === context.actor.identityId);
    if (!activeTurn) throw new PeacePadApiError("Conch turn not found.", "http", 404);
    const turn: ConchTurn = { ...activeTurn, endedAt: new Date().toISOString(), outcome: "passed", version: activeTurn.version + 1 };
    this.conchTurns = this.conchTurns.map((item) => item.id === turn.id ? turn : item);
    const nextSpeaker = session.participantIdentityIds.find((id) => id !== context.actor.identityId) ?? context.actor.identityId;
    this.conchSession = { ...session, currentSpeakerIdentityId: nextSpeaker, turnStartedAt: new Date().toISOString(), version: session.version + 1 };
    this.conchTurns = [{ ...versioned(`conch-turn-${Date.now().toString(36)}-next`), conchSessionId: session.id, speakerIdentityId: nextSpeaker, startedAt: this.conchSession.turnStartedAt!, endedAt: null, outcome: null, reactions: [] }, ...this.conchTurns];
    return { session: this.conchSession, turn };
  }

  async reactToConchTurn(sessionId: EntityId, turnId: EntityId, reaction: ConchReaction, context: WriteContext): Promise<ConchTurn> {
    this.requireConch(sessionId, context.expectedVersion);
    const turn = this.conchTurns.find((item) => item.id === turnId && item.conchSessionId === sessionId);
    if (!turn) throw new PeacePadApiError("Conch turn not found.", "http", 404);
    const updated = { ...turn, reactions: [...turn.reactions.filter((item) => item.identityId !== context.actor.identityId), { identityId: context.actor.identityId, reaction, reactedAt: new Date().toISOString() }], version: turn.version + 1 };
    this.conchTurns = this.conchTurns.map((item) => item.id === turnId ? updated : item);
    return updated;
  }

  async endConchSession(sessionId: EntityId, context: WriteContext): Promise<ConchSession> {
    const session = this.requireConch(sessionId, context.expectedVersion);
    this.conchSession = { ...session, status: "ended", endedAt: new Date().toISOString(), currentSpeakerIdentityId: null, turnStartedAt: null, version: session.version + 1 };
    this.conchTurns = this.conchTurns.map((turn) => turn.conchSessionId === sessionId && turn.endedAt === null ? { ...turn, endedAt: this.conchSession!.endedAt, outcome: "ended", version: turn.version + 1 } : turn);
    return this.conchSession;
  }

  private requireConch(sessionId: EntityId, expectedVersion: number | null): ConchSession {
    if (!this.conchSession || this.conchSession.id !== sessionId) throw new PeacePadApiError("Conch session not found.", "http", 404);
    if (expectedVersion !== null && expectedVersion !== this.conchSession.version) throw new PeacePadApiError("This Conch session changed. Refresh and try again.", "http", 409);
    return this.conchSession;
  }

  private assertInvitationVersion(invitationId: EntityId, expectedVersion: number | null) {
    const seed = this.invitationsById.get(invitationId);
    if (seed && expectedVersion !== seed.preview.version) {
      throw new PeacePadApiError("The invitation changed. Review it again before continuing.", "http", 409);
    }
  }

  private assertCurrentFamily(familyCircleId: EntityId) {
    if (familyCircleId !== "family-current" && familyCircleId !== demoFamilyCircleId) {
      throw new PeacePadApiError("You do not have access to that family.", "http", 403);
    }
  }


  private assertConversation(conversationId: EntityId) {
    const canonicalConversationId = conversationId === demoConversationId ? "conversation-primary" : conversationId;
    const conversation = this.conversations.find((item) => item.id === canonicalConversationId);
    if (!conversation || (!conversation.participantIdentityIds.includes("identity-current") && !conversation.participantIdentityIds.includes(demoActorIdentityId))) {
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
