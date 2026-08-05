import {
  PEACEPAD_V2_SCHEMA_VERSION,
  type AuditEvent,
  type DataRegion,
  type FamilyInvitation,
  type InvitationPreview,
  type ParticipantGrant,
  type WriteContext
} from "../domain/v2";
import type { CreateInvitationInput, CreatedInvitation, InvitationFailureReason } from "../api/CoordinationApi";

export type StagingActor = Readonly<{
  identityId: string;
  displayName: string;
  sessionId: string;
  participantGrantIds?: readonly string[];
  familyPermissions: Readonly<Record<string, readonly string[]>>;
}>;

export type StoredInvitation = Readonly<{
  invitation: FamilyInvitation;
  codeHash: string;
  inviterDisplayName: string;
  familyDisplayName: string;
}>;

export interface InvitationStore {
  transaction<T>(work: (store: InvitationStore) => Promise<T>): Promise<T>;
  findById(id: string): Promise<StoredInvitation | undefined>;
  findByCodeHash(codeHash: string): Promise<StoredInvitation | undefined>;
  save(record: StoredInvitation, expectedVersion: number | null): Promise<void>;
  saveGrant(grant: ParticipantGrant): Promise<void>;
  findIdempotentResult(key: string): Promise<string | undefined>;
  saveIdempotentResult(key: string, targetId: string): Promise<void>;
  saveResolutionClaim(subjectHash: string, invitationId: string, expiresAt: string): Promise<void>;
  hasResolutionClaim(subjectHash: string, invitationId: string): Promise<boolean>;
  appendAudit(event: AuditEvent): Promise<void>;
  latestAudit(): Promise<AuditEvent | undefined>;
}

export interface SecretDigest {
  digest(input: string): Promise<string>;
}

export type InvitationDirectory = Readonly<{
  familyName(familyCircleId: string): Promise<string | undefined>;
}>;

export type Clock = Readonly<{ now(): Date }>;

export interface InvitationRateLimiter {
  enforce(scope: "create" | "resolve", subjectKey: string, limit: number, windowMs: number): Promise<boolean>;
}

export type InvitationServiceOptions = Readonly<{
  store: InvitationStore;
  digest: SecretDigest;
  directory: InvitationDirectory;
  clock?: Clock;
  pepper: string;
  maxResolveAttempts?: number;
  maxCreateAttempts?: number;
  resolveWindowMs?: number;
  rateLimiter?: InvitationRateLimiter;
}>;

export class InvitationServiceError extends Error {
  constructor(
    readonly code:
      | "UNAUTHENTICATED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "INVALID_REQUEST"
      | "INVITATION_INVALID"
      | "INVITATION_EXPIRED"
      | "INVITATION_REVOKED"
      | "INVITATION_USED"
      | "INVITATION_RATE_LIMITED"
      | "VERSION_CONFLICT"
      | "REGION_MISMATCH",
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "InvitationServiceError";
  }
}

type ResolveBucket = { startedAt: number; attempts: number };

const SYSTEM_ACTOR = {
  identityId: "service-invitations",
  sessionId: "service-invitations"
} as const;

const normalizeCode = (code: string) => code.replace(/\s+/g, "").toUpperCase();
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const codeFromDigest = (digest: string) => {
  if (!/^[a-f0-9]{12,}$/i.test(digest)) throw new Error("Digest must return hexadecimal SHA-256 output.");
  return Array.from({ length: 6 }, (_, index) => {
    const byte = Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16);
    return CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }).join("");
};

const invitationFailure = (status: FamilyInvitation["status"]): InvitationFailureReason | undefined => {
  if (status === "expired") return "expired";
  if (status === "revoked") return "revoked";
  if (status === "accepted" || status === "used") return "used";
  return undefined;
};

export class InvitationService {
  private readonly clock: Clock;
  private readonly maxResolveAttempts: number;
  private readonly maxCreateAttempts: number;
  private readonly resolveWindowMs: number;
  private readonly rateLimiter: InvitationRateLimiter;
  constructor(private readonly options: InvitationServiceOptions) {
    if (options.pepper.trim().length < 16) {
      throw new Error("Invitation hashing requires a server-only pepper of at least 16 characters.");
    }
    this.clock = options.clock ?? { now: () => new Date() };
    this.maxResolveAttempts = options.maxResolveAttempts ?? 8;
    this.maxCreateAttempts = options.maxCreateAttempts ?? 5;
    this.resolveWindowMs = options.resolveWindowMs ?? 60_000;
    this.rateLimiter = options.rateLimiter ?? new InMemoryInvitationRateLimiter(this.clock);
  }

  async create(
    input: CreateInvitationInput,
    context: WriteContext,
    actor: StagingActor
  ): Promise<CreatedInvitation> {
    this.assertContextActor(context, actor);
    await this.enforceRateLimit("create", actor.identityId, this.maxCreateAttempts);
    if (!input || typeof input.familyCircleId !== "string" || !input.familyCircleId.trim()) {
      throw new InvitationServiceError("INVALID_REQUEST", "A family is required.", 400);
    }
    if (!["parent", "caregiver", "professional", "supervisor", "restricted-child"].includes(input.invitedRole)) {
      throw new InvitationServiceError("INVALID_REQUEST", "Choose a valid participant role.", 400);
    }
    this.assertFamilyPermission(actor, input.familyCircleId, "invite");
    if (!Number.isFinite(input.expiresInHours) || input.expiresInHours <= 0 || input.expiresInHours > 168) {
      throw new InvitationServiceError("INVALID_REQUEST", "Invitation expiry must be between 1 and 168 hours.", 400);
    }
    if (!Array.isArray(input.permissions) || input.permissions.length === 0 || input.permissions.some((permission) => typeof permission !== "string" || !permission.trim())) {
      throw new InvitationServiceError("INVALID_REQUEST", "Choose at least one valid sharing permission.", 400);
    }

    const familyDisplayName = await this.options.directory.familyName(input.familyCircleId);
    if (!familyDisplayName) {
      throw new InvitationServiceError("FORBIDDEN", "You cannot invite participants to this family.", 403);
    }

    const code = await this.deriveCode(input.familyCircleId, context);
    return this.options.store.transaction(async (store) => {
      const operationKey = this.idempotencyKey("create", context);
      const priorId = await store.findIdempotentResult(operationKey);
      if (priorId) {
        const prior = await store.findById(priorId);
        if (!prior) throw new Error("Idempotency record points to a missing invitation.");
        return { invitation: prior.invitation, code, deepLink: `https://peacepad.ca/invite/${code}` };
      }

      const now = this.clock.now();
      const id = `inv_${(await this.options.digest.digest(
        `${this.options.pepper}:id:${context.region}:${actor.identityId}:${input.familyCircleId}:${context.idempotencyKey}`
      )).slice(0, 20)}`;
      const invitation: FamilyInvitation = {
        id,
        schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
        version: 1,
        region: context.region,
        provenance: {
          createdAt: now.toISOString(),
          createdBy: context.actor,
          source: "app"
        },
        familyCircleId: input.familyCircleId,
        invitedRole: input.invitedRole,
        permissions: [...new Set(input.permissions.map((permission) => permission.trim()))],
        invitedByIdentityId: actor.identityId,
        expiresAt: new Date(now.getTime() + input.expiresInHours * 3_600_000).toISOString(),
        status: "pending",
        acceptedParticipantGrantId: null
      };
      const codeHash = await this.hashCode(code);
      await store.save({ invitation, codeHash, inviterDisplayName: actor.displayName, familyDisplayName }, null);
      await store.saveIdempotentResult(operationKey, invitation.id);
      await this.audit("invitation.created", invitation.id, context, { familyCircleId: input.familyCircleId }, store);
      return { invitation, code, deepLink: `https://peacepad.ca/invite/${code}` };
    });
  }

  async resolve(codeInput: string, requesterKey: string): Promise<InvitationPreview> {
    await this.enforceRateLimit("resolve", requesterKey, this.maxResolveAttempts);
    const code = normalizeCode(codeInput);
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new InvitationServiceError("INVITATION_INVALID", "Enter a valid six-character invitation code.", 404);
    }
    const codeHash = await this.hashCode(code);
    const subjectHash = await this.hashResolutionSubject(requesterKey);
    return this.options.store.transaction(async (store) => {
      const record = await store.findByCodeHash(codeHash);
      if (!record) {
        throw new InvitationServiceError("INVITATION_INVALID", "This invitation is not available.", 404);
      }
      const invitation = await this.expireIfNeeded(record, store);
      this.assertInvitationAvailable(invitation);
      await store.saveResolutionClaim(subjectHash, invitation.id, invitation.expiresAt);
      return {
        invitationId: invitation.id,
        inviterDisplayName: record.inviterDisplayName,
        familyDisplayName: record.familyDisplayName,
        invitedRole: invitation.invitedRole,
        permissions: invitation.permissions,
        expiresAt: invitation.expiresAt
      };
    });
  }

  async accept(
    invitationId: string,
    context: WriteContext,
    actor: StagingActor,
    requesterKey: string = actor.sessionId
  ): Promise<ParticipantGrant> {
    this.assertContextActor(context, actor);
    return this.options.store.transaction(async (store) => {
      const operationKey = this.idempotencyKey(`accept:${invitationId}`, context);
      const priorGrantId = await store.findIdempotentResult(operationKey);
      const record = await this.requireInvitation(invitationId, store);
      if (priorGrantId && record.invitation.acceptedParticipantGrantId === priorGrantId) {
        return this.grantFrom(record.invitation, actor, priorGrantId);
      }
      const invitation = await this.expireIfNeeded(record, store);
      this.assertRegion(invitation.region, context.region);
      this.assertVersion(invitation.version, context.expectedVersion);
      this.assertInvitationAvailable(invitation);
      await this.assertResolvedClaim(requesterKey, invitationId, store);
      if (invitation.invitedByIdentityId === actor.identityId) {
        throw new InvitationServiceError("FORBIDDEN", "The sender cannot accept their own invitation.", 403);
      }

      const grantId = `grant_${(await this.options.digest.digest(`${invitation.id}:${actor.identityId}`)).slice(0, 20)}`;
      const grant = this.grantFrom(invitation, actor, grantId);
      const accepted: FamilyInvitation = {
        ...invitation,
        version: invitation.version + 1,
        status: "accepted",
        acceptedParticipantGrantId: grant.id
      };
      await store.save({ ...record, invitation: accepted }, invitation.version);
      await store.saveGrant(grant);
      await store.saveIdempotentResult(operationKey, grant.id);
      await this.audit("invitation.accepted", invitation.id, context, { participantGrantId: grant.id }, store);
      return grant;
    });
  }

  async decline(
    invitationId: string,
    context: WriteContext,
    actor: StagingActor,
    requesterKey: string = actor.sessionId
  ): Promise<void> {
    await this.transition(invitationId, "declined", context, actor, false, requesterKey);
  }

  async revoke(invitationId: string, context: WriteContext, actor: StagingActor): Promise<void> {
    await this.transition(invitationId, "revoked", context, actor, true, actor.sessionId);
  }

  private async transition(
    invitationId: string,
    target: "declined" | "revoked",
    context: WriteContext,
    actor: StagingActor,
    requiresFamilyPermission: boolean,
    requesterKey: string
  ) {
    this.assertContextActor(context, actor);
    await this.options.store.transaction(async (store) => {
      const operationKey = this.idempotencyKey(`${target}:${invitationId}`, context);
      if (await store.findIdempotentResult(operationKey)) return;
      const record = await this.requireInvitation(invitationId, store);
      const invitation = await this.expireIfNeeded(record, store);
      this.assertRegion(invitation.region, context.region);
      this.assertVersion(invitation.version, context.expectedVersion);
      this.assertInvitationAvailable(invitation);
      if (requiresFamilyPermission) {
        this.assertFamilyPermission(actor, invitation.familyCircleId, "invite");
      } else {
        await this.assertResolvedClaim(requesterKey, invitationId, store);
      }
      const updated = { ...invitation, version: invitation.version + 1, status: target } as FamilyInvitation;
      await store.save({ ...record, invitation: updated }, invitation.version);
      await store.saveIdempotentResult(operationKey, invitation.id);
      await this.audit(`invitation.${target}`, invitation.id, context, {}, store);
    });
  }

  private async deriveCode(familyCircleId: string, context: WriteContext) {
    const digest = await this.options.digest.digest(
      `${this.options.pepper}:code:${familyCircleId}:${context.actor.identityId}:${context.idempotencyKey}`
    );
    return codeFromDigest(digest);
  }

  private hashCode(code: string) {
    return this.options.digest.digest(`${this.options.pepper}:lookup:${normalizeCode(code)}`);
  }

  private async expireIfNeeded(record: StoredInvitation, store: InvitationStore): Promise<FamilyInvitation> {
    const invitation = record.invitation;
    if (invitation.status !== "pending" || Date.parse(invitation.expiresAt) > this.clock.now().getTime()) {
      return invitation;
    }
    const expired = { ...invitation, version: invitation.version + 1, status: "expired" } as FamilyInvitation;
    await store.save({ ...record, invitation: expired }, invitation.version);
    await this.audit("invitation.expired", invitation.id, {
      idempotencyKey: `system-expire-${invitation.id}-${expired.version}`,
      expectedVersion: invitation.version,
      region: invitation.region,
      schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      actor: SYSTEM_ACTOR
    }, {}, store);
    return expired;
  }

  private async requireInvitation(invitationId: string, store: InvitationStore) {
    const record = await store.findById(invitationId);
    if (!record) throw new InvitationServiceError("INVITATION_INVALID", "This invitation is not available.", 404);
    return record;
  }

  private assertInvitationAvailable(invitation: FamilyInvitation) {
    const reason = invitationFailure(invitation.status);
    if (!reason && invitation.status === "pending") return;
    const code = reason === "expired" ? "INVITATION_EXPIRED" : reason === "revoked" ? "INVITATION_REVOKED" : "INVITATION_USED";
    throw new InvitationServiceError(code, "This invitation is no longer available.", 409);
  }

  private assertContextActor(context: WriteContext, actor: StagingActor) {
    if (!actor.identityId || context.actor.identityId !== actor.identityId || context.actor.sessionId !== actor.sessionId) {
      throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
    }
    if (!context.idempotencyKey.trim()) {
      throw new InvitationServiceError("INVALID_REQUEST", "An idempotency key is required.", 400);
    }
  }

  private assertFamilyPermission(actor: StagingActor, familyCircleId: string, permission: string) {
    if (!actor.familyPermissions[familyCircleId]?.includes(permission)) {
      throw new InvitationServiceError("FORBIDDEN", "You cannot manage invitations for this family.", 403);
    }
  }

  private async assertResolvedClaim(requesterKey: string, invitationId: string, store: InvitationStore) {
    const subjectHash = await this.hashResolutionSubject(requesterKey);
    if (!(await store.hasResolutionClaim(subjectHash, invitationId))) {
      throw new InvitationServiceError("FORBIDDEN", "Resolve this invitation before responding.", 403);
    }
  }

  private hashResolutionSubject(requesterKey: string) {
    return this.options.digest.digest(`${this.options.pepper}:resolution-claim:${requesterKey}`);
  }

  private assertRegion(actual: DataRegion, expected: DataRegion) {
    if (actual !== expected) throw new InvitationServiceError("REGION_MISMATCH", "Invitation region mismatch.", 409);
  }

  private assertVersion(actual: number, expected: number | null) {
    if (expected !== null && actual !== expected) {
      throw new InvitationServiceError("VERSION_CONFLICT", "The invitation changed. Refresh and try again.", 409);
    }
  }

  private async enforceRateLimit(scope: "create" | "resolve", requesterKey: string, limit: number) {
    const key = requesterKey.trim();
    if (!key) throw new InvitationServiceError("INVALID_REQUEST", "A request identifier is required.", 400);
    if (!(await this.rateLimiter.enforce(scope, key, limit, this.resolveWindowMs))) {
      throw new InvitationServiceError("INVITATION_RATE_LIMITED", "Too many attempts. Try again later.", 429);
    }
  }

  private idempotencyKey(operation: string, context: WriteContext) {
    return `${context.region}:${context.actor.identityId}:${operation}:${context.idempotencyKey}`;
  }

  private grantFrom(invitation: FamilyInvitation, actor: StagingActor, id: string): ParticipantGrant {
    const grantedAt = this.clock.now().toISOString();
    return {
      id,
      schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      version: 1,
      region: invitation.region,
      provenance: { createdAt: grantedAt, createdBy: { identityId: actor.identityId, sessionId: actor.sessionId }, source: "app" },
      familyCircleId: invitation.familyCircleId,
      identityId: actor.identityId,
      role: invitation.invitedRole,
      permissions: invitation.permissions,
      grantedAt,
      revokedAt: null,
      grantedBy: invitation.invitedByIdentityId
    };
  }

  private async audit(action: string, targetId: string, context: WriteContext, payload: unknown, store: InvitationStore) {
    const previous = await store.latestAudit();
    const occurredAt = this.clock.now().toISOString();
    const payloadHash = await this.options.digest.digest(JSON.stringify(payload));
    const sequence = (previous?.sequence ?? 0) + 1;
    const previousEventHash = previous?.eventHash ?? null;
    const eventHash = await this.options.digest.digest(
      JSON.stringify({
        schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
        region: context.region,
        sequence,
        occurredAt,
        actor: context.actor,
        action,
        targetType: "FamilyInvitation",
        targetId,
        previousEventHash,
        payloadHash
      })
    );
    await store.appendAudit({
      id: `audit_${eventHash.slice(0, 20)}`,
      schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      region: context.region,
      sequence,
      occurredAt,
      actor: context.actor,
      action,
      targetType: "FamilyInvitation",
      targetId,
      previousEventHash,
      eventHash,
      payloadHash
    });
  }
}

export class InMemoryInvitationRateLimiter implements InvitationRateLimiter {
  private readonly buckets = new Map<string, ResolveBucket>();

  constructor(private readonly clock: Clock = { now: () => new Date() }) {}

  async enforce(scope: "create" | "resolve", subjectKey: string, limit: number, windowMs: number) {
    const key = `${scope}:${subjectKey}`;
    const now = this.clock.now().getTime();
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.startedAt >= windowMs) {
      this.buckets.set(key, { startedAt: now, attempts: 1 });
      return true;
    }
    if (bucket.attempts >= limit) return false;
    bucket.attempts += 1;
    return true;
  }
}

export class InMemoryInvitationStore implements InvitationStore {
  readonly invitations = new Map<string, StoredInvitation>();
  readonly grants = new Map<string, ParticipantGrant>();
  readonly idempotency = new Map<string, string>();
  readonly resolutionClaims = new Map<string, string>();
  readonly auditEvents: AuditEvent[] = [];

  constructor(private readonly now: () => number = Date.now) {}

  async transaction<T>(work: (store: InvitationStore) => Promise<T>): Promise<T> {
    const invitations = new Map(this.invitations);
    const grants = new Map(this.grants);
    const idempotency = new Map(this.idempotency);
    const resolutionClaims = new Map(this.resolutionClaims);
    const auditEvents = [...this.auditEvents];
    try {
      return await work(this);
    } catch (error) {
      this.invitations.clear();
      invitations.forEach((value, key) => this.invitations.set(key, value));
      this.grants.clear();
      grants.forEach((value, key) => this.grants.set(key, value));
      this.idempotency.clear();
      idempotency.forEach((value, key) => this.idempotency.set(key, value));
      this.resolutionClaims.clear();
      resolutionClaims.forEach((value, key) => this.resolutionClaims.set(key, value));
      this.auditEvents.splice(0, this.auditEvents.length, ...auditEvents);
      throw error;
    }
  }

  async findById(id: string) { return this.invitations.get(id); }
  async findByCodeHash(codeHash: string) {
    return [...this.invitations.values()].find((record) => record.codeHash === codeHash);
  }
  async save(record: StoredInvitation, expectedVersion: number | null) {
    const existing = this.invitations.get(record.invitation.id);
    if (expectedVersion === null && existing) throw new InvitationServiceError("VERSION_CONFLICT", "Invitation already exists.", 409);
    if (expectedVersion !== null && existing?.invitation.version !== expectedVersion) {
      throw new InvitationServiceError("VERSION_CONFLICT", "The invitation changed. Refresh and try again.", 409);
    }
    this.invitations.set(record.invitation.id, record);
  }
  async saveGrant(grant: ParticipantGrant) { this.grants.set(grant.id, grant); }
  async findIdempotentResult(key: string) { return this.idempotency.get(key); }
  async saveIdempotentResult(key: string, targetId: string) { this.idempotency.set(key, targetId); }
  async saveResolutionClaim(subjectHash: string, invitationId: string, expiresAt: string) {
    this.resolutionClaims.set(`${subjectHash}:${invitationId}`, expiresAt);
  }
  async hasResolutionClaim(subjectHash: string, invitationId: string) {
    const expiresAt = this.resolutionClaims.get(`${subjectHash}:${invitationId}`);
    return expiresAt !== undefined && Date.parse(expiresAt) > this.now();
  }
  async appendAudit(event: AuditEvent) {
    const previous = this.auditEvents.at(-1);
    if (event.sequence !== (previous?.sequence ?? 0) + 1 || event.previousEventHash !== (previous?.eventHash ?? null)) {
      throw new Error("Append-only audit chain violation.");
    }
    this.auditEvents.push(event);
  }
  async latestAudit() { return this.auditEvents.at(-1); }
}
