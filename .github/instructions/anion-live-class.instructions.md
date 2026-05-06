---
applyTo: "APPS/anion/app/(auth)/lesson/**,APPS/anion/components/lesson/**,APPS/anion/lib/daily.ts,APPS/anion/**/*daily*,APPS/anion/**/*lesson-room*"
---

# Live classroom instructions

## Focus

- Daily React room integration
- session lifecycle
- participant roles
- teacher student collaboration
- prejoin and in session polish

## Rules

- Keep token generation server side
- Verify session ownership before room access
- Handle join, reconnect, and end states clearly
- Design for premium classroom feel, not raw demo feel
- Preserve room state and collaboration artifacts intentionally
- Keep shared writing and typing architecture documented

## Done means

- a valid participant can join the correct room
- errors are handled clearly
- session state is updated correctly
- teacher and student flows are distinguished
