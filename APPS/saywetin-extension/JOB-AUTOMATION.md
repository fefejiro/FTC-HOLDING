# Job Automation Workflow

This workflow helps you move fast on job applications with consistent quality.

## What It Generates

Given one job description text file, the pipeline generates a targeting pack with:

- Best role-family fit score
- Matched job-description keywords
- Tailored summary bullets
- Tailored skills bullets
- Tailored experience bullets
- Search queries for more similar roles
- Recruiter outreach draft
- Ranked shortlist for multiple jobs
- Quick apply CSV and JSON payloads
- PowerShell script to open top job links fast

Output path:

- `career/outputs/job-pack-<timestamp>.md`

## Quick Start

1. Paste a new JD into a text file in `career/inputs/`.
2. Run:

```bash
npm run career:run -- career/inputs/your-job.txt "Company Name"
```

3. Open the generated file in `career/outputs/`.
4. Copy the tailored bullets into your Word resume format.

For daily one-command flow:

```bash
npm run career:daily -- --urls career/inputs/job-urls.txt --open 5
```

## Sample Run

```bash
npm run career:sample
```

Batch sample run:

```bash
npm run career:batch:sample
```

Generate form packets from latest quick-apply output:

```bash
npm run career:forms
```

Ingest live jobs from URL list:

```bash
npm run career:ingest -- career/inputs/job-urls.txt career/inputs/jobs.live.json
```

Open top links in browser after batch output:

```bash
npm run career:open -- 5
```

## Practical Daily Cadence

- Morning: run 3 JDs through the pipeline.
- Midday: submit 2 highest-fit roles first.
- Afternoon: send outreach draft to recruiter and hiring manager.
- Evening: log responses and adjust `career/profile.json` keywords if needed.

For batch apply days:

- Paste 10 to 20 jobs in `career/inputs/jobs.json` using the sample shape.
- Run `npm run career:batch -- career/inputs/jobs.json`.
- Start with the top 5 by score from the generated shortlist.
- Run `npm run career:open -- 5` to open top links quickly.

For fully guided daily mode:

- Paste job links into `career/inputs/job-urls.txt`.
- Run `npm run career:daily -- --urls career/inputs/job-urls.txt --open 5`.
- Review generated files in `career/outputs/` and `career/outputs/form-packets/`.
- Submit top 5 first, then move down list.

## Keep It Accurate

- Do not claim tools or industries you have not worked in.
- Mirror exact JD words when they are true in your background.
- Keep title as role-only naming, for example `WMS Consultant` or `Systems Analyst`.
- Use your standard contact info consistently.

## Customization Points

- `career/profile.json`:
  - Update role families, keywords, and highlights.
- `career/targets.json`:
  - Update board queries based on market feedback.
- `scripts/job-hunt-pipeline.mjs`:
  - Expand bullet-generation rules for specific role patterns.
- `scripts/career-batch-pack.mjs`:
  - Adjust scoring weights for remote, contract, salary, and keyword fit.
- `career/candidate-answers.json`:
  - Keep your quick-apply answers current for forms and recruiter responses.
- `career/form-answers.json`:
  - Keep your standard application-question answers ready for one-pass copy.
