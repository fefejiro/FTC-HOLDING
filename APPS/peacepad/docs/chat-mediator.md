# PeacePad Chat Mediator System

## Overview

The Chat Mediator is an AI-powered system that monitors co-parent conversations in real-time, detecting potential conflict escalation and providing timely interventions to maintain peaceful communication.

## Conversation Phases

The mediator adapts its behavior based on conversation phase:

| Phase | Message Count | Behavior |
|-------|--------------|----------|
| **Cold** | < 5 messages | Minimal intervention. Let users establish rapport. Only intervene for severe issues (hostile language, threats). |
| **Warm** | 5-15 messages | Moderate guidance. Provide soft nudges for concerning patterns. Help users stay on track. |
| **Hot** | > 15 messages OR escalated | Active monitoring. More proactive interventions. Suggest pauses when tension rises. |

**Note:** Any escalation (hostile/escalating state or worsening trajectory) immediately triggers "hot" phase regardless of message count.

## Conflict Escalation Score (CES)

The CES is a 0-100 score that predicts conflict risk:

| Score Range | State | Intervention Level |
|-------------|-------|-------------------|
| 0-20 | Neutral | None |
| 21-40 | Sensitive | None/Soft Nudge |
| 41-60 | Defensive | Soft Nudge |
| 61-80 | Escalating | Modal |
| 81-100 | Hostile | Hard Block |

## Signal Categories

### Linguistic Signals (Text Analysis)

| Signal | Weight | Description |
|--------|--------|-------------|
| `hostile_language` | +35 | Vulgar, aggressive, or threatening language |
| `escalating_language` | +20 | Belittling, mocking, or dismissive language |
| `accusatory` | +10-12 | "You always", "You never", blame statements |
| `dismissive_attack` | +25-30 | Intelligence attacks, family insults |
| `emotional_charge` | +8-12 | High emotional intensity (overwhelm, fatigue) |

### Behavioral Signals (Interaction Patterns)

| Signal | Weight | Description |
|--------|--------|-------------|
| `rapid_replies` | +8 | Messages < 2 min apart (emotional escalation) |
| `boundary_assertion` | -8 to -12 | Healthy space requests, constructive delays |
| `pressure_control` | +12-20 | Ultimatums, demands, forcing decisions |
| `evasion` | +6-12 | Deflecting, refusing to engage, "whatever" |

### Contextual Signals (Topic Awareness)

| Signal | Weight | Description |
|--------|--------|-------------|
| `legal_escalation` | +12-20 | Lawyer, court, custody threats |
| `financial_tension` | +10-18 | Money disputes, payment demands |
| `child_expense_context` | -10 to -20 | Legitimate child-related expense discussion |

### Pattern Signals (Trajectory Analysis)

| Signal | Weight | Description |
|--------|--------|-------------|
| `escalation_trajectory` | +15 | Recent hostile messages in conversation |
| `defensive_trajectory` | +8 | Recent defensive patterns detected |

## Intervention Types

### Soft Nudge (Inline)
- Non-blocking, shown while typing
- Subtle suggestion to reconsider tone
- User can dismiss and continue

### Modal (Pre-send)
- Blocking modal when Send is clicked
- Shows de-escalation suggestion
- Options: Use calmer version, Send anyway, Cancel

### Hard Block
- Requires acknowledgment before sending
- Shows child impact reminder
- Suggests pause/cooling period

## API Response Format

The `/api/messages/preview` endpoint returns:

```json
{
  "tone": "calm|cooperative|neutral|frustrated|defensive|hostile",
  "summary": "2-5 word emotion description",
  "emoji": "corresponding emoji",
  "rewordingSuggestion": "calmer alternative or null",
  "originalMessage": "the analyzed message",
  "ces": {
    "score": 0-100,
    "state": "neutral|sensitive|defensive|escalating|hostile",
    "phase": "cold|warm|hot",
    "interventionLevel": "none|soft_nudge|modal|hard_block",
    "trajectory": "improving|stable|worsening",
    "signals": [
      {
        "type": "linguistic|behavioral|contextual|pattern",
        "signal": "signal_name",
        "weight": number,
        "description": "human-readable description"
      }
    ],
    "suggestedActions": [
      {
        "type": "rewrite|pause|send_anyway|save_draft",
        "label": "Button label",
        "priority": 1-3,
        "dangerous": boolean
      }
    ],
    "pauseRecommended": boolean,
    "pauseDuration": number (minutes) or null,
    "childImpactReminder": boolean,
    "deescalationSuggestion": "AI-generated calmer version or null"
  }
}
```

## Design Principles

1. **Single Source of Truth**: CES is the unified mediator. No double-flagging (e.g., showing both inline nudge AND pre-send warning for same issue).

2. **Phase-Aware Intervention**: Cold conversations get minimal intervention. Hot conversations get proactive guidance.

3. **Signal Reduction**: Positive signals (boundary assertion, child expense context) reduce CES score to prevent false positives.

4. **Preserve Intent**: Rewriting suggestions preserve the user's core message/request while softening delivery.

5. **Never Neutral Badges**: Only show tone badges for concerning signals (frustrated, defensive, hostile). Don't display "neutral" or "calm" badges.

## Recent Updates (January 2026)

- Added new signal categories: `emotional_charge`, `boundary_assertion`, `pressure_control`, `evasion`
- Implemented conversation phase tracking (cold/warm/hot)
- Unified mediator pass to eliminate double-flagging
- Hidden neutral/calm/cooperative badges (only show concerning tones)
