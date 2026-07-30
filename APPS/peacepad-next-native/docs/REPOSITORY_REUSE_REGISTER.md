# PeacePad Repository Reuse Register

Date: 2026-07-29
Status: ACTIVE DECISION RECORD

## Repository of record

`fefejiro/FTC-HOLDING/APPS/peacepad` is the live v1 source and rollback
baseline. `APPS/peacepad-next-native` is the isolated v2 successor lab.
Standalone PeacePad repositories are reference archives, not merge sources.

## Reuse decisions

| Capability | Source | Decision | Production condition |
| --- | --- | --- | --- |
| Calm Compose and intervention language | v1 `compose.tsx` and tests | REMODEL | Native accessibility and consent tests |
| Scheduling calculations | v1 shared scheduling module | REUSE PURE LOGIC | Relationship-scoped persistence |
| Binder/evidence/timeline/export flow | native lab state and validators | REUSE TYPED SKELETON | New auth, provenance, storage, and export services |
| Upload path ownership | v1 `uploadOwnership.ts` | REUSE PATTERN | Object authorization and immutable originals |
| Deletion/quarantine | v1 `userDataDeletion.ts` | REUSE PATTERN | Shared-record and legal-preservation policy |
| Privacy and AI boundaries | v1 privacy controls | REUSE + REVIEW | Versioned server consent and processor register |
| Historical call UX | old PeacePad repos | REMODEL CONCEPTS | New authenticated native transport and two-device proof |
| Historical WebRTC/signaling | old/current v1 prototype | REPLACE | CallKit/PushKit, Android Telecom, TURN, authorization |
| Legacy recording demos | PeacePadDemo repos | RETIRE | No migration |
| Generic privacy repository | `peacepad-privacy` | RETIRE/REDIRECT | First-party versioned policy only |
| Old slideshow visuals | stale private mirror | REFERENCE ONLY | Current conch brand; no old session logic |
| Extension DOM adapters | `peacepad-extension` | SELECTIVE REUSE | Separate privacy/security review |
| v1 SDK error/typing skeleton | `PACKAGES/peacepad-sdk` | REMODEL FOR `/v2` | Idempotency, consent, auth, versioned errors |

## Call-specific decision

The old repositories prove product intent, not production reliability. Reuse:

- scheduled/attempted/missed/completed outcome language;
- neutral decline and follow-up UX;
- Conch turn-taking concepts;
- permission-after-accept lessons.

Do not port:

- the monolithic call dialog;
- query-parameter socket identity;
- the current signaling transport;
- unverified recording/transcription code;
- tests that pass without two live devices.

## Archive gate

Before archiving an old repository:

1. preserve the exact useful file/commit reference here;
2. confirm licensing for any asset;
3. confirm the canonical implementation or replacement exists;
4. add a read-only archive notice;
5. never copy credentials, signing files, real documents, or asset dumps.
