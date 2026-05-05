# 🎯 Job-Hunt OS

> Cline + Claude + Apify MCP = a job acquisition machine, not a science project.

---

## Stack (locked in — do not add more)

| Tool | Purpose |
|------|---------|
| **Copilot** | Speed — quick edits, boilerplate |
| **Cline + Claude** | Thinking + orchestration |
| **Apify MCP** | Web extraction — job posts + company sites |
| **CSV / MD files** | Tracking + storage |

---

## Folder Structure

```
job-hunt/
├── leads/
│   └── raw_jobs.json          ← structured job data (auto-appended)
├── research/
│   └── company_notes.md       ← deep company intel
├── applications/
│   └── tailored/
│       └── [company].md       ← resume bullets + 30/60/90 plan
├── outreach/
│   └── messages.md            ← recruiter messages + follow-ups
├── tracker.csv                ← your control center
└── prompts/
    └── templates.md           ← copy-paste prompts for every step
```

---

## Weekly Rhythm

| Day | Action |
|-----|--------|
| **Monday** | Collect 10 job leads → `raw_jobs.json` |
| **Tuesday** | Research 5 companies → `company_notes.md` |
| **Wednesday** | Apply to top 3 (fully tailored) → `tailored/` |
| **Thursday** | Outreach + follow-ups → `messages.md` |
| **Friday** | Review tracker, prep for interviews |

---

## How to Use (Quick Start)

### 1. Collect a job lead
Open Cline → paste **STEP 1** prompt from `prompts/templates.md` → give it a job URL

### 2. Research the company
Open Cline → paste **STEP 2** prompt → give it the company URL

### 3. Generate tailored application
Open Cline → paste **STEP 3A** (resume bullets) + **STEP 3B** (messages) + **STEP 3C** (30/60/90)

### 4. Update tracker
Open Cline → paste **STEP 4** prompt → done

### 5. Weekly review
Every Friday → paste **WEEKLY REVIEW** prompt → get your priorities

---

## The Mindset

> Most people: apply fast, think shallow, sound generic.
> You: apply slower, think deeper, sound precise.
> That difference = interviews.

---

## What NOT to do

- ❌ Scrape the whole internet
- ❌ Install more MCP servers
- ❌ Automate before you understand patterns
- ❌ Apply to 50 roles generically

---

*Setup date: 2026-04-13*
