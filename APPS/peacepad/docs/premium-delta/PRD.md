# PeacePad Premium Delta PRD

Status: planning  
Owner: FTC / PeacePad  
Created: 2026-07-22  
Release rule: do not merge Premium Delta into the current App Store release until the existing Capacitor iOS app is live/tested end to end.

## Product thesis

PeacePad Premium should become a co-parenting evidence, communication, and court-prep operating system.

The current PeacePad app helps parents pause, reword, and communicate better. Premium Delta expands that into a structured case binder for parents who are overwhelmed by family-court conflict, missed visitation, scattered screenshots, phone-call proof, disclosure material, endorsements, and repeated legal/admin tasks.

The founder insight is simple: many parents do not lose only because their facts are weak; they lose because their facts are scattered, emotional, late, poorly organized, or not exportable in a lawyer/court-friendly format.

## Release sequencing

### Phase 0: iOS live as-is

Ship the current PeacePad iOS app using the existing Capacitor architecture.

Do not add Premium Delta features to the current release train unless required to unblock App Review.

The current iOS release goal remains:

1. Verify App Store Connect build state.
2. Get installable TestFlight working.
3. Complete public App Store metadata/privacy/review.
4. Confirm real iPhone install and smoke test.
5. Only then start Premium Delta implementation.

### Phase 1: Premium Delta inside the existing web/API product

After iOS is live, build the first Premium Delta modules against the existing API and database so product value can be tested quickly.

### Phase 2: React Native premium app

After the Premium Delta flows are proven end to end, package the premium experience into a full React Native iOS app while reusing the backend contracts, evidence model, and tested UX patterns.

Do not start a React Native rewrite until Phase 0 is complete and the Premium Delta data model/API contracts are stable.

## Target users

Primary:

- A parent in high-conflict co-parenting who needs evidence, structure, and calm communication.
- A self-represented parent who cannot afford full legal support.
- A parent preparing disclosure, affidavits, access/visitation logs, or lawyer handoff packages.
- A parent trying to prove contact attempts, completed child calls, denied access, public/supervised visits, or recurring patterns.

Secondary:

- Lawyers, legal-aid clinics, mediators, support workers, churches, counselors, and trusted third parties who need organized evidence packages.

## Product principles

- Evidence first, emotion second: preserve raw proof, then summarize.
- Do not overclaim legal effect: use "legal-friendly", "lawyer-ready", or "court-prep", not guaranteed admissibility.
- User controls exports: PeacePad organizes and drafts; the user decides what to share.
- Private by default: case material is not public, not committed to repos, and not exposed in logs.
- Calm mediator, not referee: language should reduce escalation.
- Founder insight can be father-informed while the product remains inclusive for all parents.

## Core modules

### 1. Case Binder / Evidence Vault

Purpose: one place to upload, preserve, classify, and export court-relevant material.

Capabilities:

- Upload PDFs, DOCX, images, screenshots, audio/video, emails, and notes.
- Capture metadata: date, source, person, child, location, case category, confidence, and original filename.
- OCR images/PDFs where possible.
- AI summary with user review before saving.
- Evidence tags:
  - denied access
  - completed visit
  - public/supervised visit
  - missed call
  - completed child call
  - child welfare
  - expenses/support
  - school/medical
  - communication tone
  - third-party endorsement
  - court order
  - disclosure
  - lawyer/clinic correspondence
- Timeline view.
- Chain-of-custody style metadata: uploaded by, uploaded at, source, hash, modified/exported history.
- Export as PDF/ZIP with index.

### 2. Parenting Time & Contact Proof

Purpose: make visitation and child-contact patterns easy to prove.

Capabilities:

- Log scheduled parenting time.
- Record completed, cancelled, denied, modified, and public-only visits.
- Log phone/video-call attempts and completed weekly calls.
- Record who proposed the contact, who responded, and the outcome.
- Attach screenshots/messages/endorsements to a parenting-time event.
- Generate weekly/monthly parenting-contact summaries.
- Convert patterns into a lawyer-ready summary.

### 3. Peace Calls

Purpose: child-contact and co-parent calls with clear boundaries and proof.

Capabilities:

- Weekly child phone/video call scheduler.
- Call reminders.
- Missed call logging.
- Completed call logging.
- Optional post-call summary.
- Optional recording/transcription only if consent and jurisdiction rules are handled safely.
- Call preferences and do-not-disturb boundaries.

Initial release should prioritize call scheduling and proof over recording.

### 4. Legal Prep Assistant

Purpose: transform messy evidence into structured drafts and checklists without pretending to be a lawyer.

Capabilities:

- Draft lawyer emails.
- Draft disclosure indexes.
- Draft affidavit/story outlines.
- Draft "what happened this week" summaries.
- Generate document-request checklists.
- Flag missing evidence.
- Convert uploaded material into a timeline.
- Provide plain-language court-prep guidance with jurisdiction disclaimer.

Must include:

- "Not legal advice" boundary.
- User review before export/send.
- Source links back to evidence items.
- No hallucinated facts.

### 5. Premium Resource Navigator

Purpose: connect users to verified legal/support resources.

Capabilities:

- Legal-aid clinic finder.
- Family-court forms/resource links.
- Support organizations.
- Mediator/counselor/therapist resources.
- Region-specific filters.
- Save resources to case binder.

## Proposed technical stack

### Current release stack

- React + Vite client
- Express API
- PostgreSQL via Drizzle schema
- Capacitor iOS wrapper for the current App Store release
- Existing upload patterns through multer
- Existing audit/log/export primitives

### Premium Delta web/API stack

- Existing Express/Drizzle API
- Object storage for documents and media; do not rely on repo or ephemeral local disk for production evidence
- Background document-processing jobs
- OCR/extraction service
- AI summarization with source-grounded outputs
- Export worker for PDF/ZIP bundles
- Strong access control and audit events

### Later React Native premium app

- React Native iOS client
- Shared API contracts with the existing backend
- Native document picker
- Native camera/screenshot import
- Native share-sheet import where available
- Push notification support for contact/case deadlines
- Offline-first evidence capture queue where feasible

Expo may be evaluated as React Native tooling later, but the architecture decision should be explicit. Do not assume Expo, React Native, and Capacitor are interchangeable.

## Data model sketch

Candidate tables/entities:

- `case_binders`
- `case_participants`
- `case_documents`
- `case_document_versions`
- `evidence_items`
- `evidence_tags`
- `evidence_events`
- `parenting_time_logs`
- `contact_attempts`
- `child_call_sessions`
- `document_processing_jobs`
- `document_ai_summaries`
- `export_packages`
- `case_timeline_items`
- `case_tasks`
- `case_resource_bookmarks`
- `premium_entitlements`

Reuse where possible:

- `messages` attachment fields
- `expenses` receipt fields
- `calls`, `scheduled_calls`, `call_preferences`
- `call_recordings` only after consent/legal review
- `support_resources`
- `audit_logs`
- `relationship_memories`

## MVP scope for Premium Delta

Minimum valuable Premium beta:

1. Create a case binder.
2. Upload documents/screenshots.
3. Tag and summarize evidence.
4. Create parenting-time/contact logs.
5. Attach evidence to logs.
6. Export a timeline and document index.
7. Generate lawyer-ready weekly summary.
8. Schedule/log weekly child calls.

Out of scope for first Premium beta:

- Automatic filing to court.
- Legal advice.
- Guaranteed admissibility claims.
- Automatic recording without explicit consent.
- Full React Native rewrite.
- Public external drive integration by default.

## Success metrics

- User can upload 20+ evidence items and classify them in one sitting.
- User can produce a clean PDF/ZIP case package in under 10 minutes.
- User can generate a weekly parenting-contact summary from logs.
- User can show a complete call/visit attempt history.
- User can share a lawyer-ready package without exposing unrelated private material.
- No raw private case material is committed to source control or stored in logs.

## Risks

- Legal overclaim risk: avoid "court-admissible" guarantees.
- Privacy risk: case evidence is highly sensitive.
- Storage risk: production evidence needs durable private object storage.
- AI risk: summaries must be source-linked and user-reviewed.
- Call recording risk: consent and jurisdiction rules vary.
- Scope risk: do not derail current iOS release.

