---
name: ftc-games-publishing
description: Use when preparing or executing a Play Store / App Store release for an FTC game — TWA wrapping, signing, listing copy, ASO, screenshots, internal/closed/production tracks, monetisation SDK integration (AdMob, IAP), analytics wiring, and post-launch live-ops. Load before any release-track upload, ASO copy edit, or ad SDK integration.
---

# FTC Games — Publishing & Live Ops

Release and growth skill for FTC games. Covers Play Store + App Store + ASO + monetisation + analytics + crash reporting + live ops.

## Use When

- Wrapping a Phaser web build into TWA via Bubblewrap
- Preparing Play Console listing (copy, screenshots, feature graphic, video)
- Integrating AdMob / IAP / analytics / crash reporting
- Doing ASO keyword research / iteration
- Promoting from internal → closed → production track
- Setting up live ops calendar (events, daily challenges, seasons)

## Hard Rules

1. **Never** check signing keystores into git. Store under `C:\FTC HOLDING\.secrets\` (gitignored).
2. **Never** ship a build without:
   - Privacy policy URL live (`ftcholding.com/privacy/<game>`)
   - Crash reporting wired (Sentry or Firebase Crashlytics)
   - Analytics wired (PostHog or GA4)
   - Production API host pointing at the right Cloudflare / Railway service
3. **No dark patterns.** No misleading rewarded-ad triggers. No false scarcity timers in IAP.
4. **COPPA / PEGI 3 default.** All FTC games target ages 7+ unless brief explicitly says otherwise.
5. **Internal track must soak ≥ 14 days** before promoting to closed beta.

## Release Pipeline

### 1. Web Build → Cloudflare Pages

```powershell
Set-Location "C:\FTC HOLDING\APPS\<game>"
npm run build
npx wrangler pages deploy dist --project-name <game>
# verify: https://<game>.pages.dev/ loads, no 404 on /assets
```

### 2. TWA Wrap (Android)

- Use **Bubblewrap CLI**: `bubblewrap init --manifest=https://<game>.pages.dev/manifest.json`
- Edit `twa-manifest.json`:
  - `"packageId": "com.ftcholding.<game>"`
  - `"name"`, `"launcherName"`
  - `"themeColor"`, `"backgroundColor"`
  - `"orientation": "portrait"` (or as per brief)
- `bubblewrap build` → produces unsigned `.aab`
- Sign with FTC games keystore at `C:\FTC HOLDING\.secrets\ftc-games-keystore.jks`

### 3. Play Console Listing

Required assets per title:

- App icon: 512×512 PNG, no alpha.
- Feature graphic: 1024×500.
- Phone screenshots: ≥ 4, 1080×1920 portrait.
- Tablet screenshots (optional but recommended).
- Promo video: 30s YouTube, gameplay first 3s.
- Short description: 80 chars, keyword-loaded.
- Long description: 4000 chars, structured (hook → features → social proof → CTA).
- Category: `Game > Arcade` (runner) or `Game > Card` (cards) or `Game > Board` (board).
- Content rating: complete questionnaire, target PEGI 3.
- Privacy policy URL.
- Data safety form: declare AdMob / analytics SDKs.

### 4. Promotion Tracks

- **Internal** — up to 100 testers via email list. Soak 14 days.
- **Closed** — 100-500 testers, recruited via FTC channels + Naija game-dev Twitter / Reddit. Soak 14-21 days.
- **Open** (skip) — go straight to production once closed metrics pass gates.
- **Production** — phased rollout: 5% → 20% → 50% → 100% over 7 days.

### 5. Promotion Gate Metrics (closed → production)

- Crash-free sessions ≥ 99.0%.
- Day-1 retention ≥ 35%.
- Day-7 retention ≥ 12%.
- Avg session length ≥ 4 minutes (runner) / ≥ 6 minutes (board / card).
- < 5 critical bug reports in last 7 days.

If any gate fails, do not promote. Diagnose and patch.

## Monetisation SDK Integration

### AdMob (default)

- Banner only on Menu and Game Over scenes — never during gameplay.
- Rewarded video tied to "Continue" or "2x reward" — always opt-in.
- Interstitial every 3 game-overs, never twice in a row, never within 30s of last.
- Test with AdMob test IDs before swapping to live IDs.

### IAP

- **Remove ads** — single non-consumable, $2.99 USD / regional pricing.
- **Starter pack** — consumable bundle, one-time, $1.99.
- **Cosmetics** — non-consumable, $0.99-$4.99.
- All IAPs verified server-side via Supabase function before granting entitlements.

## Analytics Events (mandatory minimum)

```
game_started        { mode, character, theme }
game_over           { score, duration_ms, cause }
milestone_reached   { score_tier }
purchase_completed  { sku, price_usd, currency }
ad_shown            { type: 'banner'|'interstitial'|'rewarded' }
ad_completed        { type, reward_granted: boolean }
session_pause       { duration_ms }
```

## Live Ops Calendar (post-launch)

- **Week 1-2:** Daily content updates only if gates pass.
- **Month 2:** First seasonal event (Independence Day, Christmas, Eid — match Naija calendar).
- **Month 3+:** Recurring weekly tournament with leaderboard reset every Monday.
- **Quarter 2+:** Seasonal pass / battle pass if DAU > 10k.

## ASO Keyword Strategy

- Anchor: cultural keyword + genre ("whot", "naija whot", "whot online", "whot card game").
- Long tail: "nigerian card game", "african card game", "play whot offline".
- Localise listing into Pidgin / Yoruba / Igbo / Hausa store metadata where Play Console supports.

## Common Pitfalls

- **Forgetting Play Console data safety form** — blocks publishing.
- **Wrong API host in production build** — point checking required before AAB upload.
- **Banner ads during gameplay** — kills retention and review scores.
- **No crash reporting** — flying blind in production.
- **Testing only on Pixel** — must test Samsung A-series (low-end), Tecno / Infinix (Naija-dominant brands).

## Trigger Phrases

- "release to play store"
- "twa wrap"
- "bubblewrap"
- "admob integration"
- "aso keywords"
- "store listing"
- "internal track"
- "live ops"
