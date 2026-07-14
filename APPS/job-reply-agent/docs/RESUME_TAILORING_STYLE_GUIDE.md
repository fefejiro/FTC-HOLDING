# Resume Tailoring Style Guide

This specification is based on direct comparison of:
- Gold standard: `.local/resume-references/Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx`
- Failure case: `.local/resume-references/Fejiro_Efiuvwere_Azure_Cloud_Enterprise_Architect_Agreeya_Solutions_Tailored.docx`

## 1. Required Output Structure
- Resume output must remain DOCX and preserve the existing template paragraph styles.
- For BA/recruiter-reply packages, use `Business Systems Analyst - Fejiro Efiuvwere Golden Template.docx` as the internal source template and preserve that approved two-column style family. Do not rebuild it as a new one-column resume unless the user explicitly asks for a different format.
- Keep generated candidate-facing filenames human-readable; do not include "Golden Template" in visible resume filenames.
- The left column is for stable section labels only; the right column is for candidate content only.
- Keep alignment clean in Google Docs/Word imports; avoid blank left-label rows, abstract notes, and process descriptions.
- Required top block:
  - Target title (prominent title area)
  - Subtitle line using pipe-delimited capability framing
  - Name/contact block unchanged
- Required body sections:
  - `SUMMARY`
  - `CORE STRENGTHS`
  - `EXPERIENCE`
  - `EDUCATION` or `EDUCATION & CERTIFICATIONS`
  - `PORTFOLIO`

## 2. Required Tone
- Delivery-governance language, not buzzword-heavy hype.
- Strong business-to-technical translation framing.
- Clear operational impact language without invented ownership claims.
- Credible and specific phrasing grounded in truth bank bullets.

## 3. Required Section Order
- Title block
- Summary
- Core Strengths
- Experience
- Education/Certifications
- Portfolio

## 4. Targeted Title Generation
- Use the parsed job title as-is after normalization (collapse spaces, normalize dash characters).
- Do not fallback to generic titles such as `Project Manager`.
- If role title is missing, mark package/job as `needs_review`.

## 5. Subtitle Generation
- Subtitle must be role-track specific and capability-oriented.
- Format: pipe-separated phrases, for example:
  - `Business Systems | Data Quality | Retail Operations | AI-Ready Delivery`
  - `Enterprise Architecture | Cloud Platform Delivery | Integration Governance | Operational Reliability`

## 6. Summary Bullet Generation
- Exactly role/JD-aligned bullets, no generic boilerplate.
- Include:
  - role + company fit statement
  - cross-functional delivery and governance
  - technical/business translation
  - measurable operational outcome orientation
  - portfolio relevance when appropriate

## 7. Core Strengths Generation
- Core strengths must map to the role track and JD keywords.
- Must be concrete capabilities, not vague traits.
- No tool claims outside truth bank.
- For Maximo/EWMS roles, use the confirmed The Brick-through-Talize Maximo-related experience only. Emphasize asset/work management, work orders, preventative maintenance, service requests, facilities, warehouse operations, reporting checks, integrations, data handoffs, QA/UAT, BRD inputs, process mapping, stakeholder signoffs, and implementation support. Do not claim unsupported Maximo administration, configuration, development, certification, or version-specific ownership.

## 8. Experience Bullet Selection From Truth Bank
- Pull only from approved `experience_pool` truth bullets.
- Rank by role track + JD keyword overlap.
- Update selected bullets in the experience section while preserving employment chronology structure.

## 9. GitHub/Una Labs Portfolio Inclusion
- Keep portfolio section with two focused bullets:
  - GitHub enterprise systems and integration work
  - Una Labs AI-enabled operations and workflow assets
- Include portfolio section whenever present in template; do not remove it.

## 10. Contamination Detection Rules
- Ban carryover terms unless explicitly supported by JD text:
  - `WMS Project Manager`
  - `Blue Yonder`
  - `North West Company`
- Azure-targeted resumes cannot inherit retail-WMS narrative unless JD requests it.
- Retail-targeted resumes cannot inherit Azure cloud architecture narrative unless JD requests it.

## 11. Unsupported Claim Blocking Rules
- Block generation when output introduces unsupported claims, including:
  - team sizes
  - budgets
  - distribution center counts
  - client counts
  - MRR ownership
  - pricing ownership
  - gross/net margin ownership
  - P&L ownership
  - U.S. citizenship, Green Card, or clearance statements
  - tools not present in truth bank
- If unsupported claim patterns appear, mark as `needs_review`.

## 12. Cover Letter Quality Rules
- Cover letter must align with the same role/company as resume.
- Must include:
  - direct role/company targeting
  - 2-3 role-relevant strengths
  - concise execution/governance value proposition
  - clean closing
- No contamination or unsupported claims.
- No generic fallback references to unknown role/company.

## Comparison Findings Summary
- Gold standard characteristics:
  - strong section discipline
  - role-specific summary and strengths
  - coherent retail analytics framing
  - clear portfolio placement
- Failure case characteristics:
  - title/body mismatch
  - contamination with `WMS Project Manager`, `Blue Yonder`, `North West Company`
  - weak Azure-role alignment
  - generic and overextended wording
