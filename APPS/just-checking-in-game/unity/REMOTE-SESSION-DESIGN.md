# REMOTE-SESSION-DESIGN

## Scope

Remote Together is a synchronized, turn-based, two-player session.

- No action realtime netcode.
- No in-app voice/video.
- Host authoritative state model.

## Services

- `IRemoteRoomService`
- `UgsRemoteRoomService`
- `MockRemoteRoomService`

Mock service is required for editor/UI development and automated tests.

## Session lifecycle

1. Host starts Remote Together.
2. App initializes Unity Services and anonymous auth.
3. Host creates private room and receives join code.
4. Invite options: share link, copy code, copy link, QR.
5. Guest joins via link or code.
6. Room locks when both players are present.
7. Host starts session.
8. Session ends and room is terminated.

## Authoritative state contract

State must include versioning and compact identifiers, not prompt text.

- `schemaVersion`
- `stateVersion`
- `phase`
- `deckId`
- `deckContentVersion`
- `shuffleSeed`
- `drawIndex`
- `currentCardId`
- `currentTurnPlayerId`
- `followUpCardId`
- `lastProcessedActionId`
- `updatedAtUnixMs`
- `expiresAtUnixMs`

## Guest action flow

1. Guest sends action with `actionId` and `baseStateVersion`.
2. Host validates turn legality, version, and duplicate status.
3. Host applies action via deterministic reducer.
4. Host increments `stateVersion` and publishes snapshot.
5. Guest clears pending action after acknowledgment.

## Reconciliation and reconnect

- Enforce monotonically increasing state versions.
- Detect gaps and fetch full snapshot when out of sync.
- Backoff on throttling or transient failures.
- Pause interaction during reconnect.
- Never continue with divergent local state.

## Deep-link integration

Companion site routes (planned):

- `/join/[code]`
- `/privacy`
- `/support`
- `/.well-known/assetlinks.json`
- `/apple-app-site-association`

Unity app handling:

- Parse `Application.absoluteURL` at cold start.
- Subscribe to `Application.deepLinkActivated`.
- Validate and sanitize invite code.
- Clear pending code after use/expiry/cancel.
