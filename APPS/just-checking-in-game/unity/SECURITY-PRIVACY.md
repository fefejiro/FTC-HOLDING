# SECURITY-PRIVACY

## Privacy commitments (launch)

1. Spoken answers are never recorded, transcribed, or uploaded.
2. Remote sessions synchronize compact state metadata only.
3. Saved cards remain local unless explicit future sync feature is added.
4. No contact access required.
5. No in-app voice/video for launch.

## Data boundaries

Allowed remote state data:

- schemaVersion
- stateVersion
- phase
- deckId
- deckContentVersion
- shuffleSeed
- drawIndex
- currentCardId
- currentTurnPlayerId
- followUpCardId
- lastProcessedActionId
- updatedAtUnixMs
- expiresAtUnixMs

Forbidden remote data:

- spoken answers
- typed notes/answers
- prompt text body
- invite URLs/codes in analytics
- display names in analytics
- personal contact data

## Security controls

1. Signing secrets are externalized to environment variables or external secret stores.
2. Build scripts fail closed when required signing variables are missing.
3. Rooms are private, ephemeral, and locked at two players.
4. Session reconcile logic must reject stale/duplicate actions.

## Permissions stance

Launch package must not request:

- microphone
- camera
- location

## Incident response notes

- Treat committed signing key history as exposed until full history purge is complete.
- Rotate keys before first public Just Checking In release build.
