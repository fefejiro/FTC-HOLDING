import type {
  EntityId,
  IsoUtcTimestamp,
  LayerVisibility,
  VersionedEntity
} from "./v2";

export type ChildUpdateKind = "general" | "health" | "school" | "activity" | "handover";

export type ChildUpdate = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  childProfileId: EntityId;
  authorIdentityId: EntityId;
  kind: ChildUpdateKind;
  title: string;
  body: string;
  occurredAt: IsoUtcTimestamp;
  visibility: LayerVisibility;
}>;

export type ExpenseSplit = Readonly<{
  identityId: EntityId;
  shareType: "percentage" | "fixed";
  shareValue: number;
}>;

export type FamilyExpense = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  createdByIdentityId: EntityId;
  childProfileIds: readonly EntityId[];
  title: string;
  description: string | null;
  category: "education" | "health" | "childcare" | "activity" | "clothing" | "food" | "travel" | "other";
  amountMinor: number;
  currency: "CAD" | "USD";
  incurredAt: IsoUtcTimestamp;
  status: "open" | "settlement-requested" | "settled" | "disputed" | "cancelled";
  splits: readonly ExpenseSplit[];
  receiptAttachmentId: EntityId | null;
}>;

export type ExpenseSettlement = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  expenseId: EntityId;
  requestedByIdentityId: EntityId;
  requestedFromIdentityId: EntityId;
  amountMinor: number;
  currency: "CAD" | "USD";
  status: "pending" | "confirmed" | "disputed" | "cancelled";
  requestedAt: IsoUtcTimestamp;
  resolvedAt: IsoUtcTimestamp | null;
}>;

export type FamilyBalance = Readonly<{
  familyCircleId: EntityId;
  identityId: EntityId;
  currency: "CAD" | "USD";
  owesMinor: number;
  owedMinor: number;
  netMinor: number;
  calculatedAt: IsoUtcTimestamp;
}>;

export type SupportResourceKind = "crisis" | "legal" | "counselling" | "parenting" | "family-service";

export type SupportResource = Readonly<{
  providerId: string;
  name: string;
  kind: SupportResourceKind;
  description: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  locality: string;
  subdivision: string;
  country: "CA" | "US";
  distanceKm: number | null;
  verifiedAt: IsoUtcTimestamp | null;
  emergency: boolean;
}>;

export type ScheduledCall = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  conversationId: EntityId;
  createdByIdentityId: EntityId;
  participantIdentityIds: readonly EntityId[];
  mediaType: "audio" | "video";
  startsAt: IsoUtcTimestamp;
  durationMinutes: number;
  note: string | null;
  status: "scheduled" | "cancelled" | "completed" | "missed";
}>;

export type CallMediaType = "audio" | "video";

export type MediaCallStatus = "ringing" | "active" | "declined" | "ended" | "expired";

export type MediaCallSession = Readonly<{
  id: EntityId;
  familyCircleId: EntityId;
  conversationId: EntityId;
  callerIdentityId: EntityId;
  calleeIdentityId: EntityId;
  type: CallMediaType;
  status: MediaCallStatus;
  createdAt: IsoUtcTimestamp;
  expiresAt: IsoUtcTimestamp;
  acceptedAt: IsoUtcTimestamp | null;
  endedAt: IsoUtcTimestamp | null;
  endedByIdentityId: EntityId | null;
  endReason: "declined" | "caller_cancelled" | "participant_ended" | "ring_timeout" | "authorization_revoked" | null;
  schemaVersion: "2.0";
  version: number;
  region: "ca" | "us";
}>;

export type ConchReaction = "heard" | "pause" | "agree" | "needs-clarification";

export type ConchSession = VersionedEntity & Readonly<{
  familyCircleId: EntityId;
  conversationId: EntityId;
  participantIdentityIds: readonly EntityId[];
  createdByIdentityId: EntityId;
  mediaType: CallMediaType;
  status: "invited" | "active" | "declined" | "ended" | "expired";
  consentedIdentityIds: readonly EntityId[];
  currentSpeakerIdentityId: EntityId | null;
  turnStartedAt: IsoUtcTimestamp | null;
  turnDurationSeconds: number;
  recordingEnabled: false;
  transcriptEnabled: false;
  summaryConsentIdentityIds: readonly EntityId[];
  endedAt: IsoUtcTimestamp | null;
}>;

export type ConchTurn = VersionedEntity & Readonly<{
  conchSessionId: EntityId;
  speakerIdentityId: EntityId;
  startedAt: IsoUtcTimestamp;
  endedAt: IsoUtcTimestamp | null;
  outcome: "passed" | "ended" | "timeout" | null;
  reactions: readonly Readonly<{ identityId: EntityId; reaction: ConchReaction; reactedAt: IsoUtcTimestamp }>[];
}>;

export type CommunicationAssessmentAnswer = Readonly<{
  questionId: "pace" | "detail" | "conflict" | "planning" | "emotion" | "decisions";
  score: 1 | 2 | 3 | 4 | 5;
}>;

export type CommunicationAssessment = Readonly<{
  answers: readonly CommunicationAssessmentAnswer[];
  suggestedType: string;
  completedAt: IsoUtcTimestamp;
}>;
