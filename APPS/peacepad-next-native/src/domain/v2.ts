export const PEACEPAD_V2_SCHEMA_VERSION = "2.0" as const;

export type PeacePadV2SchemaVersion = typeof PEACEPAD_V2_SCHEMA_VERSION;
export type DataRegion = "ca" | "us";
export type CountryCode = "CA" | "US";
export type IsoUtcTimestamp = string;
export type EntityId = string;

export type ActorReference = Readonly<{
  identityId: EntityId;
  participantGrantId?: EntityId;
  sessionId: EntityId;
  deviceId?: EntityId;
}>;

export type RecordProvenance = Readonly<{
  createdAt: IsoUtcTimestamp;
  createdBy: ActorReference;
  source: "app" | "import" | "integration" | "system";
  sourceReference?: string;
}>;

export type VersionedEntity = Readonly<{
  id: EntityId;
  schemaVersion: PeacePadV2SchemaVersion;
  version: number;
  region: DataRegion;
  provenance: RecordProvenance;
}>;

export type WriteContext = Readonly<{
  idempotencyKey: string;
  expectedVersion: number | null;
  region: DataRegion;
  schemaVersion: PeacePadV2SchemaVersion;
  actor: ActorReference;
}>;

export type Identity = VersionedEntity &
  Readonly<{
    kind: "adult" | "professional" | "service";
    status: "active" | "suspended" | "deleted";
    locale: "en-CA" | "fr-CA" | "en-US" | "es-US";
  }>;

export type FamilyCircle = VersionedEntity &
  Readonly<{
    country: CountryCode;
    subdivision: string;
    mode: "connected" | "parallel-parenting" | "solo" | "supervised";
    status: "active" | "archived";
  }>;

export type ParticipantRole =
  | "parent"
  | "caregiver"
  | "professional"
  | "supervisor"
  | "restricted-child";

export type ParticipantGrant = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    identityId: EntityId;
    role: ParticipantRole;
    permissions: readonly string[];
    grantedAt: IsoUtcTimestamp;
    revokedAt: IsoUtcTimestamp | null;
    grantedBy: EntityId;
  }>;

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired" | "revoked" | "used";

export type FamilyInvitation = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    invitedRole: ParticipantRole;
    permissions: readonly string[];
    invitedByIdentityId: EntityId;
    expiresAt: IsoUtcTimestamp;
    status: InvitationStatus;
    acceptedParticipantGrantId: EntityId | null;
  }>;

export type InvitationPreview = Readonly<{
  invitationId: EntityId;
  version: number;
  inviterDisplayName: string;
  familyDisplayName: string;
  invitedRole: ParticipantRole;
  permissions: readonly string[];
  expiresAt: IsoUtcTimestamp;
}>;

export type ChildProfile = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    displayName: string;
    managedByAdultIdentityIds: readonly EntityId[];
    directLoginEnabled: false;
  }>;

export type ConsentPurpose =
  | "terms"
  | "privacy"
  | "ai-message-assistance"
  | "call-recording"
  | "call-transcription"
  | "location-check-in";

export type ConsentRecord = VersionedEntity &
  Readonly<{
    identityId: EntityId;
    purpose: ConsentPurpose;
    status: "granted" | "declined" | "withdrawn";
    policyVersion: string;
    recordedAt: IsoUtcTimestamp;
    withdrawnAt: IsoUtcTimestamp | null;
  }>;

export type Conversation = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    participantIdentityIds: readonly EntityId[];
    status: "active" | "archived";
  }>;

export type AcceptedInvitation = Readonly<{
  grant: ParticipantGrant;
  conversation: Conversation;
}>;

export type MessageEvent = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    conversationId: EntityId;
    eventType: "sent" | "delivered" | "viewed" | "correction";
    originalMessageEventId: EntityId | null;
    body: string | null;
    occurredAt: IsoUtcTimestamp;
  }>;

export type MessageCheckPreference = VersionedEntity &
  Readonly<{
    identityId: EntityId;
    conversationId: EntityId;
    enabled: boolean;
    aiAssistanceEnabled: boolean;
  }>;

export type CalendarLayerKind =
  | "parenting-time"
  | "expenses-requests"
  | "events-activities"
  | "calls"
  | "custom";

export type LayerVisibility =
  | Readonly<{ scope: "private" }>
  | Readonly<{ scope: "family" }>
  | Readonly<{ scope: "selected"; participantGrantIds: readonly EntityId[] }>;

export type CalendarLayer = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    ownerIdentityId: EntityId;
    name: string;
    kind: CalendarLayerKind;
    icon: "calendar" | "clock" | "receipt" | "activity" | "phone" | "custom";
    colorToken: "teal" | "violet" | "amber" | "rose" | "blue" | "green";
    visibility: LayerVisibility;
  }>;

export type RecurrenceRule = Readonly<{
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  weekdays: readonly ("MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU")[];
  until: IsoUtcTimestamp | null;
  count: number | null;
}>;

export type ScheduleEvent = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    calendarLayerId: EntityId;
    childProfileIds: readonly EntityId[];
    eventType: "parenting-time" | "appointment" | "holiday" | "change-request";
    title: string;
    description: string | null;
    startsAt: IsoUtcTimestamp;
    endsAt: IsoUtcTimestamp;
    status: "planned" | "requested" | "accepted" | "declined" | "cancelled";
    recurrence: RecurrenceRule | null;
    visibilityOverride: LayerVisibility | null;
  }>;

export type ParentingSchedulePattern = "week_on_off" | "every_other_weekend" | "two_two_three";

/** The single shared parenting-time rule currently active for a family. */
export type ParentingSchedulePlan = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  calendarLayerId: EntityId;
  createdByIdentityId: EntityId;
  pattern: ParentingSchedulePattern;
  startDate: string;
  primaryParentIdentityId: EntityId;
  secondaryParentIdentityId: EntityId | null;
  timezone: string;
  status: "active" | "paused";
  updatedAt: IsoUtcTimestamp;
}>;

export type ParentingScheduleException = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  parentingSchedulePlanId: EntityId;
  requestedByIdentityId: EntityId;
  assignedParentIdentityId: EntityId;
  kind: "holiday" | "vacation" | "swap" | "other";
  startDate: string;
  endDate: string;
  note: string | null;
  status: "proposed" | "accepted" | "declined" | "cancelled";
  resolvedByIdentityId: EntityId | null;
  resolvedAt: IsoUtcTimestamp | null;
}>;

/**
 * A practical item a parent can keep private or explicitly share.  This is a
 * native V2 record, not a client-side checklist or a migrated legacy shell.
 */
export type ParentingTask = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    createdByIdentityId: EntityId;
    assignedToIdentityId: EntityId | null;
    title: string;
    dueAt: IsoUtcTimestamp | null;
    status: "open" | "completed";
    visibility: LayerVisibility;
    completedAt: IsoUtcTimestamp | null;
    completedByIdentityId: EntityId | null;
  }>;

export type CaseBinder = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    ownerIdentityId: EntityId;
    name: string;
    childLabel: string;
    status: "active" | "archived";
  }>;

export type TimelineSourceKind = "message-event" | "schedule-event";

export type TimelineSourceReference = Readonly<{
  kind: TimelineSourceKind;
  sourceId: EntityId;
  eventType: "sent" | "correction" | "parenting-time" | "appointment" | "holiday" | "change-request";
  sourceVersion: number | null;
}>;

export type PrivateTimelineEntry = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    ownerIdentityId: EntityId;
    caseBinderId: EntityId;
    source: TimelineSourceReference;
    occurredAt: IsoUtcTimestamp;
  }>;

export type AttachmentMediaType =
  | "image/jpeg"
  | "image/png"
  | "application/pdf"
  | "text/plain"
  | "audio/m4a"
  | "audio/mp4"
  | "audio/webm";

export type AttachmentTarget =
  | Readonly<{ kind: "conversation"; conversationId: EntityId }>
  | Readonly<{ kind: "expense-receipt" }>
  | Readonly<{ kind: "private-binder"; binderId: EntityId }>;

export type AttachmentUploadIntent = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    ownerIdentityId: EntityId;
    target: AttachmentTarget;
    originalFileName: string;
    mediaType: AttachmentMediaType;
    byteLength: number;
    expiresAt: IsoUtcTimestamp;
    status: "metadata-prepared" | "awaiting-upload";
    uploadTransport: "disabled" | "supabase-signed";
    uploadUrl: string | null;
    objectPath?: string;
  }>;

export type PrivateAttachment = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    ownerIdentityId: EntityId;
    target: Readonly<{ kind: "private-binder"; binderId: EntityId }>;
    originalFileName: string;
    mediaType: AttachmentMediaType;
    byteLength: number;
    status: "available";
  }>;

export type PrivateAttachmentDownload = Readonly<{
  attachment: PrivateAttachment;
  downloadUrl: string;
  expiresAt: IsoUtcTimestamp;
}>;

export type ConversationAttachment = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  ownerIdentityId: EntityId;
  target: Readonly<{ kind: "conversation"; conversationId: EntityId }>;
  originalFileName: string;
  mediaType: AttachmentMediaType;
  byteLength: number;
  status: "available";
  occurredAt: IsoUtcTimestamp;
}>;

export type ExpenseReceiptAttachment = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  ownerIdentityId: EntityId;
  target: Readonly<{ kind: "expense-receipt" }>;
  originalFileName: string;
  mediaType: "image/jpeg" | "image/png" | "application/pdf";
  byteLength: number;
  status: "available";
  linkedExpenseId: EntityId | null;
}>;

export type ExpenseReceiptDownload = Readonly<{
  attachment: ExpenseReceiptAttachment;
  downloadUrl: string;
  expiresAt: IsoUtcTimestamp;
}>;

export type ConversationAttachmentDownload = Readonly<{
  attachment: ConversationAttachment;
  downloadUrl: string;
  expiresAt: IsoUtcTimestamp;
}>;

export type PrepareAttachmentIntentRequest = Readonly<{
  familyCircleId: EntityId;
  ownerIdentityId: EntityId;
  target: AttachmentTarget;
  originalFileName: string;
  mediaType: AttachmentMediaType;
  byteLength: number;
  idempotencyKey: string;
}>;

export function createWriteContext(input: {
  idempotencyKey: string;
  expectedVersion?: number | null;
  region: DataRegion;
  actor: ActorReference;
}): WriteContext {
  const idempotencyKey = input.idempotencyKey.trim();
  if (!idempotencyKey) {
    throw new Error("A non-empty idempotency key is required.");
  }
  if (
    input.expectedVersion !== undefined &&
    input.expectedVersion !== null &&
    (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0)
  ) {
    throw new Error("Expected version must be a non-negative integer or null.");
  }
  return {
    idempotencyKey,
    expectedVersion: input.expectedVersion ?? null,
    region: input.region,
    schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
    actor: input.actor
  };
}
