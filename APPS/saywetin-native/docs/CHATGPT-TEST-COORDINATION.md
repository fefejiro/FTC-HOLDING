# ChatGPT 4.1 Test Coordination (SayWetin Native)

This gives you a two-pass workflow:
- Pass 1: Implementer (find and fix defects)
- Pass 2: Independent auditor (re-check claims from scratch)

## Commands

Run from `C:/FTC HOLDING/APPS/saywetin-native`.

### Implementer pass

- Copy only:
  - `npm run gpt:test:impl:copy -- --task "Test and fix recognition flow end-to-end on connected Android device"`
- Open + autopaste:
  - `npm run gpt:test:impl:go -- --task "Test and fix recognition flow end-to-end on connected Android device"`
- Open + autopaste + autosend:
  - `npm run gpt:test:impl:send -- --task "Test and fix recognition flow end-to-end on connected Android device"`

### Independent audit pass

Use a fresh ChatGPT chat for independence.

- Copy only:
  - `npm run gpt:test:audit:copy -- --task "Independently verify previous fixes for recognition flow and slow-network behavior"`
- Open + autopaste:
  - `npm run gpt:test:audit:go -- --task "Independently verify previous fixes for recognition flow and slow-network behavior"`
- Open + autopaste + autosend:
  - `npm run gpt:test:audit:send -- --task "Independently verify previous fixes for recognition flow and slow-network behavior"`

## Recommended Session Flow

1. Run implementer pass command.
2. Let it finish fixes with evidence.
3. Open a fresh new chat tab.
4. Run audit pass command.
5. Accept release only if audit verdict is Pass or Conditional Pass with acceptable residual risk.

## Notes

- Auto-paste relies on browser/window focus.
- If paste goes to wrong window, rerun once.
- For maximum control, use `:go` not `:send`.
