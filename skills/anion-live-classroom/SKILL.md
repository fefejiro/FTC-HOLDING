---
name: anion-live-classroom
description: Use when implementing Daily React, lesson-room states, real-time collaboration, shared notes, whiteboard sync, or teacher-student live session UX for Anion.
---

# Anion Live Classroom

Use this skill for the live lesson experience and all related collaboration behavior.

## Mission

Build a premium live classroom where teacher and student can join confidently, interact clearly, and collaborate in real time.

## Responsibilities

- Daily React room integration
- prejoin checks and join flow
- participant role handling
- session lifecycle states
- shared writing and typing collaboration
- chat, materials, and notes panels
- persistence rules for session artifacts where defined

## Primary surfaces

- `APPS/anion/app/(auth)/lesson/[sessionId]/`
- `APPS/anion/app/api/daily/room/`
- `APPS/anion/components/lesson/`
- supporting collaboration state or data models

## Workflow

1. Confirm the lesson-room milestone and dependencies.
2. Ensure auth, role routing, and booking/session models exist first.
3. Keep token issuance and sensitive logic server-side.
4. Build the room shell before deep collaboration layers.
5. Add clear failure and recovery states.

## Rules

- Do not begin deep classroom work before session and auth foundations are stable.
- Do not fake real-time sync with static placeholder behavior and call it complete.
- Do not hardcode teacher or student assumptions that belong in session data.
- Do not ignore device permission, reconnect, or join-failure states.
- Do not lose collaboration context without documenting persistence behavior.

## Quality bar

At minimum, validate:

- prejoin camera and mic flow
- role-correct room join
- session state changes
- teacher and student collaboration visibility
- interruption or reconnect notes
- lesson-end behavior

## Output

- room or collaboration files changed
- session-state notes
- test or smoke evidence
- known risks and next steps
