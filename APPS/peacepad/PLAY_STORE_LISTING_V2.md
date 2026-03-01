# PeacePad - Family Connect | Play Store Listing V2

**IMPORTANT: This is for the NEW submission with new app name and package name**

## Required Changes from Suspended App
- **Old Package**: `peacepad.peacepad.peacepad10` (SUSPENDED)
- **New Package**: `ca.peacepad.app`
- **Old App Name**: `PeacePad`
- **New App Name**: `PeacePad - Family Connect`

---

## App Title (30 characters max)
```
PeacePad - Family Connect
```
(25 characters)

---

## Short Description (80 characters max)
```
Co-parenting made simple. Shared calendar, expenses & messaging tools.
```
(70 characters)

**Alternative:**
```
Coordinate schedules, expenses & communication with your co-parent.
```
(67 characters)

---

## Full Description (4000 characters max)

```
Coordinate Co-Parenting Together

PeacePad - Family Connect is a coordination platform for separated parents who want to stay organized and communicate clearly. With shared calendars, expense tracking, and messaging tools, you can focus on what matters most: your children.

FEATURES

Messaging Tools
- Send messages to your co-parent in one organized place
- Optional tone suggestions help you communicate clearly
- Keep all co-parenting conversations in a single thread
- Works on phone and web

Shared Custody Calendar
- Coordinate schedules with your co-parent
- Track custody exchanges, school events, and appointments
- Set recurring events for predictable routines
- Both parents see the same calendar in real time

Expense Tracking
- Upload receipts and track shared expenses
- Split costs with clear payment tracking
- Keep a transparent record of child-related costs
- Export reports when needed

Conch Mode: Structured Conversations
- Fair turn-taking for difficult discussions
- Visual indicators help keep conversations on track
- Built for conversations that need structure
- Ensures both voices are heard

Task Management
- Create and share co-parenting tasks
- Track what's done and what's pending
- Stay organized together
- Never miss important to-dos

Privacy & Security
- Secure login with Google, Apple, or email
- Your data stays private
- Delete your data anytime with one click
- GDPR-compliant

WHO IS THIS FOR?

- Separated parents
- Co-parents wanting better organization
- Families transitioning to co-parenting
- Anyone needing shared scheduling tools

GETTING STARTED

Try PeacePad with a 14-day guest session - no account required to get started. When you're ready, create an account to save your data and invite your co-parent.

SUPPORT

Questions? Contact us at peacepad@peacepad.ca

Privacy Policy: https://www.termsfeed.com/live/d70738c7-5e03-4fa8-9029-4bb84f042046
Terms of Service: https://peacepad.ca/terms
Website: https://peacepad.ca
```

(Approximately 1,800 characters - well under 4,000 limit)

---

## App Category
**Primary:** Lifestyle
**Secondary:** Productivity

---

## Content Rating
**Target Audience:** Adults (18+)
**Contains:** 
- User-generated content: Yes
- Users can communicate: Yes
- Moderation: Yes (tone suggestions, user reporting)

---

## Keywords/Tags
```
co-parenting, shared calendar, custody schedule, family organizer, separated parents, blended families, expense tracking, parenting coordination, family planner, co-parent communication
```

---

## What Was Changed from V1 (and Why)

| Original | Updated | Reason |
|----------|---------|--------|
| "AI-powered" | "Messaging tools" | Avoid AI claim scrutiny |
| "End-to-end encrypted" | "Secure login" | Only claim what you have |
| Fake testimonials | Removed | Fabricated quotes can trigger rejection |
| "Emotional intelligence" | "Tone suggestions" | Less therapy-adjacent |
| "Reduce conflict" | "Communicate clearly" | Less clinical language |
| "AI tone analysis" | "Tone suggestions" | Simpler, less scrutinized |
| "Real-time mood tracking" | "Visual indicators" | Avoids health-adjacent claims |

---

## Privacy Policy URL (CRITICAL)
**Use this EXACT URL** (publicly accessible, no login required):
```
https://www.termsfeed.com/live/d70738c7-5e03-4fa8-9029-4bb84f042046
```

---

## Screenshots Needed (Minimum 2, Maximum 8)

Recommended order:
1. Chat/Messaging screen
2. Shared Calendar view
3. Expense tracking
4. Task list
5. Conch Mode (if space allows)

**Specs:**
- Format: PNG or JPG
- Dimensions: 1080 x 1920 pixels (phone)
- Max size: 8 MB each

---

## Feature Graphic
**Dimensions:** 1024 x 500 pixels
**Content:** PeacePad logo + "Coordinate Co-Parenting Together"

---

## Contact Information
- **Developer Email:** peacepad@peacepad.ca
- **Website:** https://peacepad.ca

---

## Pre-Submission Checklist

- [ ] New package name: `ca.peacepad.app`
- [ ] New app name: `PeacePad - Family Connect`
- [ ] Short description under 80 chars
- [ ] Full description avoids red-flag terms
- [ ] No fake testimonials
- [ ] Privacy policy URL is public (no login)
- [ ] Content rating: 18+ Adults
- [ ] At least 2 screenshots ready
- [ ] Feature graphic ready (1024x500)
- [ ] App icon ready (512x512)

---

## Build Commands (after code changes)

On Replit:
```bash
npm run build
npx cap sync android
```

Locally (with Android SDK):
```bash
cd android && ./gradlew clean bundleRelease
```

The signed AAB will be at:
`android/app/build/outputs/bundle/release/app-release.aab`
