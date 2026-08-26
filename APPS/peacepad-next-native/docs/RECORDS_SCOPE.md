# PeacePad Native Records Reconstruction Scope

> Historical PR #171 scope record. For current release status and the active
> metadata-only limitation, see [STATUS.md](STATUS.md).

## Purpose

This stacked draft reconstructs only the private Case Binder boundary and metadata-only attachment preparation for the isolated PeacePad Native app.

## Source mapping

| Clean path | Prior source used as reference | Reconstruction decision |
| --- | --- | --- |
| `src/domain/v2.ts` | `0204a116`, `1ae9dbd2` | Keep typed binder and attachment-intent contracts; exclude evidence artifacts and file transport. |
| `src/records/MetadataAttachmentService.ts` | `1ae9dbd2`, `386428a1` | Rebuild validation, authorization, expiry, and idempotency around metadata only. |
| `src/records/RecordsState.tsx` | `0204a116` | Preserve only in-session fictional binder state for interaction proof. |
| `src/coordination/CoordinationScreens.tsx` | `0204a116` | Replace the records placeholder with concise binder and metadata preparation forms. |
| `src/api/CoordinationApi.ts` | `1ae9dbd2` | Add a versioned `/api/v2/attachment-upload-intents` compatibility contract without enabling transport. |

The referenced commits were treated as design evidence. They were not replayed wholesale.

## Enforced boundary

- Attachment requests contain metadata only: filename, media type, byte length, target, owner, family, and idempotency key.
- Preparation always returns `uploadTransport: disabled` and `uploadUrl: null`.
- The service never accepts or stores file bytes.
- No evidence-artifact entity, object storage, database, production API, or production write path is introduced.
- A private binder may be accessed only by its recorded owner in the same family.
- Conversation attachment preparation remains rejected in this draft rather than implying an unimplemented shared-record permission model.
- Repeated idempotency keys return the original intent only when the normalized request is identical.
- Prepared metadata expires after 15 minutes.

## Verification

Automated coverage includes:

- required binder fields and active-session state;
- accepted metadata preparation with disabled transport;
- malformed filenames, unsupported media types, invalid sizes, and short idempotency keys;
- missing binders and cross-family or non-owner requests;
- repeated and conflicting idempotency requests;
- HTTP compatibility-path serialization;
- visible confirmation that no file was uploaded.

Database migrations, database constraints, persistence, restart recovery, and isolated HTTP services belong to the next stacked staging draft. This records draft defines and verifies the constraints that persistence must implement; it does not claim database verification before that database exists.

## Explicit exclusions

- file selection or byte upload;
- private object storage;
- evidence hashing or provenance artifacts;
- timeline or export generation;
- production authentication or user migration;
- calls, expenses, billing, and App Store work.
