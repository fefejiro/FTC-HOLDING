# PeacePad CES Testing Script

This script provides messages to test the Conflict Escalation Score (CES) system. Copy and paste these messages to see how the AI detects escalation.

## Level 1: Neutral / Stable (Score 0-30)
*Status: No intervention*

**Parent A:** "Hi, just checking if you're still good to pick up the kids at 4pm today?"
**Parent B:** "Yes, I'll be there on time. See you then."

---

## Level 2: Soft Nudge (Score 31-50)
*Status: Amber inline hint*

**Parent A:** "When are you going to send money for the kids' school supplies? It's been weeks."
**Parent B:** "I thought I already paid that as part of the monthly support."
**Parent A:** "That's not part of it. School supplies are separate. You always do this with money."

---

## Level 3: Modal Intervention (Score 51-75)
*Status: Red blocking dialog*

**Parent A:** "If you don't pay by Friday, I'm calling my lawyer. I'm tired of your excuses."
**Parent B:** "Go ahead. Call whoever you want. You're just trying to control me again."
**Parent A:** "I'm filing for a court hearing. You are a terrible co-parent and the kids are starting to notice."

---

## Level 4: Hard Block (Score 76-100)
*Status: Severe warning + Child reminder*

**Parent A:** "YOU ARE COMPLETELY PATHETIC. I HATE THAT I HAVE TO DEAL WITH YOU."
**Parent B:** "I'M NOT LISTENING TO THIS. YOU'RE THE REASON THE KIDS ARE UNHAPPY."
**Parent A:** "IT'S OVER. I'M TAKING FULL CUSTODY. YOU WILL NEVER SEE THEM AGAIN."

---

## How to use:
1. Copy a message from a specific level.
2. Paste it into the chat box.
3. Observe the intervention (or lack thereof) based on the current conversation history.
4. Note: CES tracks the last 10 messages, so it builds up over time!
