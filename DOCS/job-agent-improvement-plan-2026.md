# Job Agent Improvement Plan (2026)

## Context

The current job-reply agent is moving in the right direction: job discovery, resume generation, browser automation, and proof logging. The next improvement is to make it behave less like an auto-apply bot and more like a careful job-hunting analyst.

The core goal is simple:

```text
Search broadly.
Filter aggressively.
Tailor truthfully.
Pause before risky submission.
Log proof.
```

Recent resume and ATS guidance supports this approach. Modern applicant tracking systems increasingly evaluate context, relevance, recency, keyword alignment, and formatting structure rather than simple keyword stuffing. The agent therefore needs strong job filtering, truthful resume tailoring, and clean evidence logging.

## Current Direction

The job agent should prioritize quality over volume.

It should not treat success as sending the highest number of applications. Success should mean finding strong-fit roles, generating role-specific resumes, preparing high-quality packages, and only moving applications forward when the opportunity is aligned and safe.

## Priority Job Lanes

The agent should prioritize roles aligned with Fejiro Efiuvwere's background in enterprise systems, retail technology, IT service delivery, ERP, POS, WMS, QA, UAT, integrations, and digital transformation.

Target lanes:

- IT Service Delivery Manager
- IT Manager
- IT Operations Manager
- Business Systems Manager
- Enterprise Systems Manager
- ERP Program Manager
- SAP Program Manager
- WMS Manager
- POS Manager
- Retail Systems Manager
- Digital Transformation Manager
- QA Lead
- UAT Lead
- ServiceNow Manager
- Business Systems Analyst
- Senior IT Project Manager
- Technical Program Manager
- Supply Chain Systems Manager
- Omnichannel Systems Manager

## Job Discovery Improvements

### 1. Replace random feed scraping with Premium Hunt Mode

The agent should not depend only on Dice home feed, recommended jobs, or stale database rows.

It should run targeted searches across the priority job lanes and capture evidence for each candidate.

Each candidate should include:

- source
- search query
- title
- company
- location
- salary if available
- job URL
- posted date
- updated date
- scraped_at timestamp
- Dice match score if available
- apply button status
- external apply status
- already attempted status
- authorization blocker status
- sensitive field blocker status

### 2. Use a clean run-scoped queue

Each hunt run should create a clean candidate queue. Historical rows should not compete with fresh rows unless the run explicitly requests historical review.

Separate these categories:

- fresh scraped jobs
- previously attempted jobs
- stale jobs
- duplicate jobs
- manual/external apply jobs
- blocked jobs
- saved review-only jobs

### 3. Deduplicate aggressively

Deduplicate by:

- job URL
- Dice job ID if available
- company plus title
- external application URL

### 4. Rank jobs, do not queue randomly

The agent should output a ranked shortlist, not a random application queue.

Ranking should consider:

- role title alignment
- required skills alignment
- industry alignment
- seniority fit
- salary fit
- location or remote fit
- recency
- application friction
- missing hard requirements
- authorization or sponsorship blockers
- Dice match score when available

## Resume Tailoring Improvements

The resume engine should generate a premium tailored resume for high-fit roles only.

### 1. Analyze the job description

For each job, extract:

- target title
- company
- industry
- seniority level
- must-have tools
- nice-to-have tools
- methodologies
- business domain
- repeated keywords
- top responsibilities
- hidden deal-breakers

### 2. Select the resume lane

Resume lanes should include:

- IT Service Delivery / IT Operations
- WMS / Supply Chain Systems
- POS / Retail Systems
- ERP / Integration Program Manager
- QA / UAT / Testing Lead
- Business Systems Analyst
- Director / Senior Manager Enterprise Systems

### 3. Generate truthful tailored content

The resume must use the job description's vocabulary where it truthfully matches Fejiro's background.

Strong truthful themes include:

- POS modernization
- ERP integrations
- WMS and Manhattan WMOS
- SAP integration work
- API integrations
- ServiceNow and ITSM
- UAT, SIT, QA, BAT
- Jira, Confluence, Azure DevOps
- government modernization
- retail systems delivery
- vendor coordination
- stakeholder management
- production support and hypercare
- dashboards and reporting
- process improvement

The resume must not invent:

- tools not used
- fake certifications
- fake employer names
- fake dates
- fake titles
- fake hands-on ownership
- fake submitted applications

### 4. Preserve the approved orange DOCX template

The agent must clone the approved resume-bank template rather than creating a generic Word document.

Validation gates:

- DOCX opens successfully
- orange accent color is preserved
- header/contact block exists
- target title is present
- section order is preserved
- bullets are not thin or generic
- job keywords are used in context
- no forbidden or invented claims

## ATS and Format Rules

The agent should output `.docx` by default unless a posting explicitly requests PDF.

The resume should use:

- clear section headings
- readable formatting
- standard work experience structure
- keyword alignment in context
- measurable outcomes where defensible

The resume should avoid:

- keyword stuffing
- excessive icons
- image-only text
- risky layout reconstruction
- inconsistent titles or dates
- rewriting the career story beyond the truth

## Evidence Logging

Every run should produce evidence tables.

### Search coverage table

- query
- pages scanned
- candidates found
- accepted candidates
- rejected candidates
- rejection reasons

### Ranked shortlist table

- rank
- tier
- company
- title
- salary
- location
- URL
- score
- match reason
- missing items
- recommended action

### Resume package table

- company
- title
- resume path
- template validation
- orange accent validation
- keyword coverage
- action taken

### Application evidence table

- company
- title
- URL
- application status
- submitted_at if submitted
- paused_at if paused
- resume used
- confirmation or blocker

## Safe Application Rules

The system should not blindly submit.

Default action should be:

```text
generate_resume_and_pause
```

Safe-submit can be enabled only when:

- the job is fresh
- the role is Tier 1 or strong Tier 2
- there is no authorization blocker
- there are no sensitive unanswered fields
- the generated resume passes validation
- the job is not duplicate or already attempted
- the apply flow does not require unsupported manual judgment

## Recommended Command

Add or refine:

```bash
npm run hunt:dice-premium -- --maxPages=5 --maxCandidates=100 --packageTop=10 --applyMode=pause
```

Expected output:

```text
Dice Premium Hunt Report

Total queries searched: 18
Total candidates discovered: 120
Duplicates removed: 34
Rejected low-fit: 41
Rejected stale: 18
Rejected external/manual-only: 9
Accepted for ranking: 18
Premium resume packages generated: 10
Applications submitted: 0
Applications paused for approval: 10
```

## Definition of Done

The job agent is improved when:

- Dice Premium Hunt Mode searches all target lanes
- stale historical rows do not pollute the current hunt
- jobs are ranked rather than queued randomly
- strong jobs receive premium tailored orange DOCX resumes
- weak jobs are rejected with clear reasons
- application actions pause before risky submission
- every action has proof
- build passes
- tests pass

## Operating Principle

The agent is not just a bot that applies for jobs.

It should operate like:

```text
Recruiter search discipline
Hiring-manager filtering
Executive resume tailoring
Human-controlled application approval
Evidence-backed accountability
```

That is the standard for a trustworthy job-search operating system.
