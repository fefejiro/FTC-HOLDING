# LinkedIn Adapter QA Checklist

## Target Surface
LinkedIn Messaging (www.linkedin.com/messaging/)

## Send Attempt Interception (Only on Send)
1. Type a safe message and press Enter.
   - If LinkedIn shows "Press Enter to send" (or send-on-enter hint), Guardian may trigger.
   - If no hint is present, Enter should insert a new line and Guardian should not trigger.

2. Press Ctrl+Enter.
   - Guardian should trigger (explicit send attempt).

3. Click the Send button.
   - Guardian should trigger.

## Guardian Behavior
4. Modal appears only on send attempt and never during typing.
5. "Send Original" restores the exact message and sends.
6. Editing in the modal does not block typing in the composer.

## Smoke Validation
7. After selecting "Use Suggestion", the message inserts and remains editable in the composer.
