# PeacePad Mobile QA Matrix

Last updated: 2026-07-23

## Submitted iOS release smoke

| Area | Scenario | Status |
| --- | --- | --- |
| Launch | Install and open iOS app | Required after approval/TestFlight install |
| Guest path | Open calm-message/compose without account | Required |
| Auth | Sign in and return to app | Required |
| Compose | Generate calmer wording | Required |
| Navigation | Move across core tabs | Required |
| Public pages | Privacy, support, terms URLs open | Required |
| Network loss | App handles temporary API/network failure gracefully | Required |

## Premium delta QA candidates

| Area | Scenario | Release gate |
| --- | --- | --- |
| Documents | Upload screenshots/files and view them later | Premium beta |
| Evidence | Hash/timestamp record integrity | Premium beta |
| Calls | Audio/video call setup and end state | Premium beta |
| Parenting time | Create contact/visitation log | Premium beta |
| AI summaries | Generate non-legal organization summary | Premium beta |

## Rule

Do not claim a feature is App Store-live until it has been verified on the submitted iOS build or a later approved build.

