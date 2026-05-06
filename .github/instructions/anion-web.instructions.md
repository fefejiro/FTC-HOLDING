---
applyTo: "APPS/anion/app/**,APPS/anion/components/**,APPS/anion/hooks/**,APPS/anion/lib/**"
---

# Web app instructions

Use these instructions when working on the main Anion web app.

## Focus

- Next.js App Router conventions
- server and client boundaries
- route layouts
- role based routing
- dashboard quality
- booking UX
- lesson room UX

## Rules

- Prefer server components unless client interactivity is needed
- Isolate `use client` to the smallest useful surface
- Keep role routing explicit and testable
- Keep visual components premium, clean, and production minded
- Use accessible semantics and predictable loading and empty states
- Reuse shared types instead of redefining domain contracts
- Keep page files thin and push logic into dedicated modules where reasonable

## Done means

- route works
- state and error handling exist
- role behavior is correct
- test notes are added
