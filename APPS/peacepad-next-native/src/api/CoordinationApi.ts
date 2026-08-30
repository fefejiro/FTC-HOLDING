import type {
  AcceptedInvitation,
  AttachmentTarget,
  AttachmentUploadIntent,
  CaseBinder,
  CalendarLayer,
  Conversation,
  ConversationAttachment,
  ConversationAttachmentDownload,
  ExpenseReceiptAttachment,
  ExpenseReceiptDownload,
  EntityId,
  FamilyInvitation,
  InvitationPreview,
  LayerVisibility,
  MessageCheckPreference,
  MessageEvent,
  ParentingTask,
  ParticipantGrant,
  PrivateAttachment,
  PrivateAttachmentDownload,
  PrivateTimelineEntry,
  ScheduleEvent,
  TimelineSourceKind,
  WriteContext
} from "../domain/v2";
import type { MessagePreviewResponse } from "./contracts";
import type {
  ChildUpdate,
  ChildUpdateKind,
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
import { resolveFunctionInvocationRegion, type PeacePadEnvironmentConfig } from "../config/environment";
import { PeacePadApiError } from "./PeacePadApiClient";

export type InvitationFailureReason =
  | "invalid"
  | "expired"
  | "revoked"
  | "used"
  | "rate-limited"
  | "offline";

export class InvitationError extends Error {
  readonly reason: InvitationFailureReason;

  constructor(reason: InvitationFailureReason, message: string) {
    super(message);
    this.name = "InvitationError";
    this.reason = reason;
  }
}

export type CreateInvitationInput = Readonly<{
  familyCircleId: EntityId;
  invitedRole: FamilyInvitation["invitedRole"];
  permissions: readonly string[];
  expiresInHours: number;
}>;

export type CreatedInvitation = Readonly<{
  invitation: FamilyInvitation;
  code: string;
  deepLink: string;
}>;

export type CreatedFamily = Readonly<{
  familyId: EntityId;
  participantGrantId: EntityId;
  familyName: string;
  region: "ca" | "us";
}>;

export type DeletedAccount = Readonly<{
  identityId: EntityId;
  region: "ca" | "us";
  status: "deleted";
  deletedAt: string;
  version: number;
  authIdentityDeleted: boolean;
  refreshSessionsRevoked: boolean;
  authCleanupPending: boolean;
  privateStorageDeleted: boolean;
  privateStorageCleanupPending: boolean;
}>;

export type AudioCallStatus = "ringing" | "active" | "declined" | "ended" | "expired";

export type AudioCallSession = Readonly<{
  id: EntityId;
  familyCircleId: EntityId;
  conversationId: EntityId;
  callerIdentityId: EntityId;
  calleeIdentityId: EntityId;
  type: "audio" | "video";
  status: AudioCallStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
  endedByIdentityId: EntityId | null;
  endReason: "declined" | "caller_cancelled" | "participant_ended" | "ring_timeout" | "authorization_revoked" | null;
  schemaVersion: "2.0";
  version: number;
  region: "ca" | "us";
}>;

export type CreateChildProfileInput = Readonly<{
  familyCircleId: EntityId;
  displayName: string;
}>;

export type CreateChildUpdateInput = Readonly<{
  familyCircleId: EntityId;
  childProfileId: EntityId;
  kind: ChildUpdateKind;
  title: string;
  body: string;
  occurredAt: string;
  visibility: LayerVisibility;
}>;

export type CreateExpenseInput = Readonly<{
  familyCircleId: EntityId;
  childProfileIds: readonly EntityId[];
  title: string;
  description: string | null;
  category: FamilyExpense["category"];
  amountMinor: number;
  currency: FamilyExpense["currency"];
  incurredAt: string;
  splits: FamilyExpense["splits"];
  receiptAttachmentId: EntityId | null;
}>;

export type CreateSettlementInput = Readonly<{
  familyCircleId: EntityId;
  expenseId: EntityId;
  requestedFromIdentityId: EntityId;
  amountMinor: number;
  currency: ExpenseSettlement["currency"];
}>;

export type SupportSearchInput = Readonly<{
  query: string;
  country: "CA" | "US";
  kind?: SupportResource["kind"];
  latitude?: number;
  longitude?: number;
}>;

export type CreateScheduledCallInput = Readonly<{
  familyCircleId: EntityId;
  conversationId: EntityId;
  participantIdentityIds: readonly EntityId[];
  mediaType: "audio" | "video";
  startsAt: string;
  durationMinutes: number;
  note: string | null;
}>;

export type CreateConchSessionInput = Readonly<{
  familyCircleId: EntityId;
  conversationId: EntityId;
  mediaType: "audio" | "video";
  turnDurationSeconds: number;
}>;

export type AudioCallSignal = Readonly<
  | { kind: "offer"; payload: Readonly<{ sdp: string }> }
  | { kind: "answer"; payload: Readonly<{ sdp: string }> }
  | { kind: "ice"; payload: Readonly<{ candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }> }
>;

export type AudioCallSignalReceipt = Readonly<{
  delivered: true;
  callId: EntityId;
  peerIdentityId: EntityId;
  callVersion: number;
  sentAt: string;
  expiresAt: string;
}>;

export type AudioCallTurnCredentials = Readonly<{
  callId: EntityId;
  callVersion: number;
  expiresAt: string;
  iceServers: readonly Readonly<{
    urls: readonly string[];
    username: string;
    credential: string;
  }>[];
}>;

export type AccountExportManifest = Readonly<{
  identityId: EntityId;
  region: "ca" | "us";
  schemaVersion: "2.0";
  generatedAt: string;
  contentIncluded: false;
  status: "manifest-ready";
  counts: Readonly<Record<"families" | "conversations" | "messageEvents" | "calendarEvents" | "privateRecords" | "privateAttachments" | "legacyTasks" | "legacyExpenses", number>>;
}>;

export type LeftFamily = Readonly<{
  familyCircleId: EntityId;
  participantGrantId: EntityId;
  status: "left";
  leftAt: string;
  version: number;
}>;

export type UpdatedProfile = Readonly<{
  identityId: EntityId;
  displayName: string;
  region: "ca" | "us";
  version: number;
}>;

export const PERSONALITY_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP"
] as const;

export type PersonalityType = typeof PERSONALITY_TYPES[number];

export type PersonalityPreference = Readonly<{
  identityId: EntityId;
  region: "ca" | "us";
  personalityType: PersonalityType | null;
  updatedAt: string | null;
  version: number;
  schemaVersion: "2.0";
}>;

export type DevicePushRegistration = Readonly<{
  registrationId: EntityId;
  platform: "ios" | "android";
  transport: "expo" | "apns-voip";
  appId: "ca.peacepad.family" | "ca.peacepad.nextnative.lab";
  version: number;
}>;

export type RegisterDevicePushInput = Readonly<{
  installationId: EntityId;
  platform: DevicePushRegistration["platform"];
  transport: DevicePushRegistration["transport"];
  appId: DevicePushRegistration["appId"];
  token: string;
}>;

export type RevokedDevicePushRegistration = Readonly<{
  registrationId: EntityId;
  status: "revoked";
  version: number;
}>;

export type CreateCalendarLayerInput = Readonly<{
  familyCircleId: EntityId;
  ownerIdentityId: EntityId;
  name: string;
  kind: CalendarLayer["kind"];
  icon: CalendarLayer["icon"];
  colorToken: CalendarLayer["colorToken"];
  visibility: LayerVisibility;
}>;

export type CreateScheduleEventInput = Readonly<
  Pick<
    ScheduleEvent,
    | "familyCircleId"
    | "calendarLayerId"
    | "childProfileIds"
    | "eventType"
    | "title"
    | "description"
    | "startsAt"
    | "endsAt"
    | "status"
    | "recurrence"
    | "visibilityOverride"
  >
>;

export type CreateParentingTaskInput = Readonly<{
  familyCircleId: EntityId;
  title: string;
  dueAt: string | null;
  assignedToIdentityId: EntityId | null;
  visibility: LayerVisibility;
}>;

export type CreateConversationInput = Readonly<{
  familyCircleId: EntityId;
  participantIdentityIds: readonly EntityId[];
}>;

export type SendMessageInput = Readonly<{
  familyCircleId: EntityId;
  conversationId: EntityId;
  body: string;
}>;

export type RecordMessageLifecycleInput = Readonly<{
  familyCircleId: EntityId;
  conversationId: EntityId;
  originalMessageEventId: EntityId;
  eventType: "delivered" | "viewed";
}>;

export type CorrectMessageInput = Readonly<{
  familyCircleId: EntityId;
  conversationId: EntityId;
  originalMessageEventId: EntityId;
  body: string;
}>;

export type MessageSearchResult = Readonly<{
  originalMessageEventId: EntityId;
  effectiveMessageEventId: EntityId;
  body: string;
  occurredAt: string;
  corrected: boolean;
}>;

export type CreateAttachmentUploadIntentInput = Readonly<{
  familyCircleId: EntityId;
  target: AttachmentTarget;
  originalFileName: string;
  mediaType: AttachmentUploadIntent["mediaType"];
  byteLength: number;
}>;

export type CreateCaseBinderInput = Readonly<{
  familyCircleId: EntityId;
  name: string;
  childLabel: string;
}>;

export type LinkTimelineSourceInput = Readonly<{
  familyCircleId: EntityId;
  caseBinderId: EntityId;
  sourceKind: TimelineSourceKind;
  sourceId: EntityId;
}>;

export interface PeacePadCoordinationApi {
  bootstrapIdentity?(displayName: string, region: "ca" | "us"): Promise<{ identityId: EntityId; region: "ca" | "us"; displayName: string }>;
  registerDevicePush(input: RegisterDevicePushInput, context: WriteContext): Promise<DevicePushRegistration>;
  revokeDevicePush(registrationId: EntityId, context: WriteContext): Promise<RevokedDevicePushRegistration>;
  deleteAccount(context: WriteContext): Promise<DeletedAccount>;
  prepareAccountExport(context: WriteContext): Promise<AccountExportManifest>;
  updateProfile(displayName: string, context: WriteContext): Promise<UpdatedProfile>;
  getPersonalityPreference(): Promise<PersonalityPreference>;
  setPersonalityPreference(personalityType: PersonalityType | null, context: WriteContext): Promise<PersonalityPreference>;
  listChildProfiles(familyCircleId: EntityId): Promise<readonly import("../domain/v2").ChildProfile[]>;
  createChildProfile(input: CreateChildProfileInput, context: WriteContext): Promise<import("../domain/v2").ChildProfile>;
  updateChildProfile(profile: import("../domain/v2").ChildProfile, context: WriteContext): Promise<import("../domain/v2").ChildProfile>;
  listChildUpdates(familyCircleId: EntityId, childProfileId?: EntityId): Promise<readonly ChildUpdate[]>;
  createChildUpdate(input: CreateChildUpdateInput, context: WriteContext): Promise<ChildUpdate>;
  listExpenses(familyCircleId: EntityId): Promise<readonly FamilyExpense[]>;
  createExpense(input: CreateExpenseInput, context: WriteContext): Promise<FamilyExpense>;
  updateExpense(expense: FamilyExpense, context: WriteContext): Promise<FamilyExpense>;
  listSettlements(familyCircleId: EntityId): Promise<readonly ExpenseSettlement[]>;
  requestSettlement(input: CreateSettlementInput, context: WriteContext): Promise<ExpenseSettlement>;
  resolveSettlement(settlementId: EntityId, resolution: "confirmed" | "disputed" | "cancelled", context: WriteContext): Promise<ExpenseSettlement>;
  getFamilyBalance(familyCircleId: EntityId): Promise<FamilyBalance>;
  searchSupport(input: SupportSearchInput): Promise<readonly SupportResource[]>;
  listScheduledCalls(familyCircleId: EntityId): Promise<readonly ScheduledCall[]>;
  createScheduledCall(input: CreateScheduledCallInput, context: WriteContext): Promise<ScheduledCall>;
  cancelScheduledCall(callId: EntityId, context: WriteContext): Promise<ScheduledCall>;
  createFamily(familyName: string, context: WriteContext): Promise<CreatedFamily>;
  leaveFamily(familyCircleId: EntityId, context: WriteContext): Promise<LeftFamily>;
  listCaseBinders(familyCircleId: EntityId): Promise<readonly CaseBinder[]>;
  createCaseBinder(input: CreateCaseBinderInput, context: WriteContext): Promise<CaseBinder>;
  archiveCaseBinder(binderId: EntityId, context: WriteContext): Promise<CaseBinder>;
  createAttachmentUploadIntent(input: CreateAttachmentUploadIntentInput, context: WriteContext): Promise<AttachmentUploadIntent>;
  uploadPrivateAttachment(intent: AttachmentUploadIntent, bytes: ArrayBuffer): Promise<void>;
  completePrivateAttachment(attachmentId: EntityId, context: WriteContext): Promise<PrivateAttachment>;
  listPrivateAttachments(binderId: EntityId): Promise<readonly PrivateAttachment[]>;
  getPrivateAttachmentDownload(attachmentId: EntityId): Promise<PrivateAttachmentDownload>;
  completeConversationAttachment(attachmentId: EntityId, context: WriteContext): Promise<ConversationAttachment>;
  listConversationAttachments(conversationId: EntityId): Promise<readonly ConversationAttachment[]>;
  getConversationAttachmentDownload(attachmentId: EntityId): Promise<ConversationAttachmentDownload>;
  completeExpenseReceipt(intentId: EntityId, context: WriteContext): Promise<ExpenseReceiptAttachment>;
  getExpenseReceiptDownload(attachmentId: EntityId): Promise<ExpenseReceiptDownload>;
  listPrivateTimeline(binderId: EntityId, before?: string, limit?: number): Promise<readonly PrivateTimelineEntry[]>;
  linkTimelineSource(input: LinkTimelineSourceInput, context: WriteContext): Promise<PrivateTimelineEntry>;
  createInvitation(input: CreateInvitationInput, context: WriteContext): Promise<CreatedInvitation>;
  resolveInvitation(code: string): Promise<InvitationPreview>;
  acceptInvitation(invitationId: EntityId, context: WriteContext): Promise<AcceptedInvitation>;
  declineInvitation(invitationId: EntityId, context: WriteContext): Promise<void>;
  revokeInvitation(invitationId: EntityId, context: WriteContext): Promise<void>;
  listCalendarLayers(familyCircleId: EntityId): Promise<readonly CalendarLayer[]>;
  createCalendarLayer(input: CreateCalendarLayerInput, context: WriteContext): Promise<CalendarLayer>;
  updateCalendarLayer(layer: CalendarLayer, context: WriteContext): Promise<CalendarLayer>;
  deleteCalendarLayer(layerId: EntityId, context: WriteContext): Promise<void>;
  listScheduleEvents(familyCircleId: EntityId): Promise<readonly ScheduleEvent[]>;
  createScheduleEvent(input: CreateScheduleEventInput, context: WriteContext): Promise<ScheduleEvent>;
  updateScheduleEvent(event: ScheduleEvent, context: WriteContext): Promise<ScheduleEvent>;
  deleteScheduleEvent(eventId: EntityId, context: WriteContext): Promise<void>;
  listParentingTasks(familyCircleId: EntityId): Promise<readonly ParentingTask[]>;
  createParentingTask(input: CreateParentingTaskInput, context: WriteContext): Promise<ParentingTask>;
  updateParentingTask(task: ParentingTask, context: WriteContext): Promise<ParentingTask>;
  deleteParentingTask(taskId: EntityId, context: WriteContext): Promise<void>;
  listConversations(familyCircleId: EntityId): Promise<readonly Conversation[]>;
  createConversation(input: CreateConversationInput, context: WriteContext): Promise<Conversation>;
  listMessages(conversationId: EntityId): Promise<readonly MessageEvent[]>;
  sendMessage(input: SendMessageInput, context: WriteContext): Promise<MessageEvent>;
  recordMessageLifecycle(input: RecordMessageLifecycleInput, context: WriteContext): Promise<MessageEvent>;
  correctMessage(input: CorrectMessageInput, context: WriteContext): Promise<MessageEvent>;
  searchMessages(conversationId: EntityId, query: string, limit?: number): Promise<readonly MessageSearchResult[]>;
  getMessageCheckPreference(conversationId: EntityId): Promise<MessageCheckPreference>;
  setMessageCheckPreference(
    conversationId: EntityId,
    enabled: boolean,
    context: WriteContext
  ): Promise<MessageCheckPreference>;
  previewMessage(conversationId: EntityId, content: string): Promise<MessagePreviewResponse>;
  transcribeCoachAudio(bytes: ArrayBuffer, mediaType: "audio/m4a" | "audio/mp4" | "audio/webm"): Promise<Readonly<{ transcript: string }>>;
  getCurrentAudioCall(conversationId: EntityId): Promise<AudioCallSession | null>;
  createAudioCall(conversationId: EntityId, context: WriteContext): Promise<AudioCallSession>;
  acceptAudioCall(callId: EntityId, context: WriteContext): Promise<AudioCallSession>;
  declineAudioCall(callId: EntityId, context: WriteContext): Promise<AudioCallSession>;
  endAudioCall(callId: EntityId, context: WriteContext): Promise<AudioCallSession>;
  getAudioCallTurnCredentials(callId: EntityId, context: WriteContext): Promise<AudioCallTurnCredentials>;
  sendAudioCallSignal(callId: EntityId, signal: AudioCallSignal, context: WriteContext): Promise<AudioCallSignalReceipt>;
  createMediaCall(conversationId: EntityId, mediaType: "audio" | "video", context: WriteContext): Promise<MediaCallSession>;
  getCurrentMediaCall(conversationId: EntityId): Promise<MediaCallSession | null>;
  createConchSession(input: CreateConchSessionInput, context: WriteContext): Promise<ConchSession>;
  getCurrentConchSession(conversationId: EntityId): Promise<ConchSession | null>;
  getCurrentConchTurn(sessionId: EntityId): Promise<ConchTurn | null>;
  respondToConchSession(sessionId: EntityId, response: "accept" | "decline", context: WriteContext): Promise<ConchSession>;
  consentToConchSession(sessionId: EntityId, summaryConsent: boolean, context: WriteContext): Promise<ConchSession>;
  passConchTurn(sessionId: EntityId, context: WriteContext): Promise<Readonly<{ session: ConchSession; turn: ConchTurn }>>;
  reactToConchTurn(sessionId: EntityId, turnId: EntityId, reaction: ConchReaction, context: WriteContext): Promise<ConchTurn>;
  endConchSession(sessionId: EntityId, context: WriteContext): Promise<ConchSession>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export type AccessTokenProvider = () => Promise<string | undefined>;

type ErrorDetail = { code?: string; message?: string; requestId?: string };
type ErrorPayload = ErrorDetail & { error?: ErrorDetail };

function errorDetail(payload: ErrorPayload | null): ErrorDetail {
  if (!payload) return {};
  return payload.error && typeof payload.error === "object" ? payload.error : payload;
}

const INVITATION_REASONS: Record<string, InvitationFailureReason> = {
  INVITATION_EXPIRED: "expired",
  INVITATION_REVOKED: "revoked",
  INVITATION_USED: "used",
  INVITATION_RATE_LIMITED: "rate-limited",
  INVITATION_INVALID: "invalid"
};

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export class HttpPeacePadCoordinationApi implements PeacePadCoordinationApi {
  constructor(
    private readonly config: PeacePadEnvironmentConfig,
    private readonly fetcher: FetchLike = fetch,
    private readonly accessToken: AccessTokenProvider = async () => undefined
  ) {}

  bootstrapIdentity(displayName: string, region: "ca" | "us") {
    const normalized = displayName.trim();
    if (!normalized || normalized.length > 120) {
      return Promise.reject(new PeacePadApiError("Enter a valid profile name.", "http", 400));
    }
    return this.request<{ identityId: EntityId; region: "ca" | "us"; displayName: string }>(
      "/api/v2/session/bootstrap",
      {
        method: "POST",
        body: JSON.stringify({ displayName: normalized }),
        headers: {
          "Idempotency-Key": `identity-bootstrap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
          "X-PeacePad-Region": region,
          "X-PeacePad-Schema-Version": "2.0"
        }
      }
    );
  }

  registerDevicePush(input: RegisterDevicePushInput, context: WriteContext) {
    return this.write<DevicePushRegistration>("/api/v2/devices/push", "POST", input, context);
  }

  revokeDevicePush(registrationId: EntityId, context: WriteContext) {
    return this.write<RevokedDevicePushRegistration>(
      `/api/v2/devices/push/${encodeURIComponent(registrationId)}`,
      "DELETE",
      undefined,
      context
    );
  }

  async updateProfile(displayName: string, context: WriteContext) {
    const normalized = displayName.trim();
    if (!normalized || normalized.length > 120 || /[\u0000-\u001f\u007f]/.test(normalized)) {
      throw new PeacePadApiError("Enter a valid profile name.", "http", 400);
    }
    const result = await this.write<UpdatedProfile>(
      "/api/v2/account/profile",
      "PATCH",
      { displayName: normalized },
      context
    );
    if (
      !result
      || result.identityId !== context.actor.identityId
      || result.displayName !== normalized
      || result.region !== context.region
      || !Number.isInteger(result.version)
      || result.version <= (context.expectedVersion ?? 0)
    ) {
      throw new PeacePadApiError("PeacePad could not verify the profile update.", "http", 502);
    }
    return result;
  }

  async getPersonalityPreference() {
    const result = await this.request<PersonalityPreference>("/api/v2/account/personality-preference");
    if (
      !result
      || typeof result.identityId !== "string"
      || result.region !== "ca" && result.region !== "us"
      || (result.personalityType !== null && !PERSONALITY_TYPES.includes(result.personalityType))
      || (result.updatedAt !== null && (typeof result.updatedAt !== "string" || Number.isNaN(Date.parse(result.updatedAt))))
      || !Number.isInteger(result.version)
      || result.version < 0
      || result.schemaVersion !== "2.0"
    ) {
      throw new PeacePadApiError("PeacePad could not verify your communication profile.", "http", 502);
    }
    return result;
  }

  async setPersonalityPreference(personalityType: PersonalityType | null, context: WriteContext) {
    if (personalityType !== null && !PERSONALITY_TYPES.includes(personalityType)) {
      throw new PeacePadApiError("Choose a valid communication profile.", "http", 400);
    }
    if (context.expectedVersion === null) {
      throw new PeacePadApiError("A communication profile version is required.", "http", 400);
    }
    const result = await this.write<PersonalityPreference>(
      "/api/v2/account/personality-preference",
      "PUT",
      { personalityType },
      context
    );
    if (
      !result
      || result.identityId !== context.actor.identityId
      || result.region !== context.region
      || result.personalityType !== personalityType
      || (result.updatedAt !== null && Number.isNaN(Date.parse(result.updatedAt)))
      || !Number.isInteger(result.version)
      || result.version <= context.expectedVersion
      || result.schemaVersion !== "2.0"
    ) {
      throw new PeacePadApiError("PeacePad could not verify your communication profile.", "http", 502);
    }
    return result;
  }

  listChildProfiles(familyCircleId: EntityId) {
    return this.request<readonly import("../domain/v2").ChildProfile[]>(`/api/v2/children?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createChildProfile(input: CreateChildProfileInput, context: WriteContext) {
    return this.write<import("../domain/v2").ChildProfile>("/api/v2/children", "POST", input, context);
  }

  updateChildProfile(profile: import("../domain/v2").ChildProfile, context: WriteContext) {
    return this.write<import("../domain/v2").ChildProfile>(`/api/v2/children/${encodeURIComponent(profile.id)}`, "PATCH", profile, context);
  }

  listChildUpdates(familyCircleId: EntityId, childProfileId?: EntityId) {
    const query = new URLSearchParams({ familyCircleId });
    if (childProfileId) query.set("childProfileId", childProfileId);
    return this.request<readonly ChildUpdate[]>(`/api/v2/child-updates?${query.toString()}`);
  }

  createChildUpdate(input: CreateChildUpdateInput, context: WriteContext) {
    return this.write<ChildUpdate>("/api/v2/child-updates", "POST", input, context);
  }

  listExpenses(familyCircleId: EntityId) {
    return this.request<readonly FamilyExpense[]>(`/api/v2/expenses?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createExpense(input: CreateExpenseInput, context: WriteContext) {
    return this.write<FamilyExpense>("/api/v2/expenses", "POST", input, context);
  }

  updateExpense(expense: FamilyExpense, context: WriteContext) {
    return this.write<FamilyExpense>(`/api/v2/expenses/${encodeURIComponent(expense.id)}`, "PATCH", expense, context);
  }

  listSettlements(familyCircleId: EntityId) {
    return this.request<readonly ExpenseSettlement[]>(`/api/v2/settlements?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  requestSettlement(input: CreateSettlementInput, context: WriteContext) {
    return this.write<ExpenseSettlement>("/api/v2/settlements", "POST", input, context);
  }

  resolveSettlement(settlementId: EntityId, resolution: "confirmed" | "disputed" | "cancelled", context: WriteContext) {
    return this.write<ExpenseSettlement>(`/api/v2/settlements/${encodeURIComponent(settlementId)}`, "PATCH", { resolution }, context);
  }

  getFamilyBalance(familyCircleId: EntityId) {
    return this.request<FamilyBalance>(`/api/v2/expenses/balance?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  searchSupport(input: SupportSearchInput) {
    const query = new URLSearchParams({ query: input.query.trim(), country: input.country });
    if (input.kind) query.set("kind", input.kind);
    if (input.latitude !== undefined) query.set("latitude", String(input.latitude));
    if (input.longitude !== undefined) query.set("longitude", String(input.longitude));
    return this.request<readonly SupportResource[]>(`/api/v2/support/search?${query.toString()}`);
  }

  listScheduledCalls(familyCircleId: EntityId) {
    return this.request<readonly ScheduledCall[]>(`/api/v2/scheduled-calls?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createScheduledCall(input: CreateScheduledCallInput, context: WriteContext) {
    return this.write<ScheduledCall>("/api/v2/scheduled-calls", "POST", input, context);
  }

  cancelScheduledCall(callId: EntityId, context: WriteContext) {
    return this.write<ScheduledCall>(`/api/v2/scheduled-calls/${encodeURIComponent(callId)}`, "PATCH", { status: "cancelled" }, context);
  }

  createFamily(familyName: string, context: WriteContext) {
    return this.write<CreatedFamily>("/api/v2/families", "POST", { familyName: familyName.trim() }, context);
  }

  async leaveFamily(familyCircleId: EntityId, context: WriteContext) {
    const result = await this.write<LeftFamily>(
      `/api/v2/families/${encodeURIComponent(familyCircleId)}/membership`,
      "DELETE",
      undefined,
      context
    );
    if (
      !result
      || result.familyCircleId !== familyCircleId
      || result.status !== "left"
      || !result.leftAt
      || Number.isNaN(Date.parse(result.leftAt))
      || !Number.isInteger(result.version)
      || result.version <= (context.expectedVersion ?? 0)
    ) {
      throw new PeacePadApiError("PeacePad could not verify the family exit receipt.", "http", 502);
    }
    return result;
  }

  listCaseBinders(familyCircleId: EntityId) {
    return this.request<readonly CaseBinder[]>(`/api/v2/case-binders?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createCaseBinder(input: CreateCaseBinderInput, context: WriteContext) {
    return this.write<CaseBinder>("/api/v2/case-binders", "POST", input, context);
  }

  archiveCaseBinder(binderId: EntityId, context: WriteContext) {
    return this.write<CaseBinder>(`/api/v2/case-binders/${encodeURIComponent(binderId)}`, "PATCH", { status: "archived" }, context);
  }

  async deleteAccount(context: WriteContext) {
    const result = await this.write<DeletedAccount>("/api/v2/account", "DELETE", undefined, context);
    if (
      !result
      || result.identityId !== context.actor.identityId
      || result.region !== context.region
      || result.status !== "deleted"
      || !result.deletedAt
      || Number.isNaN(Date.parse(result.deletedAt))
      || !Number.isInteger(result.version)
      || result.version <= (context.expectedVersion ?? 0)
      || typeof result.authIdentityDeleted !== "boolean"
      || typeof result.refreshSessionsRevoked !== "boolean"
      || typeof result.authCleanupPending !== "boolean"
      || typeof result.privateStorageDeleted !== "boolean"
      || typeof result.privateStorageCleanupPending !== "boolean"
    ) {
      throw new PeacePadApiError("PeacePad could not verify the account deletion receipt.", "http", 502);
    }
    return result;
  }

  async prepareAccountExport(context: WriteContext) {
    const result = await this.write<AccountExportManifest>("/api/v2/account/export", "POST", {}, context);
    if (
      !result
      || result.identityId !== context.actor.identityId
      || result.region !== context.region
      || result.schemaVersion !== "2.0"
      || result.contentIncluded !== false
      || result.status !== "manifest-ready"
      || !result.generatedAt
      || Number.isNaN(Date.parse(result.generatedAt))
      || !result.counts
      || Object.values(result.counts).some((value) => !Number.isInteger(value) || value < 0)
    ) {
      throw new PeacePadApiError("PeacePad could not verify the account export manifest.", "http", 502);
    }
    return result;
  }

  createInvitation(input: CreateInvitationInput, context: WriteContext) {
    return this.write<CreatedInvitation>("/api/v2/invitations", "POST", input, context);
  }

  async resolveInvitation(code: string) {
    const normalized = normalizeCode(code);
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      throw new InvitationError("invalid", "Enter a valid six-character invitation code.");
    }
    try {
      return await this.request<InvitationPreview>("/api/v2/invitations/resolve", {
        method: "POST",
        body: JSON.stringify({ code: normalized })
      });
    } catch (error) {
      if (error instanceof PeacePadApiError && (error.kind === "network" || error.kind === "timeout")) {
        throw new InvitationError("offline", "PeacePad cannot verify that invitation right now.");
      }
      throw error;
    }
  }

  acceptInvitation(invitationId: EntityId, context: WriteContext) {
    return this.write<AcceptedInvitation>(`/api/v2/invitations/${encodeURIComponent(invitationId)}/accept`, "POST", {}, context);
  }

  async declineInvitation(invitationId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/invitations/${encodeURIComponent(invitationId)}/decline`, "POST", {}, context);
  }

  async revokeInvitation(invitationId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/invitations/${encodeURIComponent(invitationId)}`, "DELETE", undefined, context);
  }

  listCalendarLayers(familyCircleId: EntityId) {
    return this.request<readonly CalendarLayer[]>(`/api/v2/calendar-layers?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createCalendarLayer(input: CreateCalendarLayerInput, context: WriteContext) {
    return this.write<CalendarLayer>("/api/v2/calendar-layers", "POST", input, context);
  }

  updateCalendarLayer(layer: CalendarLayer, context: WriteContext) {
    return this.write<CalendarLayer>(`/api/v2/calendar-layers/${encodeURIComponent(layer.id)}`, "PATCH", layer, context);
  }

  async deleteCalendarLayer(layerId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/calendar-layers/${encodeURIComponent(layerId)}`, "DELETE", undefined, context);
  }

  listScheduleEvents(familyCircleId: EntityId) {
    return this.request<readonly ScheduleEvent[]>(`/api/v2/schedule-events?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createScheduleEvent(input: CreateScheduleEventInput, context: WriteContext) {
    return this.write<ScheduleEvent>("/api/v2/schedule-events", "POST", input, context);
  }

  updateScheduleEvent(event: ScheduleEvent, context: WriteContext) {
    return this.write<ScheduleEvent>(`/api/v2/schedule-events/${encodeURIComponent(event.id)}`, "PATCH", event, context);
  }

  async deleteScheduleEvent(eventId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/schedule-events/${encodeURIComponent(eventId)}`, "DELETE", undefined, context);
  }

  listParentingTasks(familyCircleId: EntityId) {
    return this.request<readonly ParentingTask[]>(`/api/v2/parenting-tasks?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createParentingTask(input: CreateParentingTaskInput, context: WriteContext) {
    return this.write<ParentingTask>("/api/v2/parenting-tasks", "POST", input, context);
  }

  updateParentingTask(task: ParentingTask, context: WriteContext) {
    return this.write<ParentingTask>(`/api/v2/parenting-tasks/${encodeURIComponent(task.id)}`, "PATCH", task, context);
  }

  async deleteParentingTask(taskId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/parenting-tasks/${encodeURIComponent(taskId)}`, "DELETE", undefined, context);
  }

  createAttachmentUploadIntent(input: CreateAttachmentUploadIntentInput, context: WriteContext) {
    return this.write<AttachmentUploadIntent>("/api/v2/attachment-upload-intents", "POST", input, context);
  }

  async uploadPrivateAttachment(intent: AttachmentUploadIntent, bytes: ArrayBuffer) {
    if (
      intent.status !== "awaiting-upload"
      || intent.uploadTransport !== "supabase-signed"
      || !intent.uploadUrl
      || bytes.byteLength !== intent.byteLength
      || Number.isNaN(Date.parse(intent.expiresAt))
      || Date.parse(intent.expiresAt) <= Date.now()
    ) {
      throw new PeacePadApiError("PeacePad could not verify the private upload.", "http", 400);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const response = await this.fetcher(intent.uploadUrl, {
        method: "PUT",
        body: bytes as unknown as RequestInit["body"],
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": intent.mediaType,
          "x-upsert": "false"
        },
        signal: controller.signal
      });
      if (!response.ok) throw new PeacePadApiError("Private attachment upload failed. Try again.", "http", response.status);
    } catch (error) {
      if (error instanceof PeacePadApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new PeacePadApiError("Private attachment upload took too long. Try again.", "timeout");
      }
      throw new PeacePadApiError("PeacePad cannot reach private storage right now.", "network");
    } finally {
      clearTimeout(timeout);
    }
  }

  completePrivateAttachment(attachmentId: EntityId, context: WriteContext) {
    return this.write<PrivateAttachment>(`/api/v2/attachments/${encodeURIComponent(attachmentId)}/complete`, "POST", {}, context);
  }

  listPrivateAttachments(binderId: EntityId) {
    return this.request<readonly PrivateAttachment[]>(`/api/v2/attachments?caseBinderId=${encodeURIComponent(binderId)}`);
  }

  getPrivateAttachmentDownload(attachmentId: EntityId) {
    return this.request<PrivateAttachmentDownload>(`/api/v2/attachments/${encodeURIComponent(attachmentId)}/download`);
  }

  completeConversationAttachment(attachmentId: EntityId, context: WriteContext) {
    return this.write<ConversationAttachment>(`/api/v2/conversation-attachments/${encodeURIComponent(attachmentId)}/complete`, "POST", {}, context);
  }

  listConversationAttachments(conversationId: EntityId) {
    return this.request<readonly ConversationAttachment[]>(`/api/v2/conversation-attachments?conversationId=${encodeURIComponent(conversationId)}`);
  }

  getConversationAttachmentDownload(attachmentId: EntityId) {
    return this.request<ConversationAttachmentDownload>(`/api/v2/conversation-attachments/${encodeURIComponent(attachmentId)}/download`);
  }

  completeExpenseReceipt(intentId: EntityId, context: WriteContext) {
    return this.write<ExpenseReceiptAttachment>(`/api/v2/expense-receipts/${encodeURIComponent(intentId)}/complete`, "POST", {}, context);
  }

  getExpenseReceiptDownload(attachmentId: EntityId) {
    return this.request<ExpenseReceiptDownload>(`/api/v2/expense-receipts/${encodeURIComponent(attachmentId)}/download`);
  }

  listPrivateTimeline(binderId: EntityId, before?: string, limit = 50) {
    const query = new URLSearchParams({ caseBinderId: binderId, limit: String(limit) });
    if (before) query.set("before", before);
    return this.request<readonly PrivateTimelineEntry[]>(`/api/v2/timeline-entries?${query.toString()}`);
  }

  linkTimelineSource(input: LinkTimelineSourceInput, context: WriteContext) {
    return this.write<PrivateTimelineEntry>("/api/v2/timeline-entries", "POST", input, context);
  }

  listConversations(familyCircleId: EntityId) {
    return this.request<readonly Conversation[]>(`/api/v2/conversations?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createConversation(input: CreateConversationInput, context: WriteContext) {
    return this.write<Conversation>("/api/v2/conversations", "POST", input, context);
  }

  listMessages(conversationId: EntityId) {
    return this.request<readonly MessageEvent[]>(`/api/v2/conversations/${encodeURIComponent(conversationId)}/messages`);
  }

  sendMessage(input: SendMessageInput, context: WriteContext) {
    return this.write<MessageEvent>(
      `/api/v2/conversations/${encodeURIComponent(input.conversationId)}/messages`,
      "POST",
      input,
      context
    );
  }

  recordMessageLifecycle(input: RecordMessageLifecycleInput, context: WriteContext) {
    return this.write<MessageEvent>(
      `/api/v2/conversations/${encodeURIComponent(input.conversationId)}/messages/${encodeURIComponent(input.originalMessageEventId)}/events`,
      "POST",
      input,
      context
    );
  }

  correctMessage(input: CorrectMessageInput, context: WriteContext) {
    return this.write<MessageEvent>(
      `/api/v2/conversations/${encodeURIComponent(input.conversationId)}/messages/${encodeURIComponent(input.originalMessageEventId)}/corrections`,
      "POST",
      input,
      context
    );
  }

  searchMessages(conversationId: EntityId, query: string, limit = 20) {
    const normalized = query.trim();
    if (normalized.length < 2 || normalized.length > 100) {
      return Promise.reject(new PeacePadApiError("Enter between 2 and 100 characters to search.", "http", 400));
    }
    const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    return this.request<readonly MessageSearchResult[]>(
      `/api/v2/conversations/${encodeURIComponent(conversationId)}/messages/search`,
      { method: "POST", body: JSON.stringify({ query: normalized, limit: boundedLimit }) }
    );
  }

  getMessageCheckPreference(conversationId: EntityId) {
    return this.request<MessageCheckPreference>(
      `/api/v2/conversations/${encodeURIComponent(conversationId)}/message-check`
    );
  }

  setMessageCheckPreference(conversationId: EntityId, enabled: boolean, context: WriteContext) {
    return this.write<MessageCheckPreference>(
      `/api/v2/conversations/${encodeURIComponent(conversationId)}/message-check`,
      "PUT",
      { enabled, aiAssistanceEnabled: false },
      context
    );
  }

  previewMessage(conversationId: EntityId, content: string) {
    const normalized = content.trim();
    if (!normalized) {
      return Promise.reject(new PeacePadApiError("Enter a message to check.", "http", 400));
    }
    return this.request<MessagePreviewResponse>("/api/v2/message-previews", {
      method: "POST",
      body: JSON.stringify({ conversationId, content: normalized })
    });
  }

  getCurrentAudioCall(conversationId: EntityId) {
    return this.request<AudioCallSession | null>(
      `/api/v2/calls/current?conversationId=${encodeURIComponent(conversationId)}`
    );
  }

  createAudioCall(conversationId: EntityId, context: WriteContext) {
    return this.write<AudioCallSession>("/api/v2/calls", "POST", { conversationId, mediaType: "audio" }, context);
  }

  async transcribeCoachAudio(bytes: ArrayBuffer, mediaType: "audio/m4a" | "audio/mp4" | "audio/webm") {
    if (bytes.byteLength < 256 || bytes.byteLength > 8 * 1024 * 1024) {
      throw new PeacePadApiError("Record a Coach voice note under eight megabytes.", "http", 400);
    }
    const result = await this.request<Readonly<{ transcript: string }>>("/api/v2/coach/transcriptions", {
      method: "POST",
      body: bytes as unknown as RequestInit["body"],
      headers: {
        "Content-Type": mediaType,
        "X-PeacePad-Schema-Version": "2.0"
      }
    });
    if (!result || typeof result.transcript !== "string" || !result.transcript.trim() || result.transcript.length > 10000) {
      throw new PeacePadApiError("PeacePad could not verify the Coach transcript.", "http", 502);
    }
    return { transcript: result.transcript.trim() };
  }

  createMediaCall(conversationId: EntityId, mediaType: "audio" | "video", context: WriteContext) {
    return this.write<MediaCallSession>("/api/v2/calls", "POST", { conversationId, mediaType }, context);
  }

  getCurrentMediaCall(conversationId: EntityId) {
    return this.request<MediaCallSession | null>(`/api/v2/calls/current?conversationId=${encodeURIComponent(conversationId)}`);
  }

  acceptAudioCall(callId: EntityId, context: WriteContext) {
    return this.write<AudioCallSession>(`/api/v2/calls/${encodeURIComponent(callId)}/accept`, "POST", {}, context);
  }

  declineAudioCall(callId: EntityId, context: WriteContext) {
    return this.write<AudioCallSession>(`/api/v2/calls/${encodeURIComponent(callId)}/decline`, "POST", {}, context);
  }

  endAudioCall(callId: EntityId, context: WriteContext) {
    return this.write<AudioCallSession>(`/api/v2/calls/${encodeURIComponent(callId)}/end`, "POST", {}, context);
  }

  getAudioCallTurnCredentials(callId: EntityId, context: WriteContext) {
    if (context.expectedVersion === null) {
      return Promise.reject(new PeacePadApiError("A verified call version is required.", "http", 400));
    }
    return this.request<AudioCallTurnCredentials>(`/api/v2/calls/${encodeURIComponent(callId)}/turn-credentials`, {
      method: "GET",
      headers: {
        "If-Match": String(context.expectedVersion),
        "X-PeacePad-Region": context.region,
        "X-PeacePad-Schema-Version": context.schemaVersion
      }
    });
  }

  sendAudioCallSignal(callId: EntityId, signal: AudioCallSignal, context: WriteContext) {
    if (context.expectedVersion === null) {
      return Promise.reject(new PeacePadApiError("A verified call version is required.", "http", 400));
    }
    return this.request<AudioCallSignalReceipt>(`/api/v2/calls/${encodeURIComponent(callId)}/signals`, {
      method: "POST",
      body: JSON.stringify(signal),
      headers: {
        "If-Match": String(context.expectedVersion),
        "X-PeacePad-Region": context.region,
        "X-PeacePad-Schema-Version": context.schemaVersion
      }
    });
  }

  createConchSession(input: CreateConchSessionInput, context: WriteContext) {
    return this.write<ConchSession>("/api/v2/conch-sessions", "POST", input, context);
  }

  getCurrentConchSession(conversationId: EntityId) {
    return this.request<ConchSession | null>(`/api/v2/conch-sessions/current?conversationId=${encodeURIComponent(conversationId)}`);
  }

  getCurrentConchTurn(sessionId: EntityId) {
    return this.request<ConchTurn | null>(`/api/v2/conch-sessions/${encodeURIComponent(sessionId)}/turns/current`);
  }

  respondToConchSession(sessionId: EntityId, response: "accept" | "decline", context: WriteContext) {
    return this.write<ConchSession>(`/api/v2/conch-sessions/${encodeURIComponent(sessionId)}/respond`, "POST", { response }, context);
  }

  consentToConchSession(sessionId: EntityId, summaryConsent: boolean, context: WriteContext) {
    return this.write<ConchSession>(`/api/v2/conch-sessions/${encodeURIComponent(sessionId)}/consent`, "POST", { summaryConsent }, context);
  }

  passConchTurn(sessionId: EntityId, context: WriteContext) {
    return this.write<Readonly<{ session: ConchSession; turn: ConchTurn }>>(`/api/v2/conch-sessions/${encodeURIComponent(sessionId)}/pass`, "POST", {}, context);
  }

  reactToConchTurn(sessionId: EntityId, turnId: EntityId, reaction: ConchReaction, context: WriteContext) {
    return this.write<ConchTurn>(`/api/v2/conch-sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}/reactions`, "POST", { reaction }, context);
  }

  endConchSession(sessionId: EntityId, context: WriteContext) {
    return this.write<ConchSession>(`/api/v2/conch-sessions/${encodeURIComponent(sessionId)}/end`, "POST", {}, context);
  }

  private write<T = Record<string, never>>(
    path: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body: unknown,
    context: WriteContext
  ): Promise<T> {
    return this.request<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        "Idempotency-Key": context.idempotencyKey,
        "X-PeacePad-Region": context.region,
        "X-PeacePad-Schema-Version": context.schemaVersion,
        ...(context.expectedVersion === null ? {} : { "If-Match": String(context.expectedVersion) })
      }
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const token = await this.accessToken();
      if (this.config.environment === "staging" && !token) {
        throw new PeacePadApiError("Sign in to the isolated staging account first.", "auth-required");
      }
      const functionRegion = resolveFunctionInvocationRegion(this.config.apiBaseUrl);
      const response = await this.fetcher(`${this.config.apiBaseUrl}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(functionRegion ? { "X-Region": functionRegion } : {}),
          ...init.headers
        },
        signal: controller.signal
      });
      const payload = (await response.json().catch(() => null)) as T | ErrorPayload | null;
      if (!response.ok) {
        const error = errorDetail((payload ?? null) as ErrorPayload | null);
        // Keep production diagnostics useful without logging tokens, IDs, or
        // user content. The request ID lets support correlate this event with
        // the Edge function log when a family-space load fails.
        console.warn("[PeacePad API] request failed", {
          environment: this.config.environment,
          path,
          status: response.status,
          code: error.code,
          requestId: error.requestId ?? response.headers.get("x-request-id") ?? undefined
        });
        if (response.status === 401) {
          throw new PeacePadApiError(
            this.config.environment === "production"
              ? "Your PeacePad session expired. Sign in again."
              : "Your staging session expired. Sign in again.",
            "auth-required",
            401
          );
        }
        const invitationReason = error.code ? INVITATION_REASONS[error.code] : undefined;
        if (invitationReason) {
          throw new InvitationError(invitationReason, error.message || "This invitation is not available.");
        }
        throw new PeacePadApiError(error.message || `PeacePad request failed (${response.status}).`, "http", response.status);
      }
      if (payload === null) {
        return undefined as T;
      }
      return payload as T;
    } catch (error) {
      if (error instanceof InvitationError || error instanceof PeacePadApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new PeacePadApiError("PeacePad took too long to respond. Try again.", "timeout");
      }
      throw new PeacePadApiError(
        this.config.environment === "production"
          ? "PeacePad cannot reach the service right now."
          : "PeacePad cannot reach the staging service right now.",
        "network"
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
