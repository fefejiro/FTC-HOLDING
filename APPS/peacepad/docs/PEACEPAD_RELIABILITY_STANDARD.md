# PeacePad Reliability Standard

Last updated: 2026-07-23

## Purpose

PeacePad reliability means a co-parent can open the app, get calm-message help, and access core records when emotions are high and time is limited.

## Reliability tiers

| Tier | Area | Standard |
| --- | --- | --- |
| P0 | Launch and guest compose | Must work before release claims |
| P0 | API health | Must return healthy before release monitoring is green |
| P1 | Authenticated compose/messages | Must work before heavier acquisition |
| P1 | Calendar/tasks/expenses | Must preserve user-created data |
| P2 | Calls/uploads/evidence | Must have explicit QA before Premium rollout |

## Minimum checks per release

- Web app loads from `https://peacepad.ca`.
- API health endpoint returns success.
- Guest compose/tone-help path works.
- Auth sign-in/sign-out works.
- No crash on iOS launch.
- App Review URLs remain reachable.
- Privacy/support/terms pages remain reachable.

## Incident labels

- `release_blocker`: blocks App Store or public availability.
- `user_trust_blocker`: risks records, privacy, or user confidence.
- `growth_blocker`: hurts activation or retention but does not block release.
- `future_delta`: useful but not required for the submitted release.

