# PeacePad Data Capabilities Inventory

## For Grant Applications & Pilot Evaluation Planning

**Last Updated:** December 2024  
**Version:** 1.0

---

## Executive Summary

PeacePad's production infrastructure already captures comprehensive data that supports pilot evaluation and outcome measurement. This document inventories what data is currently collected and what reporting capabilities would be built as part of a funded pilot.

---

## What We Already Capture (Built & Ready)

### 1. Communication Metrics

| Data Point | Database Source | Notes |
|------------|-----------------|-------|
| Message count per user | `messages` table | Timestamped, per conversation |
| Message frequency | `messages.timestamp` | Daily/weekly/monthly aggregatable |
| Message delivery status | `messages.status` | sent, delivered, read |
| Response time | `deliveredAt`, `readAt` fields | Calculable from timestamps |
| Message types | `messages.messageType` | text, image, audio, video, document |
| Voice message transcripts | `messages.transcript` | Whisper AI transcription |

### 2. AI Tone Analysis (De-escalation Tracking)

| Data Point | Database Source | Notes |
|------------|-----------------|-------|
| Tone classification | `messages.tone` | Per-message AI analysis |
| Tone summary | `messages.toneSummary` | Human-readable explanation |
| Tone indicator | `messages.toneEmoji` | Visual mood indicator |
| Rewording suggestions | `messages.rewordingSuggestion` | AI-suggested alternatives |
| Positive/neutral/negative counts | `userStats` table | Aggregated per user |

### 3. Conch Mode (Structured Dialogue) Metrics

| Data Point | Database Source | Notes |
|------------|-----------------|-------|
| Sessions started | `conchSessions` | Count of structured conversations initiated |
| Sessions completed | `conchSessions.status` | active, completed, ended |
| Turn count per session | `conchTurnsV2.turnNumber` | Number of structured exchanges |
| Turn duration | `conchTurnsV2.durationSeconds` | Time each person held the "conch" |
| Mood data per session | `conchSessions.moodData` | AI mood tracking during session |
| Session duration | `startedAt`, `endedAt` | Total dialogue time |

### 4. Engagement & Usage Metrics

| Data Point | Database Source | Notes |
|------------|-----------------|-------|
| Messages sent/received | `userStats` | Per-user totals |
| Calls made/received | `userStats` | Communication attempts |
| Call duration | `userStats.callDurationMinutes` | Aggregate call time |
| Conch sessions completed | `userStats.conchSessionsCompleted` | Structured dialogue participation |
| Events created | `userStats.eventsCreated` | Calendar engagement |
| Expenses logged | `userStats.expensesLogged` | Financial coordination usage |
| Streak days | `userStats.streakDays` | Consecutive usage days |
| Last active date | `userStats.lastActiveDate` | Recency of engagement |
| Engagement score | `userStats.engagementScore` | Calculated overall engagement |

### 5. User Journey & Onboarding

| Data Point | Database Source | Notes |
|------------|-----------------|-------|
| Onboarding step | `users.onboardingStep` | 0-4 progress tracking |
| Onboarding completed | `users.onboardingCompletedAt` | Completion timestamp |
| Consents given | Various user fields | AI consent, terms, privacy |
| Partnership status | `partnerships` | Connected vs pending |

### 6. Resolution & Coordination Indicators

| Data Point | Database Source | Notes |
|------------|-----------------|-------|
| Tasks created/completed | `tasks` table | To-do list engagement |
| Expenses logged | `expenses` table | Cost-sharing activity |
| Expense settlements | `settlements` table | Financial resolution tracking |
| Events scheduled | `events` table | Coordination planning |
| Child updates shared | `childUpdates` table | Information sharing frequency |

### 7. Audit & Accountability

| Data Point | Database Source | Notes |
|------------|-----------------|-------|
| User actions | `auditLogs` | Full activity trail |
| Action types | `auditLogs.actionType` | message, call, export, etc. |
| Resource tracking | `auditLogs.resourceId/Type` | What was affected |
| Timestamps | All tables | When actions occurred |

---

## What Needs to Be Built (Funded Pilot Deliverables)

### Dashboard & Visualization Layer

| Capability | Effort | Purpose |
|------------|--------|---------|
| Admin dashboard UI | Medium | View aggregate metrics |
| Tone trend charts | Low | Visualize de-escalation over time |
| Enrollment tracking | Low | Families active vs inactive |
| Partner portal view | Medium | Read-only access for mediators |

### Reporting & Export

| Capability | Effort | Purpose |
|------------|--------|---------|
| CSV export | Low | Data download for analysis |
| PDF summary reports | Medium | Formatted for funders |
| Anonymized aggregate view | Low | Privacy-preserving insights |
| Quarterly snapshot generator | Medium | Scheduled reporting |

### Survey & Feedback Integration

| Capability | Effort | Purpose |
|------------|--------|---------|
| Pre-pilot survey hook | Low | Baseline measurement |
| Post-pilot survey hook | Low | Outcome comparison |
| Partner feedback form | Medium | Mediator input capture |

---

## Grant-Ready Statements

### For Applications

> "PeacePad's production infrastructure already captures comprehensive communication metrics including message frequency, AI tone analysis scores, structured dialogue session completion rates, and user engagement indicators. Grant funding will enable the development of an administrative dashboard, anonymized reporting capabilities, and partner-facing interfaces to surface this data for pilot evaluation purposes."

### For Evaluation Framework Sections

> "The platform will implement a structured measurement framework during the pilot phase, including pre- and post-engagement surveys, anonymized usage analytics, and partner-reported outcomes to evaluate impact on communication quality, dispute resolution, and referral pathways."

---

## Key Evidence We Can Already Demonstrate

| Outcome Area | Available Data | Measurement Approach |
|--------------|----------------|----------------------|
| Communication frequency | Message timestamps | Before/after volume comparison |
| Tone improvement | Tone classifications | Aggregate positive vs negative ratios over time |
| Structured dialogue adoption | Conch session records | Session completion rates |
| Engagement consistency | Streak and activity tracking | Active days per week/month |
| Coordination success | Task/expense records | Tasks completed, expenses settled |

---

## Privacy & Data Ethics

All data captured by PeacePad:

- Is collected with informed user consent
- Remains encrypted at rest and in transit
- Is scoped to specific partnerships (no cross-partnership data leakage)
- Will be anonymized and aggregated for any external reporting
- Complies with Canadian privacy standards (PIPEDA)
- Is used solely for service delivery and evaluation purposes

---

## Technical Notes

**Database:** PostgreSQL (Neon serverless)  
**ORM:** Drizzle ORM with full type safety  
**Schema Location:** `shared/schema.ts`  
**AI Provider:** OpenAI GPT-4o-mini for tone analysis  

All metrics are queryable via SQL for custom reporting needs.

---

## Contact

For questions about data capabilities or pilot evaluation design:  
**Email:** peacepad@peacepad.ca
