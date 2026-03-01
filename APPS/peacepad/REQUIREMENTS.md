# PeacePad - Feature Requirements & Acceptance Criteria

This document defines the detailed requirements, behavior specifications, and acceptance criteria for each PeacePad feature. It serves as the source of truth for "how things should work."

---

## Table of Contents
1. [Messaging & AI Tone Analysis](#1-messaging--ai-tone-analysis)
2. [Conch Mode (Structured Conversations)](#2-conch-mode-structured-conversations)
3. [Authentication & Sessions](#3-authentication--sessions)
4. [Location Services](#4-location-services)
5. [Calendar & Scheduling](#5-calendar--scheduling)
6. [Expense Tracking](#6-expense-tracking)
7. [Safety Plans](#7-safety-plans)
8. [Find Support Directory](#8-find-support-directory)
9. [Push Notifications](#9-push-notifications)
10. [Child Updates](#10-child-updates)

---

## 1. Messaging & AI Tone Analysis

### 1.1 Overview
Real-time chat between co-parents with AI-powered tone analysis that suggests calmer rewording for potentially escalating messages. The AI acts as "a trusted friend tapping your shoulder quietly" - never blocking, always supportive.

### 1.2 User-Facing Behavior

#### Message Sending Flow
1. User types message in chat input
2. User presses Send button
3. Message appears instantly in the conversation (optimistic update)
4. AI tone analysis runs in background (server-side)
5. **If message is neutral/healthy**: Sends immediately with NO intervention
6. **If message is potentially escalating**: Shows supportive modal with options

#### AI Suggestion Modal (When Triggered)
- Uses warm amber colors (NOT red - red reserved for extreme threats only)
- Supportive header: "A calmer version you could send"
- Three clear choices:
  - "Use suggested version" - Sends AI-reworded message
  - "Edit suggested version" - Allows user to modify suggestion
  - "Send original message" - Sends user's original message
- User always feels in control

### 1.3 Technical Details

#### Conflict Escalation Score (CES)
Score from 0-100 indicating message conflict level:
- **0-49**: Neutral/healthy - message passes through immediately
- **50-69**: Moderate conflict - shows soft nudge with suggestion (amber modal)
- **70-100**: High conflict - shows warning with stronger suggestion

**MVP Simplified Approach**: Current implementation primarily flags HOSTILE content (direct attacks, threats, profanity). The AI defaults to "calm" assessment for ambiguous cases, erring on the side of not interrupting users.

#### Tone Detection Patterns
The system detects two severity levels:

**HOSTILE (Immediate flag - high score)**:
- Direct vulgar language (profanity in English and Nigerian Pidgin)
- Direct threats (custody threats, harm threats)
- Cultural insults (supports Nigerian Pidgin, English, mixed languages)

**ESCALATING (Moderate flag)**:
- Belittling language ("you're crazy", "terrible parent")
- Mocking tone
- **Context-aware**: "you always/never" ONLY flags when followed by negative verbs
  - "You always pick up on Fridays" - NOT flagged
  - "You always forget the lunches" - Flagged

#### Intervention Levels (from aiHelper.ts)
```
score <= 50  → "soft_nudge" (gentle suggestion)
score >= 50  → Shows suggestion modal (amber colors)
score >= 70  → Shows warning modal with stronger suggestion
```

#### Agent Orchestrator Trigger Rules
| Rule | Threshold | Action |
|------|-----------|--------|
| High Conflict | Score >= 70 | Warning |
| Moderate Conflict | Score >= 50 | Suggestion |
| Recurring Pattern | 3+ occurrences | Nudge |
| Expense Disputed | 1+ dispute | Suggestion |
| Handoff Approaching | Within 24 hours | Nudge |

### 1.4 Acceptance Criteria
- [ ] Message appears in chat instantly after pressing Send (optimistic update)
- [ ] Neutral messages (CES < 50) pass through with NO modal
- [ ] Suggestion modal uses amber colors (score 50-69)
- [ ] Warning modal shown for high conflict messages (score >= 70)
- [ ] User can always choose to send original message
- [ ] "You always pick up the kids on Friday" does NOT trigger AI
- [ ] "You always forget everything" DOES trigger AI
- [ ] AI works correctly in English and Nigerian Pidgin

---

## 2. Conch Mode (Structured Conversations)

### 2.1 Overview
A structured, turn-based conversation mode for difficult discussions. Named after "Lord of the Flies" - only the person "holding the conch" can speak. Includes real-time audio/video, empathy tracking, and a strike system to maintain respectful dialogue.

### 2.2 User-Facing Behavior

#### Turn-Based System
1. One person "holds the conch" at a time
2. Only the conch holder can speak (microphone enabled)
3. Each turn has a timer (default: 60 seconds)
4. User can request extra time (partner must approve)
5. Partner can request early pass of the conch

#### Strike System
Progressive discipline for interrupting or speaking when not holding conch:
- **Strike 1/3**: Yellow warning - "Pause and take a breath"
- **Strike 2/3**: Orange warning - "One more strike = 5 minute timeout"
- **Strike 3/3**: Red warning + 5-minute cooldown block

#### Session Types
- Audio-only call (WebRTC)
- Video call (WebRTC)

### 2.3 Technical Details

#### Cooldown Mechanics
- 5-minute block after 3 strikes
- Cooldown countdown displayed prominently
- Strikes reset after cooldown expires

#### Real-Time Communication
- WebRTC for audio/video
- WebSocket signaling for turn events
- Server-authoritative turn state (prevents cheating)

### 2.4 Acceptance Criteria
- [ ] Only conch holder's microphone is enabled
- [ ] Turn timer counts down visibly (MM:SS format)
- [ ] Strike warning appears immediately when violation detected
- [ ] After 3 strikes, user is blocked for exactly 5 minutes
- [ ] Cooldown timer displays and counts down
- [ ] Strikes reset after cooldown completes
- [ ] "Request Extra Time" sends notification to partner
- [ ] Partner can approve/deny extra time request

---

## 3. Authentication & Sessions

### 3.1 Overview
Supports two authentication methods: Replit Auth (OAuth 2.0) and Guest sessions. Special handling for Android native app OAuth flow.

### 3.2 User-Facing Behavior

#### Replit Auth (Full Account)
1. User taps "Sign in with Replit"
2. Redirected to Replit OAuth consent screen
3. After approval, redirected back to app (logged in)
4. Full access to all features

#### Guest Mode
1. User taps "Continue as Guest"
2. 14-day temporary account created automatically
3. Access to core features with limited functionality
4. Can upgrade to full account later

### 3.3 Technical Details

#### Session Management
- Secure HTTP-only session cookies
- `sameSite: 'lax'` for cross-origin OAuth compatibility
- Forced session save before OAuth redirect (Android reliability)
- 5-minute session stale time

#### Android OAuth Flow
1. App detects native platform via Capacitor
2. Redirects to `/api/login/mobile` (sets mobile flag)
3. After Replit OAuth, server redirects to `peacepad://auth-success?token=xxx`
4. App intercepts deep link, exchanges token for session
5. **Cold Start Recovery**: Auth redirect state persisted to localStorage

#### Background/Foreground Resilience
- When app returns to foreground, automatically refetches:
  - User session (`/api/auth/user`)
  - Conversations (`/api/conversations`)
- Handles OAuth completion during app background

### 3.4 Acceptance Criteria
- [ ] Replit OAuth completes successfully on web
- [ ] Replit OAuth completes successfully on Android native app
- [ ] Guest sessions expire after exactly 14 days
- [ ] Session persists across app restarts
- [ ] Session survives OAuth redirect on Android
- [ ] App returns from background with user still logged in

---

## 4. Location Services

### 4.1 Overview
Location detection for Calendar events, Shared Tasks, and Find Support directory. Prioritizes accuracy over convenience.

### 4.2 User-Facing Behavior

#### Location Autocomplete
1. User types in location field
2. After 50ms pause, suggestions appear from OpenStreetMap
3. User selects suggestion or enters custom location
4. Selected location stored with coordinates

#### GPS Detection (Manual Trigger)
1. User taps "Use my location" or location icon
2. Browser requests location permission (if needed)
3. **On success**: Current location filled in
4. **On failure**: Helpful error message displayed (NOT silent failure)

### 4.3 Technical Details

#### Location Strategy
1. **GPS** (15-second timeout) - Most accurate, user-triggered only
2. **Manual Entry** - User types location with autocomplete
3. **IP Geolocation** - ONLY for search result bias/sorting, NEVER auto-filled into forms (shows ISP hub, not actual location)

**Note**: AI location enhancement and cached location features are planned but not yet implemented.

#### Debounce & Performance
- 50ms debounce on autocomplete searches
- 15-second GPS timeout (prevents infinite wait)
- OpenStreetMap Nominatim API for geocoding

### 4.4 Acceptance Criteria
- [ ] Autocomplete suggestions appear within 500ms of typing pause
- [ ] GPS location detection has 15-second timeout
- [ ] GPS failure shows clear error message (not silent)
- [ ] IP geolocation is NEVER auto-filled into location fields
- [ ] IP geolocation is used only for sorting/biasing results
- [ ] Location autocomplete works in Calendar, Shared Tasks, and Find Support
- [ ] Selected location stores both display name and coordinates

---

## 5. Calendar & Scheduling

### 5.1 Overview
Shared calendar for co-parenting schedules with conflict detection and smart location autocomplete.

### 5.2 User-Facing Behavior

#### Creating Events
1. User selects date/time
2. Enters event title and details
3. Adds location (with autocomplete)
4. Assigns to child (if applicable)
5. System checks for conflicts with existing events

#### Conflict Detection
- Visual indicator when new event overlaps existing
- Shows which events conflict
- Option to proceed anyway or adjust time

### 5.3 Acceptance Criteria
- [ ] Events display in correct timezone
- [ ] Conflict detection highlights overlapping events
- [ ] Location autocomplete works in event creation
- [ ] Events sync between both co-parents
- [ ] Editing event shows existing values correctly
- [ ] Deleted events disappear for both co-parents

---

## 6. Expense Tracking

### 6.1 Overview
Track and split co-parenting expenses with receipt management and settlement features. Supports solo mode for individual expense tracking.

### 6.2 User-Facing Behavior

#### Adding Expenses
1. User enters amount, description, date
2. Selects category (childcare, medical, education, etc.)
3. Optionally attaches receipt photo
4. Selects split type (50/50, custom, one-time)

#### Settlement
1. System calculates who owes whom
2. User can mark expenses as "paid"
3. Settlement history maintained

#### Solo Mode
- For users without connected co-parent
- Track expenses for personal records
- No split calculations

### 6.3 Acceptance Criteria
- [ ] Expense amounts display in correct currency format
- [ ] Receipt photos can be attached and viewed
- [ ] Settlement calculations are mathematically correct
- [ ] Solo mode functions without partnership
- [ ] Disputed expenses highlighted visually

---

## 7. Safety Plans

### 7.1 Overview
Encrypted safety plans for domestic violence survivors. Only the creator can view; emergency contacts can be notified automatically.

### 7.2 User-Facing Behavior

#### Creating Safety Plan
1. User enters safety plan content (contacts, locations, steps)
2. Sets a personal unlock PIN/password
3. Plan is encrypted before storage
4. Only user can access with correct PIN

#### Emergency Alerts
1. User can configure emergency contacts
2. Trigger sends pre-written alert to contacts
3. Alert includes user's current location (if available)

### 7.3 Technical Details

#### Encryption
- AES-256-GCM encryption for plan content
- PBKDF2 key derivation from user password
- Encryption/decryption happens client-side (server never sees plaintext)

### 7.4 Acceptance Criteria
- [ ] Safety plan encrypted before leaving client
- [ ] Server stores only encrypted blob
- [ ] Correct PIN decrypts and displays plan
- [ ] Incorrect PIN shows error (no partial data)
- [ ] Emergency alert sends email to configured contacts
- [ ] Emergency alert includes location if GPS available

---

## 8. Find Support Directory

### 8.1 Overview
Location-based directory of domestic violence resources in Canada. Smart geo-fencing sorts results by proximity.

### 8.2 User-Facing Behavior

#### Searching Resources
1. User enters location or uses GPS
2. Resources sorted by proximity
3. Shows organization name, services, contact info
4. Can filter by service type

#### Geo-Fencing
- Resources have defined service areas
- Only shows resources that serve user's location
- Falls back to national resources if no local matches

### 8.3 Acceptance Criteria
- [ ] Resources sort by distance from user location
- [ ] "Use my location" button triggers GPS
- [ ] Resources display correct contact information
- [ ] Filtering reduces results appropriately
- [ ] National resources appear when no local matches
- [ ] Location search uses same LocationAutocomplete component

---

## 9. Push Notifications

### 9.1 Overview
WhatsApp-style native push notifications for chat messages and Conch Mode events. Uses Firebase Cloud Messaging (FCM) for Android.

### 9.2 Notification Channels (Android 8+)

| Channel ID | Purpose | Importance | Vibration Pattern |
|------------|---------|------------|-------------------|
| `peacepad_messages` | Chat messages | HIGH | [0, 250, 100, 250] |
| `peacepad_conch` | Conch Mode turns/invites | HIGH | [0, 500, 200, 500] |
| `peacepad_general` | Calendar, expenses | DEFAULT | System default |

### 9.3 Acceptance Criteria
- [ ] New chat message triggers push notification
- [ ] Conch Mode turn triggers push notification
- [ ] Tapping notification opens relevant screen
- [ ] Notifications respect system sound/vibration settings
- [ ] Notification channels appear in Android settings
- [ ] User can disable individual channels

---

## 10. Child Updates

### 10.1 Overview
Collaborative notes about children that both parents can view and edit. Designed for sharing day-to-day information (meals, moods, activities).

### 10.2 User-Facing Behavior

#### Adding Updates
1. Select child
2. Write update note
3. Optionally attach photo
4. Update appears in shared timeline

#### Viewing Updates
- Chronological timeline of all updates
- Both parents see same timeline
- Can filter by child

### 10.3 Acceptance Criteria
- [ ] Updates visible to both co-parents
- [ ] Updates display author and timestamp
- [ ] Photos can be attached and viewed
- [ ] Can filter by specific child

---

## Appendix: Error States & Edge Cases

### Network Errors
- Messages use optimistic updates (appear immediately)
- Failed sends show error indicator with retry option
- Background reconnection attempts automatically

### Session Expiry
- Expired session redirects to login
- Active work not lost (optimistic updates persist locally)

### AI Service Unavailable
- Messages send WITHOUT AI analysis
- User notified that tone analysis temporarily unavailable
- No blocking of message flow

---

*Last Updated: February 2026*
*Document Version: 1.0*
