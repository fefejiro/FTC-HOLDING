# PeacePad Analytics Spec

Last updated: 2026-07-23

## Analytics goal

Measure whether PeacePad helps users reach calm-message value quickly and return to organize parenting tasks.

## P0 events

| Event | Meaning |
| --- | --- |
| `app_opened` | App launched |
| `guest_started` | User entered guest-first path |
| `compose_opened` | Compose/tone-help opened |
| `rewrite_requested` | User requested calm rewrite |
| `rewrite_copied` | User copied suggested wording |
| `account_created` | User created account |
| `support_opened` | User opened support/help resource |

## P1 events

- `message_created`
- `calendar_event_created`
- `expense_created`
- `task_created`
- `document_uploaded`
- `contact_log_created`
- `testflight_feedback_received`

## Privacy rule

Do not send raw message content, document text, children's names, or court details to product analytics. Track event names, coarse counts, timestamps, and non-sensitive metadata only.

