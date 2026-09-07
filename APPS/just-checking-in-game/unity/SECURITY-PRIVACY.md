# SECURITY-PRIVACY

## Privacy commitments (launch)

1. Spoken and typed answers are never recorded, transcribed, or uploaded.
2. Version 1.1 stores only mood IDs, affirmation IDs, dates, session metrics,
   and names that the user chooses for local connections.
3. All saved state remains on the device under the app's persistent data path.
4. No contact access is required.
5. No in-app voice, video, network sync, or analytics is used.

## Data boundaries

Allowed local state data:

- schemaVersion
- local connection IDs and names
- mood IDs and affirmation IDs
- session start/end dates and answered/passed counts
- category count summaries
- active prompt ID needed for relaunch recovery

Forbidden data:

- spoken answers
- typed notes/answers
- typed notes or answers
- recordings or transcripts
- prompt text bodies
- invite URLs/codes
- contact data
- network or analytics events

## Security controls

1. Signing secrets are externalized to environment variables or external secret stores.
2. Build scripts fail closed when required signing variables are missing.
3. Local persistence uses a versioned JSON document and quarantines corrupt files.
4. Reset/delete removes the local document and connection labels.

## Permissions stance

Launch package must not request:

- microphone
- camera
- location

## Incident response notes

- Treat committed signing key history as exposed until full history purge is complete.
- Rotate keys before first public Just Checking In release build.
