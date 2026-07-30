# PeacePad Evidence Integrity Specification v0.1

Status: PROPOSED - NO STORAGE IMPLEMENTED
Positioning: supports authenticity and integrity assessment; never promises
admissibility or legal outcome.

## Ingestion

1. Receive an authenticated, authorized upload request with an idempotency key.
2. Stream to quarantine; never trust filename, MIME, extension, EXIF, or client hash.
3. Calculate SHA-256 server-side while preserving the original bytes.
4. Malware-scan and record the scanner/version/result.
5. Store the immutable original in the correct Canadian or U.S. region.
6. Create `SourceArtifact`, provenance, and append-only `AuditEvent`.
7. Generate derivatives separately; never overwrite the original.

## Corrections and redactions

- Metadata corrections create a new version linked to the prior version.
- Redactions create a derivative and a redaction-history entry.
- Confirmation is the user's factual review state, not independent verification.
- AI summaries remain advisory and cite source IDs; they never alter originals.

## Export

A deterministic export package contains:

- accessible tagged PDF;
- JSON and CSV records where applicable;
- original/authorized attachments;
- manifest with schema version, scope, generation time, hashes, and redactions;
- signed manifest and verification identifier;
- human-readable limitations.

Independent verification must recompute every file hash and validate the
manifest signature without access to private application internals.

## Retention and deletion

- Private Binder retention is user-controlled within legal and safety limits.
- Shared records, account deletion, preservation requests, and expiry are
  distinct states.
- A preservation hold never silently expands access.
- Destruction records what category was destroyed and when, without retaining
  the destroyed content.

## Required proof before production

- zero cross-family access in adversarial tests;
- interrupted-upload recovery;
- deterministic repeat export;
- 100% synthetic packages verify independently;
- restore/migration preserves original hashes;
- no critical/high security or accessibility findings.
