# PeacePad Native Domain and API Contract v0.1

Status: DRAFT - DESIGN ONLY
Version: 0.1
Date: 2026-07-29
Applies to: `APPS/peacepad-next-native`
Data classification: synthetic examples only

## 1. Purpose and boundary

This document defines the proposed versioned domain and API boundary for
PeacePad Native v2. It is a design contract, not evidence that the described
backend, storage, authorization, export, or institutional controls exist.

The current repository is an isolated Expo / React Native lab:

- bundle ID: `ca.peacepad.nextnative.lab`;
- production API writes: disabled;
- one typed synthetic flow is stored in React memory only;
- the original-file object is a placeholder and no file is uploaded;
- export selection does not create or share a file;
- no production authentication, database, evidence service, or professional
  access exists.

The working tree also contains an in-progress Gate 1 foundation for:

- lab or staging environment selection;
- required Terms and Privacy consent before guest-session creation;
- optional AI-message consent, default off;
- secure device storage for a guest session;
- `POST /api/auth/guest`;
- `POST /api/messages/preview`.

Those Gate 1 files are not treated as a committed or production-verified
baseline by this specification.

This contract MUST NOT be used to:

- enable production writes from the lab;
- import real family or court records;
- change the lab bundle ID;
- create a second App Store record;
- claim that PeacePad records are automatically admissible;
- represent PeacePad as a court, government, or legal service.

## 2. Normative language and status

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` describe requirements for a future
approved implementation. Every contract item remains `PROPOSED` until code,
tests, security review, and environment-specific evidence exist.

Contract status values:

| Status | Meaning |
| --- | --- |
| `OBSERVED-LAB` | Present in the current lab source or automated synthetic tests |
| `PROPOSED` | Required design, not implemented or verified |
| `DEFERRED` | Deliberately outside the first production slice |
| `PROHIBITED` | Must not be implemented without a new approved specification |

## 3. Contract invariants

1. Authorization is server-enforced and deny-by-default.
2. A client-provided role, owner ID, review state, timestamp, hash, or consent
   record is never trusted without server validation.
3. Tenant and binder boundaries are enforced on every query and mutation.
4. Original evidence content is immutable after verified ingestion.
5. Corrections, reviews, redactions, and annotations are new linked records.
6. Required consent and optional AI consent are separate, versioned records.
7. AI is optional assistance and never determines legal relevance, credibility,
   custody, risk, or admissibility.
8. Production logs exclude message bodies, evidence content, access tokens,
   precise location, child details, and export contents.
9. Requests that can be retried MUST support idempotency.
10. Exports MUST state their scope, provenance, generation time, and verification
    status without claiming legal admissibility.

## 4. Common data rules

### 4.1 Identifiers

- Server-generated resource IDs MUST be opaque and globally unique.
- UUIDv7 or an equivalent time-sortable, non-enumerable format is preferred.
- Human-readable case numbers, child names, emails, and filenames MUST NOT be
  used as primary keys.
- Client-generated temporary IDs MAY be accepted only through a documented
  idempotent create operation.

### 4.2 Time

- Canonical timestamps MUST be RFC 3339 UTC with millisecond precision.
- User-entered event dates MUST preserve the entered date and declared time
  zone separately from server receipt time.
- The client MUST display the relevant local time zone in records and exports.
- Server time, client-asserted time, and source-file metadata MUST remain
  distinguishable.

### 4.3 Version and concurrency

Every mutable aggregate SHOULD expose:

```json
{
  "schemaVersion": "1.0",
  "revision": 4,
  "createdAt": "2026-07-29T18:00:00.000Z",
  "updatedAt": "2026-07-29T18:03:00.000Z"
}
```

Mutations MUST use an `If-Match` revision or equivalent optimistic-concurrency
token. A stale mutation returns `409 REVISION_CONFLICT`; the server MUST NOT
silently overwrite a newer value.

### 4.4 Pagination

Collection endpoints MUST use opaque cursor pagination:

```json
{
  "items": [],
  "nextCursor": null,
  "hasMore": false
}
```

Offset pagination MUST NOT be used for append-only audit or timeline feeds.

## 5. Domain model

### 5.1 Principal and session

| Entity | Required fields | Current status |
| --- | --- | --- |
| `Principal` | `id`, `principalType`, `status` | `PROPOSED` |
| `Session` | `id`, `principalId`, `assuranceLevel`, `expiresAt`, `revokedAt` | Guest subset is in progress |
| `DeviceRegistration` | `id`, `principalId`, `platform`, notification preference, revocation state | `PROPOSED` |

`principalType` is one of:

- `guest`;
- `account-member`;
- `invited-professional`;
- `support-operator`;
- `service-worker`.

There is no child principal in v0.1. A child reference is descriptive data
managed by an authorized adult, not an account capable of consent or access.

### 5.2 Consent grant

```ts
type ConsentGrant = {
  id: string;
  principalId: string;
  purpose: "terms" | "privacy-notice" | "ai-message-assistance";
  documentVersion: string;
  grantedAt: string;
  withdrawnAt: string | null;
  captureChannel: "ios" | "android" | "web";
};
```

- Terms acceptance and Privacy acknowledgement are required before storing a
  guest or account session.
- AI-message assistance is optional and defaults to off.
- Withdrawal MUST prevent future processing for that optional purpose.
- A consent event MUST NOT be inferred from opening or dismissing a screen.
- A future AI call or transcription purpose requires its own specification and
  grant. It is not covered by `ai-message-assistance`.

### 5.3 Family space and case binder

`FamilySpace` is the tenancy boundary for shared co-parenting records.
`CaseBinder` is a user-organized collection inside that boundary.

```ts
type CaseBinder = {
  id: string;
  familySpaceId: string;
  name: string;
  childLabel: string;
  supportContact?: string;
  sourceTypes: string[];
  lifecycle: "active" | "archived" | "deletion-pending";
  revision: number;
};
```

The current lab `CaseBinder` is `OBSERVED-LAB`, but it lacks tenancy,
authorization, lifecycle, persistence, and concurrency fields.

`childLabel` SHOULD support a pseudonym or initials. A full legal name MUST NOT
be required merely to create a binder.

### 5.4 Membership and delegation

```ts
type Membership = {
  id: string;
  familySpaceId: string;
  principalId: string;
  role: "owner" | "co-parent" | "professional-viewer";
  scope: "all-current-records" | "selected-binders" | "selected-exports";
  startsAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
};
```

Professional access MUST be purpose-bound, time-limited, revocable, and
audited. It MUST NOT imply authority to edit user-authored facts or upload
records as another person.

### 5.5 Message draft and message record

`MessageDraft` is private working content. `MessageRecord` is an immutable sent
communication or recorded external communication.

```ts
type MessageDraft = {
  id: string;
  ownerPrincipalId: string;
  content: string;
  aiAssistanceUsed: boolean;
  updatedAt: string;
};

type MessageRecord = {
  id: string;
  familySpaceId: string;
  senderPrincipalId: string;
  recipientPrincipalIds: string[];
  originalContent: string;
  sentAt: string;
  deliveryEvents: string[];
};
```

Rule-based preview MAY operate without AI consent. Third-party AI processing
MUST be rejected by the server unless an active, version-matched consent grant
exists. The original user text MUST remain available when an AI suggestion is
accepted.

### 5.6 Parenting event and scheduled contact

```ts
type ParentingEvent = {
  id: string;
  familySpaceId: string;
  eventType: "parenting-time" | "child-contact" | "exchange" | "other";
  scheduledStart: string | null;
  scheduledEnd: string | null;
  observedOutcome: "completed" | "attempted-no-answer" | "cancelled" | "other";
  recordedBy: string;
  note: string | null;
};
```

An observed outcome is the recorder's assertion, not an independently verified
fact. The API and export MUST label it accordingly.

Call audio or video recording is `PROHIBITED` in v0.1. A future calling
specification must address jurisdiction-specific consent, child safety,
retention, and recording restrictions.

### 5.7 Evidence object

```ts
type EvidenceObject = {
  id: string;
  familySpaceId: string;
  binderId: string;
  title: string;
  category: string;
  assertedEventDate: string;
  sourceDescription: string;
  userDescription: string;
  ingestState: "initiated" | "quarantined" | "verified" | "rejected";
  originalBlobId: string | null;
  originalSha256: string | null;
  originalFileName: string;
  mediaType: string;
  byteLength: number | null;
  createdBy: string;
  createdAt: string;
};
```

The current lab `EvidenceRecord` is `OBSERVED-LAB` with
`storageState: "placeholder-only"`. It is not a real evidence object.

### 5.8 Evidence review

```ts
type EvidenceReview = {
  id: string;
  evidenceId: string;
  reviewerPrincipalId: string;
  status: "draft" | "confirmed" | "needs-correction";
  reviewedAt: string | null;
  note: string | null;
};
```

Confirmation records that a user reviewed the displayed metadata. It MUST NOT
mean that PeacePad verified authenticity, relevance, truth, or admissibility.

### 5.9 Timeline entry

```ts
type TimelineEntry = {
  id: string;
  familySpaceId: string;
  assertedEventDate: string;
  title: string;
  description: string;
  sourceLinks: Array<{
    sourceType: "evidence" | "message" | "parenting-event";
    sourceId: string;
  }>;
  generatedBy: "user" | "deterministic-rule";
  createdAt: string;
};
```

Every non-user-authored timeline entry MUST remain source-linked. Generative AI
MUST NOT create an unsourced timeline fact.

### 5.10 Export job

```ts
type ExportJob = {
  id: string;
  familySpaceId: string;
  requestedBy: string;
  selection: {
    evidenceIds: string[];
    timelineEntryIds: string[];
    messageIds: string[];
    parentingEventIds: string[];
  };
  state: "queued" | "building" | "ready" | "failed" | "expired";
  packageSha256: string | null;
  expiresAt: string | null;
};
```

The current lab selection state is `OBSERVED-LAB`; file creation, signing,
sharing, and verification are not implemented.

### 5.11 Audit event

```ts
type AuditEvent = {
  id: string;
  familySpaceId: string | null;
  actorPrincipalId: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  occurredAt: string;
  requestId: string;
  result: "allowed" | "denied" | "failed";
  reasonCode: string | null;
  previousEventHash: string | null;
  eventHash: string;
};
```

Audit events MUST NOT contain message bodies, file contents, consent secrets,
access tokens, protected location, or unnecessary child information.

## 6. API surface

All production-candidate endpoints MUST be versioned under `/api/v1`. The two
currently observed Gate 1 paths remain compatibility candidates until the
backend review decides whether to alias or version them.

### 6.1 Foundation and identity

| Method and path | Purpose | Status |
| --- | --- | --- |
| `POST /api/auth/guest` | Create or restore consented guest session | Gate 1 candidate |
| `POST /api/v1/sessions/revoke` | Revoke current session | `PROPOSED` |
| `GET /api/v1/me` | Return principal, memberships, and active consents | `PROPOSED` |
| `PUT /api/v1/consents/{purpose}` | Grant or withdraw versioned consent | `PROPOSED` |
| `POST /api/messages/preview` | Rule-based message preview compatibility path | Gate 1 candidate |
| `POST /api/v1/message-previews` | Versioned rule-based or consented AI preview | `PROPOSED` |

### 6.2 Family space and binder

| Method and path | Purpose |
| --- | --- |
| `GET /api/v1/family-spaces` | List only authorized spaces |
| `GET /api/v1/family-spaces/{spaceId}` | Read space and effective permissions |
| `POST /api/v1/family-spaces/{spaceId}/binders` | Create binder |
| `GET /api/v1/binders/{binderId}` | Read binder |
| `PATCH /api/v1/binders/{binderId}` | Revision-protected metadata change |
| `POST /api/v1/binders/{binderId}/archive` | Archive without deleting records |
| `POST /api/v1/memberships` | Invite a scoped member |
| `DELETE /api/v1/memberships/{membershipId}` | Revoke delegation |

### 6.3 Evidence

The current staging compatibility boundary also exposes
`POST /api/v2/attachment-upload-intents` for authorized conversation or
private-binder metadata. It deliberately returns `uploadTransport: disabled`
and `uploadUrl: null`; it is not the binary-ingestion API described below and
must not create a `SourceArtifact` or imply that an original was received,
hashed, scanned, or verified.

| Method and path | Purpose |
| --- | --- |
| `POST /api/v1/binders/{binderId}/evidence` | Create metadata and ingest intent |
| `POST /api/v1/evidence/{evidenceId}/upload-intents` | Issue short-lived, scoped upload |
| `POST /api/v1/evidence/{evidenceId}/complete-upload` | Verify size, type, malware result, and hash |
| `GET /api/v1/evidence/{evidenceId}` | Read metadata and effective permissions |
| `GET /api/v1/evidence/{evidenceId}/content` | Authorized, audited original retrieval |
| `POST /api/v1/evidence/{evidenceId}/reviews` | Add a review record |
| `POST /api/v1/evidence/{evidenceId}/corrections` | Add linked correction without overwriting |
| `POST /api/v1/evidence/{evidenceId}/redactions` | Create derivative, preserve original |
| `DELETE /api/v1/evidence/{evidenceId}` | Request governed deletion, subject to shared-record and hold rules |

### 6.4 Timeline and export

| Method and path | Purpose |
| --- | --- |
| `GET /api/v1/family-spaces/{spaceId}/timeline` | Cursor-paginated source-linked entries |
| `POST /api/v1/timeline-entries` | Create user-authored entry |
| `POST /api/v1/exports` | Create an idempotent export job |
| `GET /api/v1/exports/{exportId}` | Read status and package verification metadata |
| `GET /api/v1/exports/{exportId}/download` | Time-limited, audited package retrieval |
| `POST /api/v1/exports/{exportId}/revoke` | Revoke a still-active download |

### 6.5 Privacy rights

| Method and path | Purpose |
| --- | --- |
| `POST /api/v1/privacy/access-requests` | Request a copy of personal information |
| `POST /api/v1/privacy/correction-requests` | Request correction without rewriting shared history |
| `POST /api/v1/account-deletion-requests` | Initiate confirmed account deletion |
| `GET /api/v1/account-deletion-requests/{requestId}` | Read scope and completion status |

## 7. Request controls

### 7.1 Idempotency

Creates, upload completion, evidence confirmation, timeline generation,
exports, deletion requests, and invitations MUST accept:

```text
Idempotency-Key: <opaque client-generated value>
```

The same key and equivalent body return the original result. Reuse with a
different body returns `409 IDEMPOTENCY_CONFLICT`.

### 7.2 Authentication and authorization

- Native clients SHOULD use a bearer-token or proof-of-possession design
  approved by the security review; browser cookie assumptions MUST NOT be
  copied into native code without review.
- Every resource lookup MUST include the authenticated principal and
  family-space authorization boundary.
- A `404` SHOULD be returned instead of revealing the existence of an
  unauthorized sensitive resource.
- Support access uses a separately approved, time-limited workflow and never
  an ordinary user endpoint.

### 7.3 Upload controls

- Upload intents MUST expire quickly and bind to one evidence ID, media type,
  size ceiling, and principal.
- Uploaded objects enter quarantine and are not retrievable until verification
  and malware scanning pass.
- Client-reported hashes MAY be recorded but server-calculated hashes are
  authoritative.
- EXIF, device, and location metadata MUST be classified and handled according
  to the evidence-integrity and privacy specifications.

## 8. Response and error envelope

Success:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_01...",
    "schemaVersion": "1.0"
  }
}
```

Error:

```json
{
  "error": {
    "code": "CONSENT_REQUIRED",
    "message": "Consent is required for this operation.",
    "retryable": false,
    "fieldErrors": []
  },
  "meta": {
    "requestId": "req_01..."
  }
}
```

Required stable codes include:

- `AUTHENTICATION_REQUIRED`;
- `SESSION_EXPIRED`;
- `CONSENT_REQUIRED`;
- `AI_CONSENT_REQUIRED`;
- `FORBIDDEN`;
- `RESOURCE_NOT_FOUND`;
- `VALIDATION_FAILED`;
- `REVISION_CONFLICT`;
- `IDEMPOTENCY_CONFLICT`;
- `UPLOAD_QUARANTINED`;
- `UPLOAD_REJECTED`;
- `LEGAL_HOLD_ACTIVE`;
- `RATE_LIMITED`;
- `SERVICE_UNAVAILABLE`.

Messages shown to users MUST be safe and plain-language. Internal stack traces,
storage keys, provider responses, and authorization policy details MUST NOT be
returned.

## 9. Offline and event rules

- The server remains authoritative for memberships, consent, evidence ingest,
  export, deletion, and audit history.
- The client MAY queue drafts and metadata locally after the offline threat
  model is approved.
- Queued commands MUST have stable command IDs, idempotency keys, creation
  times, declared user time zones, and explicit conflict behavior.
- Evidence binary uploads MUST be resumable and checksum-verified.
- A failed or interrupted upload MUST NOT create a `verified` evidence object.
- Local data MUST be encrypted using platform-supported secure facilities and
  cleared after logout, account deletion, device-compromise response, or
  retention expiry as specified.

## 10. Compatibility policy

- Additive optional fields MAY be introduced within `/api/v1`.
- Required-field changes, meaning changes, or enum removals require a new API
  version or negotiated capability.
- Clients MUST tolerate unknown optional response fields.
- Servers MUST reject unknown security-sensitive request fields.
- Mobile release compatibility MUST cover at least the currently supported
  public app version plus the active release candidate.
- Deprecation requires telemetry, user-impact analysis, rollback, and a
  published support window.

## 11. Verification gate

This contract can advance from `DRAFT` only when all of the following exist:

1. Backend compatibility review against the live PeacePad data model.
2. Approved threat model, privacy impact assessment, and authorization matrix.
3. OpenAPI or equivalent machine-readable schema generated from the approved
   contract.
4. Contract tests for every endpoint and error code.
5. Cross-tenant and object-level authorization tests.
6. Idempotency, retry, timeout, and revision-conflict tests.
7. Synthetic end-to-end evidence ingest, review, timeline, and export tests.
8. Data deletion, retention, legal-hold, backup, and restoration tests.
9. Redacted diagnostics review.
10. Staging Simulator and real-iPhone proof with production writes still
    disabled.

## 12. Related specifications

- [`AUTHORIZATION_MATRIX_V0.1.md`](./AUTHORIZATION_MATRIX_V0.1.md)
- [`EVIDENCE_INTEGRITY_SPEC_V0.1.md`](./EVIDENCE_INTEGRITY_SPEC_V0.1.md)
- [`INSTITUTIONAL_CLAIMS_REGISTER_V0.1.md`](./INSTITUTIONAL_CLAIMS_REGISTER_V0.1.md)
- [`INSTITUTIONAL_READINESS_BACKLOG_2026-07-29.md`](./INSTITUTIONAL_READINESS_BACKLOG_2026-07-29.md)
- [`NATIVE_V2_PRODUCTION_ROADMAP_2026-07-29.md`](./NATIVE_V2_PRODUCTION_ROADMAP_2026-07-29.md)
