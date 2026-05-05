# Prompt Templates — Job-Hunt OS

> Copy these into Cline exactly as written.
> Swap out [BRACKETED] values before running.

---

## STEP 1 — Job Lead Extraction

**Use when:** You have a job posting URL and want structured data

```
Use the MCP web extraction tool to extract structured data from this job posting URL:
[PASTE URL HERE]

Return JSON with:
- company_name
- role_title
- location
- salary_range (if available)
- tech_stack
- responsibilities (top 5)
- requirements (top 5)
- application_link
- recruiter_or_contact (if visible)

Append the result to:
job-hunt/leads/raw_jobs.json

Do not overwrite existing entries.
```

---

## STEP 2 — Company Research

**Use when:** You want deep intel on a company before applying

```
Using the MCP web extraction tool, extract content from this company website:
[PASTE COMPANY URL HERE]

Then summarize:
1. What the company does (simple 2–3 sentence explanation)
2. Their likely internal systems (ERP, billing, CRM, automation, data stack)
3. Where inefficiencies likely exist based on their size and industry
4. Where someone with my background (Business Systems, Finance Systems, AI Workflows) can add specific value

Output as structured notes using the template format in:
job-hunt/research/company_notes.md

Append under a new company section. Do not overwrite existing notes.
```

---

## STEP 3A — Tailored Resume Bullets

**Use when:** You have job data + company research and want to tailor your resume

```
Using the job data from job-hunt/leads/raw_jobs.json for [COMPANY NAME]
and the research notes from job-hunt/research/company_notes.md for [COMPANY NAME]:

Rewrite 5 resume bullets tailored specifically to this role and company.

Rules:
- Lead with impact metrics where possible (%, $, time saved)
- Mirror the language used in the job posting
- Connect to the company's specific systems or challenges
- Keep each bullet under 2 lines

Save to:
job-hunt/applications/tailored/[company_name].md
```

---

## STEP 3B — Recruiter Message + Follow-Up

**Use when:** You want outreach messages that actually get replies

```
Using the job data for [COMPANY NAME] and company research notes:

Generate:
1. A short recruiter message (3–5 lines max)
   - Reference something specific about the company (not generic)
   - Connect my background to their specific challenge
   - End with a soft ask (chat, call, or interest signal)

2. A follow-up message (send +5 days if no reply)
   - Reference the original message date
   - Add one new value point not mentioned before

Keep tone: professional, direct, human. No buzzwords.

Append to:
job-hunt/outreach/messages.md
```

---

## STEP 3C — 30/60/90 Day Value Plan

**Use when:** You want to stand out in interviews or cover letters

```
Using the job data for [COMPANY NAME] and company research:

Create a 30/60/90 day value plan for the [ROLE TITLE] role.

Format:
- Day 1–30: Learn & Listen (what I'd audit, understand, map)
- Day 31–60: Quick Wins (what I'd fix or improve first)
- Day 61–90: Strategic Impact (what I'd build or transform)

Be specific to their systems and challenges. Not generic.

Save to:
job-hunt/applications/tailored/[company_name].md
(append below resume bullets)
```

---

## STEP 4 — Update Tracker

**Use when:** You've submitted an application

```
Update job-hunt/tracker.csv with a new row:

- company: [COMPANY NAME]
- role: [ROLE TITLE]
- date_applied: [TODAY'S DATE]
- status: applied
- contact: [RECRUITER NAME if known, else "unknown"]
- follow_up_date: [TODAY + 5 DAYS]
- notes: [1 sentence on the key angle you used — e.g. "Focused on ERP gap + AI workflow angle"]

Append to tracker.csv. Do not overwrite existing rows.
```

---

## WEEKLY REVIEW PROMPT

**Use every Friday:**

```
Review job-hunt/tracker.csv and job-hunt/research/company_notes.md.

Tell me:
1. How many applications are in "applied" status with no follow-up yet?
2. Which companies have follow_up_date = today or earlier?
3. What patterns do I see across the roles I'm targeting?
4. What should I prioritize next week?

Be direct. No fluff.
```

---

## BATCH JOB COLLECTION (5–10 roles)

**Use on Mondays:**

```
I'm going to give you 5–10 job posting URLs. For each one:

1. Use MCP to extract structured job data
2. Return JSON with: company_name, role_title, location, salary_range, tech_stack, responsibilities (top 5), requirements (top 5), application_link, recruiter_or_contact
3. Append all results to job-hunt/leads/raw_jobs.json

URLs:
1. [URL]
2. [URL]
3. [URL]
4. [URL]
5. [URL]

Process them one at a time. Confirm each before moving to the next.
```

---

*Last updated: 2026-04-13*
