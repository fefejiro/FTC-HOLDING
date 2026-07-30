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

export type MessageEvent = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    conversationId: EntityId;
    eventType: "sent" | "delivered" | "viewed" | "correction";
    originalMessageEventId: EntityId | null;
    body: string | null;
    occurredAt: IsoUtcTimestamp;
  }>;

export type ScheduleEvent = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    childProfileIds: readonly EntityId[];
    eventType: "parenting-time" | "appointment" | "holiday" | "change-request";
    startsAt: IsoUtcTimestamp;
    endsAt: IsoUtcTimestamp;
    status: "planned" | "requested" | "accepted" | "declined" | "cancelled";
  }>;

export type ExpenseRecord = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    childProfileIds: readonly EntityId[];
    amountMinor: number;
    currency: "CAD" | "USD";
    category: string;
    receiptSourceArtifactIds: readonly EntityId[];
    status: "recorded" | "requested" | "disputed" | "settled";
  }>;

export type CallSession = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    participantIdentityIds: readonly EntityId[];
    scheduledFor: IsoUtcTimestamp | null;
    startedAt: IsoUtcTimestamp | null;
    endedAt: IsoUtcTimestamp | null;
    outcome: "scheduled" | "attempted" | "missed" | "completed" | "failed";
    recordingConsentRecordIds: readonly EntityId[];
    recordingSourceArtifactId: EntityId | null;
    transcriptSourceArtifactId: EntityId | null;
  }>;

export type SourceArtifact = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    visibility: "shared-family" | "private-binder";
    originalFileName: string;
    mediaType: string;
    byteLength: number;
    sha256: string;
    objectVersionId: string;
    malwareScanStatus: "pending" | "clean" | "quarantined" | "rejected";
    capturedAt: IsoUtcTimestamp | null;
  }>;

export type EvidenceRecord = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    ownerIdentityId: EntityId;
    visibility: "private-binder";
    sourceArtifactId: EntityId;
    title: string;
    category: string;
    eventDate: string;
    description: string;
    reviewStatus: "draft" | "confirmed" | "superseded";
  }>;

export type TimelineEntry = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    visibility: "shared-family" | "private-binder";
    occurredAt: IsoUtcTimestamp;
    entryType: "message" | "schedule" | "expense" | "call" | "evidence" | "log";
    sourceEntityIds: readonly EntityId[];
    factualSummary: string;
  }>;

export type ExportPackage = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    requestedByIdentityId: EntityId;
    selectedEntityIds: readonly EntityId[];
    formats: readonly ("pdf" | "json" | "csv")[];
    manifestSha256: string;
    signatureKeyId: string;
    verificationId: string;
    generatedAt: IsoUtcTimestamp;
    status: "generating" | "ready" | "failed" | "revoked";
  }>;

export type LegalHold = VersionedEntity &
  Readonly<{
    familyCircleId: EntityId;
    scopeEntityIds: readonly EntityId[];
    reason: string;
    effectiveAt: IsoUtcTimestamp;
    releasedAt: IsoUtcTimestamp | null;
    authorizedBy: EntityId;
  }>;

export type AuditEvent = Readonly<{
  id: EntityId;
  schemaVersion: PeacePadV2SchemaVersion;
  region: DataRegion;
  sequence: number;
  occurredAt: IsoUtcTimestamp;
  actor: ActorReference;
  action: string;
  targetType: string;
  targetId: EntityId;
  previousEventHash: string | null;
  eventHash: string;
  payloadHash: string;
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
