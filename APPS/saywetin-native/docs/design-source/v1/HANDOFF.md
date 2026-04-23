# SayWetin — Live Lyrics Follow Mode
## Developer Handoff Spec

**For:** SayWetin engineering (VSCode · Claude Code · Codex · Gemini)
**From:** Design
**Status:** Ready for implementation
**Scope:** Refactor of existing SayWetin app to add Live Lyrics Follow Mode

---

## 1. What to build

A new feature module inside the existing SayWetin product. When a song is matched, the user can tap **"Follow live lyrics"** and enter a full-screen lyric-follow view. The current line highlights as the song plays. Tapping any line opens a bottom sheet with literal meaning, cultural meaning, slang breakdown, and region context.

**This is a refactor, not a new app.** The entry point is the existing **Song Result** screen — add a primary CTA that routes into the new Live view.

---

## 2. Screens to implement

Only **3 real screens** + **1 overlay component**. All other "states" in the original prompt are variations of these.

### 2.1 `LiveLyricsScreen` (hero)
- Full-bleed dark with subtle violet ambient glow
- Top bar: chevron-down + album art + song title + artist + `<LiveIndicator/>`
- Lyric stream: 6 lines visible, current line is **larger (28px)**, italic, Playfair, with a 3px violet side-bar + outer glow
- Previous lines fade to `paperFaint`, upcoming to `paperMute`
- Smooth scroll on line change (400ms cubic-bezier `.2,.7,.3,1`)
- Bottom: song progress bar + basic transport
- **Inline states** (NOT separate screens):
  - `syncWarn={true}` → amber dashed banner at top, "Sync may be slightly off", with Re-sync CTA
  - `noLyrics={true}` → replaces lyric stream with fallback (Understand the vibe / Artist context / Search a line)

### 2.2 `TapExplainSheet` (bottom sheet over 2.1)
- Sheet slides up to 90px from top of viewport
- Backdrop: blurred lyric stream underneath + `rgba(10,10,15,.55)` overlay
- Header: selected lyric line in italic Playfair, with `Current line · 1:24` chip
- Three tabs: **Meaning** · **Breakdown / Alternates** · **Related**
- **Meaning tab:** Literal card → Cultural card (violet wash, highlighted) → Slang map → region + confidence chips
- **Alternates tab** (only shown when line has multiple interpretations): amber-dashed "Multiple meanings dey here" banner, then each interpretation as a card with % confidence, title, body
- Footer: full-width "Open full meaning" CTA → routes to 2.3

### 2.3 `MeaningDetailScreen` (full page)
- Header: back + song eyebrow
- Hero: the tapped lyric in 32px italic Playfair, key phrase in violet
- "Why it hits" card (violet wash)
- Plain meaning / Cultural meaning cards
- Slang map with region tags per word
- Nigerian phrases that rhyme (chip row)
- Artist context card at bottom

### 2.4 `MiniPlayer` (persistent overlay)
- Appears above the tab bar on any non-Live screen when Live mode is active
- Album art · live indicator · current line (italic Playfair) · violet sparkle button to re-enter Live
- Tap to expand back to `LiveLyricsScreen`

---

## 3. Design tokens

Extend your existing SayWetin token file with:

```ts
// colors (already exist, confirming)
obsidian:    '#0A0A0F'
obsidian2:   '#14131A'
violet:      'oklch(0.72 0.18 272)'   // user can hue-shift
violetWash:  'oklch(0.72 0.18 272 / 0.14)'
violetEdge:  'oklch(0.72 0.18 272 / 0.35)'
mint:        '#7AD6A5'  // live indicator
amber:       '#E8B84C'  // sync-warning

// typography (already exist)
serif:   'Playfair Display' (italic for lyrics, current line + hero)
sans:    existing sans stack
mono:    existing mono stack

// new motion tokens
ease.lyricShift:  cubic-bezier(0.2, 0.7, 0.3, 1)
duration.lyric:   400ms
duration.sheet:   320ms
```

---

## 4. Data / API contracts

The engineering work your team needs to define / expose:

### 4.1 Synced lyrics fetch
```
GET /v1/tracks/:trackId/synced-lyrics
→ { lines: [{ t: string, startMs: number, endMs: number, id: string, tappable: boolean }], confidence: 0..1, source: string }
```

### 4.2 Playback sync
- Client estimates current `positionMs` continuously (from audio buffer or user-provided source)
- On every animation frame, find line where `startMs <= positionMs < endMs` → mark current
- If `positionMs` drifts >1.5s from last expected value for N seconds → set `syncWarn = true`, expose Re-sync action that forces a refresh fingerprint

### 4.3 Tap → Explain
```
POST /v1/meaning/explain
{ lineId, lyric: string, trackId, positionMs }
→ {
    literal: string,
    cultural: string,
    slangMap: [{ word, meaning, region }],
    region: string[],
    confidence: 0..1,
    alternates?: [{ title, body, confidence }],  // present only if ambiguous
    relatedPhrases: string[],
    artistNote?: string
  }
```

### 4.4 Feedback signals (fire-and-forget)
```
POST /v1/signals
{ type: 'tap' | 'flag' | 'resync' | 'dwell' | 'exit', lineId, trackId, dwellMs? }
```

---

## 5. Dashboard (ops)

One new route: **`/ops/live-lyrics`**. Sidebar entry labeled "Live lyrics" with `NEW` badge.

**One page, 4 KPIs + 4 panels:**

| KPI | Source |
|---|---|
| Sync coverage | `% of matched songs with synced lyrics` |
| Sync confidence | `avg client-reported sync score` |
| Tap-to-explain volume | `count(signals where type='tap')` weekly |
| Fallback rate | `% of sessions where noLyrics or syncWarn fired` |

**Panels (grid 2×2):**
1. **Synced lyrics coverage** — progress bars by catalog group (Afrobeats, Alté, Hausa, Gospel)
2. **Sync health** — top drift issues + re-sync failures
3. **Ambiguous line queue** — lines flagged with >1 alternate, reviewer assignee, priority
4. **Most-tapped lines (24h)** — horizontal bars

---

## 6. Architecture / flow

The user never sees steps 3–4 or 8. They happen behind one tap.

1. User listens (existing)
2. Track recognized (existing)
3. **NEW:** Synced lyrics fetched + cached
4. **NEW:** Playback position estimator runs
5. Current line highlighted
6. User taps → selected line pinned
7. Meaning engine called → sheet populated
8. Confidence/ambiguity check → alternates surfaced or fallback shown
9. Signals captured → review queue + dashboard

---

## 7. Voice / copy

Use SayWetin voice — modern, culturally aware, slightly playful, warm. Lock these strings:

- Live CTA: **"Follow live lyrics"**
- Tap hint: **"Tap any line to understand it"**
- Sync warn: **"Sync may be slightly off. We're following, but not fully sure."** · action: **"Re-sync"**
- No lyrics: **"We hear the song — but the lyrics never dropped in our library."** · **"Understand the vibe"**
- Alternates banner: **"Multiple meanings dey here"**
- Mini-player label: **"Live · {song title}"**
- Detail page section titles: **Why it hits** · **Plain meaning** · **Cultural meaning** · **Slang map** · **Nigerian phrases that rhyme** · **Artist note**

---

## 8. Refactor notes for existing SayWetin codebase

- **Song Result screen:** add primary CTA `Follow live lyrics` → route to `LiveLyricsScreen`. Keep existing "Explain meaning" secondary.
- **Navigation:** `LiveLyricsScreen` should be a modal / full-screen route that can be dismissed with chevron-down (not a tab-bar destination).
- **Tab bar:** unchanged. Mini-player sits above the tab bar when Live is active in background.
- **Existing Meaning screen:** the new `MeaningDetailScreen` replaces it for live-lyric-sourced taps. Keep old Meaning for free-text / history entries.
- **State:** store `{ isLiveActive, currentTrackId, currentLineId, positionMs }` in a shared store (Zustand / Redux / whatever you use). MiniPlayer subscribes.

---

## 9. Reference files (in this design project)

- `live-lyrics.jsx` — production-grade React for all 3 screens + MiniPlayer overlay
- `live-ops.jsx` — ops dashboard markup
- `architecture-live.jsx` — system flow diagram for investor / internal alignment
- `tokens.jsx` — full `SW_TOKENS` object
- `SayWetin Design.html` — live canvas, open in browser to review

The React in these files is reference-quality, not production. Developers should port patterns + values, not copy files verbatim.

---

## 10. Definition of done

- [ ] `LiveLyricsScreen` renders with synced lyrics for a matched track
- [ ] Current line highlights and advances smoothly as audio plays
- [ ] Tap any tappable line → `TapExplainSheet` opens with real meaning payload
- [ ] Sheet has 3 tabs; Alternates tab only appears when backend returns `alternates`
- [ ] Sync-warn banner appears on drift, Re-sync action works
- [ ] No-lyrics fallback shows when backend returns no synced lyrics
- [ ] "Open full meaning" routes to `MeaningDetailScreen`
- [ ] MiniPlayer appears on Home/Explore when Live is active
- [ ] Ops dashboard `/ops/live-lyrics` shows 4 KPIs + 4 panels with real data
- [ ] All signals fire and land in the ops queue
