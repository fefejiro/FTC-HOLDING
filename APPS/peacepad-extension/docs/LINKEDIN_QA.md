# LinkedIn Adapter QA Checklist

## Target Surfaces
1. LinkedIn messaging thread: `www.linkedin.com/messaging/thread/*`
2. New message composer: `www.linkedin.com/messaging/thread/new/*`
3. Profile message overlay (Messaging drawer)

## Send Attempt Interception (Only on Send)
1. Type a safe message (5+ chars) and press Enter.
   - If LinkedIn shows "Press Enter to Send", Guardian should trigger.
   - If no hint is present, Enter should insert a new line and Guardian should not trigger.
2. Press Ctrl+Enter.
   - Guardian should trigger (explicit send attempt).
3. Click the Send button or send menu item.
   - Guardian should trigger.

## Guardian Behavior
4. Modal appears only on send attempt and never during typing.
5. "Send Original" restores the exact message and sends.
6. Editing in the modal does not block typing in the composer.
7. "Use Suggestion" inserts the response and leaves it editable.

## Hint Detection Sanity Checks
8. Debug trace includes `linkedin_send_hint` with:
   - `composerFound: true`
   - `decision: true` when "Press Enter to Send" is visible
9. When "Press Enter to Send" is not visible:
   - Enter should not trigger Guardian
   - Clicking Send should still trigger Guardian

## Notes
10. If Enter does not trigger, confirm the hint text appears in the UI.
11. If click send does not trigger, check selector coverage in `src/adapters.ts`.
