# PeacePad Premium Delta Backlog

Status: planning backlog  
Created: 2026-07-22  
Rule: current Capacitor iOS release ships first; this backlog starts after iOS live/tested unless a listed item directly supports App Review.

## Priority 0 - Current iOS release remains separate

- [ ] Verify App Store Connect build state for `1.0.9 (1)`.
- [ ] Upload the validated archive only if no processed build exists.
- [ ] Confirm TestFlight install on the user's iPhone.
- [ ] Complete App Store privacy, screenshots, pricing/availability, and review notes.
- [ ] Submit for public App Store review only after explicit confirmation.
- [ ] Record the final live/TestFlight state in `ios-prep/IOS_RELEASE_HANDOVER_2026-07-22.md`.

## Priority 1 - Premium foundation

- [ ] Create `case_binders` schema and API.
- [ ] Create `case_documents` schema and API.
- [ ] Add private object-storage abstraction for evidence files.
- [ ] Add file hash, uploaded-by, uploaded-at, source, original filename, MIME type, and size metadata.
- [ ] Add access-control tests for case documents.
- [ ] Add audit-log events for upload, view, tag, export, delete, and share.
- [ ] Add a no-legal-advice disclaimer component for Premium legal-prep screens.
- [ ] Replace any "court-admissible" copy with "legal-friendly", "lawyer-ready", or "court-prep".

## Priority 2 - Evidence Vault UX

- [ ] Add Case Binder dashboard.
- [ ] Add upload flow for PDFs, images, screenshots, DOCX, audio/video, and notes.
- [ ] Add evidence-tagging UI.
- [ ] Add manual evidence date/source/person/category fields.
- [ ] Add document preview with extracted text.
- [ ] Add confidence/status labels: raw, processed, reviewed, included in export.
- [ ] Add bulk tag and bulk move.
- [ ] Add "missing evidence" prompts.

## Priority 3 - Document processing and AI summaries

- [ ] Add background processing queue for OCR/text extraction.
- [ ] Add OCR for image/PDF evidence.
- [ ] Add DOCX/PDF text extraction.
- [ ] Add source-grounded summary generation.
- [ ] Add user-review step before saving AI summary.
- [ ] Add hallucination guard: summaries must cite uploaded evidence item IDs.
- [ ] Add redaction support for export packages.

## Priority 4 - Parenting Time & Contact Proof

- [ ] Create `parenting_time_logs` schema/API.
- [ ] Create `contact_attempts` schema/API.
- [ ] Add visit outcome types: completed, denied, cancelled, public-only, supervised, modified, no-response.
- [ ] Add weekly child-call schedule.
- [ ] Add call attempt/completion logging.
- [ ] Attach evidence items to visit/contact logs.
- [ ] Generate weekly parenting-contact summary.
- [ ] Generate monthly pattern report.

## Priority 5 - Peace Calls premium module

- [ ] Audit current call routes and decide whether to re-enable legacy endpoints or use CallEngineV2 only.
- [ ] Route calls pages intentionally; they currently appear present but not routed in `App.tsx`.
- [ ] Restore call initiation only behind a Premium/labs flag.
- [ ] Add end-to-end tests for weekly child-call scheduling and missed/completed call proof.
- [ ] Add explicit consent flow before any recording/transcription feature.
- [ ] Add post-call summary without recording as the first safer release.
- [ ] Revisit native iOS audio/video constraints during React Native phase.

## Priority 6 - Legal Prep Assistant

- [ ] Add lawyer-email draft generator.
- [ ] Add disclosure-index generator.
- [ ] Add affidavit/story-outline generator.
- [ ] Add "what happened this week" summary generator.
- [ ] Add checklist generator for missing documents.
- [ ] Add source citation panel for every generated draft.
- [ ] Add export review screen before download/share.

## Priority 7 - Export packages

- [ ] Create `export_packages` schema/API.
- [ ] Add PDF timeline export.
- [ ] Add CSV evidence index.
- [ ] Add ZIP bundle export with index.
- [ ] Add per-export audit event.
- [ ] Add "included/excluded" controls for each evidence item.
- [ ] Add generated package integrity hash.

## Priority 8 - Premium subscription and packaging

- [ ] Define free vs premium limits.
- [ ] Add Premium entitlement checks.
- [ ] Add pricing page copy.
- [ ] Add in-app upgrade path.
- [ ] Add App Store in-app purchase strategy for iOS Premium.
- [ ] Add backend entitlement reconciliation.

## Priority 9 - React Native premium app

- [ ] Freeze API contracts after web Premium beta.
- [ ] Decide React Native tooling: bare RN vs Expo dev client/build tooling.
- [ ] Build native document-picker/import flow.
- [ ] Build native camera/screenshot capture flow.
- [ ] Add offline evidence capture queue.
- [ ] Add native push reminders for court/contact deadlines.
- [ ] Port Case Binder, Parenting Time Proof, and Peace Calls premium screens.
- [ ] Run iPhone end-to-end evidence upload/export test.

## Non-negotiable safeguards

- [ ] No real court documents in source control.
- [ ] No Apple credentials or signing material in source control.
- [ ] No legal advice claims.
- [ ] No guaranteed court admissibility claims.
- [ ] No call recording without explicit consent/legal review.
- [ ] No React Native rewrite before current iOS release is live/tested.

