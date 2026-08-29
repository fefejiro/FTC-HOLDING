# THIRD_PARTY_ASSETS

Track every third-party dependency and asset before release.

## Rules

1. Allowed licenses: MIT, Apache-2.0, BSD, official Unity packages, and properly licensed Unity Asset Store assets.
2. Disallowed: GPL/AGPL dependencies and unverified asset licensing.
3. Every entry must include source URL, version/tag, license, and usage scope.

## Planned dependency candidates (pending compatibility spike)

| Name | Source | Version | License | Intended Use | Status |
|---|---|---|---|---|---|
| VContainer | https://github.com/hadashiA/VContainer | 1.19.0 | MIT | DI/composition in GameCore | Pending spike |
| UnityScreenNavigator | https://github.com/Haruma-K/UnityScreenNavigator | v1.7.5 | MIT | Page/modal navigation | Pending spike |
| LitMotion | https://github.com/annulusgames/LitMotion | v2.0.2 | MIT | Card and UI animation | Pending spike |
| Unity Mobile Notifications | Unity Package Manager | latest compatible | Unity package terms | Daily reminder scheduling | Pending spike |
| ZXing.Net | https://github.com/micjahn/ZXing.Net | latest pinned tag after test | Apache-2.0 | QR generation only | Pending IL2CPP/export test |

## Approval checklist per asset/dependency

- Unity 6.3 compiles cleanly.
- Android IL2CPP build passes.
- iOS Xcode export passes.
- No hidden analytics/permissions surprises.
- Attribution requirements captured.
