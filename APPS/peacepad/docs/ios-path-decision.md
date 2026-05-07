# PeacePad iOS Path Decision

Date: 2026-05-07
Owner: @fefejiro
Scope: Research-only decision (no production iOS build changes)

## Decision goal
Choose the iOS delivery path for PeacePad by comparing:
1. Pure React Native (aligned with the issue's `saywetin-rn-migration-plan` reference)
2. Capacitor wrap
3. PWA-only

## Scoring criteria (1-5, higher is better)
- **Time-to-store**: speed to App Store availability
- **Audio reliability**: stability for microphone/WebRTC-heavy flows
- **Code reuse**: reuse of current PeacePad web code
- **Ongoing cost**: maintenance burden over time

## Option comparison

| Option | Time-to-store | Audio reliability | Code reuse | Ongoing cost | Weighted notes |
|---|---:|---:|---:|---:|---|
| Pure React Native | 2 | 5 | 2 | 2 | Best native audio control, but largest net-new build and dual-stack cost |
| Capacitor wrap | 4 | 4 | 5 | 4 | Strong reuse of existing app, near-native plugin path for audio + push |
| PWA-only | 5 | 2 | 5 | 5 | Fastest to ship web, but weakest iOS audio/background behavior and no App Store app |

## Recommendation
**Choose: Capacitor wrap**

### Why this wins
- Gives an App Store path quickly without rewriting PeacePad into a second full client stack.
- Preserves high code reuse from the current PWA architecture while still enabling native iOS integrations where needed.
- Provides materially better audio reliability than browser-only PWA on iOS, while avoiding full React Native migration scope.
- Keeps ongoing maintenance realistic for the current team size.

### Tradeoffs accepted
- Slightly less native control than a full React Native app.
- Native shell/plugin lifecycle still requires release discipline for iOS updates.

## Linked backlog issues for chosen path (Capacitor)
- [Configure APNs for iOS push](../BACKLOG.md#notifications)
- [iOS App Store submission](../BACKLOG.md#platform-expansion)
- [Decide whether APNs support matters yet or should wait for iOS work](../ACTIONABLE_TASK_QUEUE.md#deferred-or-decision-dependent)

## Sign-off
Signed off by: @fefejiro  
Sign-off date: 2026-05-07
