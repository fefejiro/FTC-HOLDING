# PeacePad Voice Architecture Audit (2026-03-07)

## Scope

Audit performed in `C:\FTC HOLDING\APPS\peacepad` to map existing voice behavior before implementing new voice UX.

## Current Voice Paths

1. Prep dictation (`PracticeVoiceRecorder`):
   - Client records audio with `MediaRecorder`.
   - Audio is posted to `POST /api/openai/transcribe`.
   - Transcript is injected into Prep input for manual edit/send.
   - Current behavior is server-transcription-first.

2. Conch mode (`conch-mode.tsx` + `useConchAudio`):
   - Uses WebRTC microphone/camera streams for live call turn-taking.
   - No transcript auto-send coaching loop in current Conch flow.
   - Built for voice/video session management, not STT chat input.

3. Chat voice notes (`VoiceNoteRecorder`, `ChatInterface`):
   - Voice-note upload/transcription path via `/api/voice-notes`.
   - Separate from Prep and Conch coaching flows.

4. Existing AI audio integrations:
   - Server includes `server/replit_integrations/audio/*` and related routes.
   - Not required for the new browser/device STT-first implementation path.

## Reuse Plan

1. Keep and reuse Prep coaching APIs:
   - `POST /api/prep-chat/sessions`
   - `POST /api/prep-chat/sessions/:id/messages`
   - `POST /api/prep-chat/analyze-draft`

2. Reuse existing Conch Call experience as-is for the "Call" tab.

3. Reuse client-side update/foreground event handling already present in `App.tsx` for voice resume checks when needed.

## Deprecation/Primary Path Shift

1. Prep STT primary path shifts to browser/device speech recognition:
   - `SpeechRecognition` / `webkitSpeechRecognition` first.
   - Existing `/api/openai/transcribe` path remains fallback.

2. Conch Coach Voice mode will be additive:
   - New UI mode/tab with transcript auto-send.
   - Existing Conch call WebRTC flow remains unchanged.

## Guardrails

1. No external voice vendors.
2. No raw audio persistence introduced by this change.
3. No API contract breaks for existing endpoints.
4. No schema migration required.
