# ATEAM Phase D1 - Document Operations Layer Implementation

**Status**: MVP Implementation Complete  
**Date**: 2026-04-16  
**Scope**: Live document operations for 3 document types (Inquiry Form, Proposal, Kickoff)

---

## Deliverables

### 1. Database Layer

**Migration File**: `supabase/migrations/20260416000100_ateam_documents_liveopsx.sql`

Creates new `ateam_documents` table with:
- `id` (pk), `run_id` (fk to ateam_workflow_runs)
- `doc_type` (inquiry_form, proposal, kickoff)
- `status` (draft, generated, sent, approved, archived)
- `title`, `summary`, `structured_fields_json`, `rendered_output`
- `version`, `metadata_json`
- Indexes on: `run_id`, `status`, `doc_type`

**Key Design Decision**: No denormalization to `ateam_workflow_runs` yet. Documents are queried independently by `run_id` when needed. This follows the "prove it first" principle before adding index columns.

---

### 2. Backend Services

#### `Server/lib/documentStore.js`
SQLite-backed document persistence layer (same pattern as WorkflowRunStore).

Methods:
- `insert(doc)` - Create new document
- `get(id)` - Retrieve by ID
- `getByRunId(runId)` - Get all docs for a run
- `getByRunAndType(runId, docType)` - Get latest of specific type
- `list(limit)` - List all documents
- `update(id, updates)` - Modify fields, increment version
- `delete(id)` - Remove document
- `changeStatus(id, status)` - Status lifecycle

Auto-generates IDs (`doc_`), validates types and statuses.

#### `Server/lib/documentRegistry.js`
Document type definitions and template logic (in-memory, D1 scope).

**Document Types** (3 only):

1. **Inquiry Form**
   - Fields: clientName, projectTitle, projectScope, objectives, timeline, budget, constraints
   - Renders to markdown summary of project context

2. **Proposal**
   - Fields: clientName, projectTitle, executiveSummary, scope, deliverables, timeline, investment, terms
   - Renders formal proposal with sections

3. **Kickoff Document**
   - Fields: clientName, projectTitle, projectGoal, teamMembers, approach, keyMilestones, successCriteria, nextSteps
   - Renders project kickoff brief

**Autofill Logic**: `autofillFromRun(run, docType)`
- Extracts `requestedBy`, `title`, `brief`, `request`, `plan` from workflow run
- Maps to document fields (goal → projectGoal, scope → scope, etc.)
- Provides sensible defaults for each document type

#### `Server/lib/documentService.js`
High-level document orchestration.

Methods:
- `generateDocument(runId, docType)` - Create + autofill from run data
- `updateDocumentFields(docId, updatedFields)` - Edit + re-render
- `changeDocumentStatus(docId, newStatus)` - Lifecycle (draft → generated → sent → approved → archived)
- `getRunDocuments(runId)` - List all docs + summary stats by status/type
- `getAvailableDocTypes()` - Return template registry
- `exportAsMarkdown(docId)` - Return .md file with frontmatter
- `exportAsHtml(docId)` - Return styled HTML document

#### `Server/lib/documentRoutes.js`
Express route handlers (factored out for clarity).

Handlers wrap documentService methods and return appropriate HTTP responses.

---

### 3. Server Integration

**File**: `Server/server.js`

**Imports Added** (line 18):
```javascript
import { createDocumentRoutes } from "./lib/documentRoutes.js";
```

**Repository Init** (line 231):
```javascript
documentStore  // Added to destructuring from createRepositories()
```

**Service Init** (line 284-289):
```javascript
const documentRoutes = createDocumentRoutes({
  documentStore,
  workflowRunStore,
  serverErrorHandler: serverError,
  badRequestHandler: badRequest
});
```

**API Routes** (lines 1408-1474, between approvals and work-items):

```
GET    /api/documents/types
       → List available document types

GET    /api/workflow/runs/:runId/documents
       → Get all documents for a run

POST   /api/workflow/runs/:runId/documents/generate
       → Generate new document (autofilled from run data)
       body: { docType: "inquiry_form" | "proposal" | "kickoff" }

GET    /api/documents/:docId
       → Retrieve specific document

POST   /api/documents/:docId/fields
       → Update document fields and re-render
       body: { fields: { clientName, projectScope, ... } }

POST   /api/documents/:docId/status
       → Change status (draft→generated→sent→approved→archived)
       body: { status: "sent" | "approved" | ... }

GET    /api/documents/:docId/export/markdown
       → Download as .md file

GET    /api/documents/:docId/export/html
       → Download as .html file
```

---

### 4. Storage Backend Support

**Updated Files**:
- `Server/lib/storage/backends/local.js` - Added documentStore import + return
- `Server/lib/storage/backends/postgres.js` - documentStore available via local fallback
- `Server/lib/storage/backends/supabase.js` - documentStore available via local fallback

D1 uses local SQLite; postgres/supabase support comes via local fallback (safe for now).

---

## Design Decisions

### What Was Kept Minimal

- ✅ No Client/Project first-class models yet (use ateam_workflow_runs as aggregate root)
- ✅ No documents_index_json on workflow_runs (query by run_id instead)
- ✅ No payment linkage (Phase D5)
- ✅ No PDF generation (Phase D4)
- ✅ No hard stage gating (soft recommendations only in D3)
- ✅ No approval workflow linkage (Phase D5)
- ✅ No version history UI (Phase D5)

### What Was Implemented

- ✅ Separate document lifecycle (draft/generated/sent/approved/archived)
- ✅ Autofill from project/request/plan data
- ✅ Live edit → re-render → save pattern
- ✅ Markdown + HTML export
- ✅ Status tracking
- ✅ Clean URL structure (`/api/documents/*`, `/api/workflow/runs/:runId/documents`)

### Why This Shape

1. **Aggregate Root**: Keep ateam_workflow_runs as the canonical project record. Documents are satellites, not duplicates.
2. **Live Editing**: `updateDocumentFields()` immediately re-renders to keep output in sync.
3. **Autofill**: Extract only what's needed from run data; let UI be responsible for filling empty fields.
4. **Status Over State**: Document status ≠ workflow state. Separate lifecycle allows "sent" before "approved".
5. **Exports**: Markdown first (portable), HTML for preview. PDF deferred (Phase D4).

---

## Testing

**Syntax Check**: ✅ All files pass `node --check`  
**Module Tests**: ✅ Backend tests pass (existing suite unaffected)  
**Integration**: Ready for D1 QA with frontend

---

## Next Steps (After D1 QA)

1. **D2 Document Types**: Discovery Summary, Service Agreement / SOW
   - Add to registry following same pattern
   - Extend autofill logic if needed

2. **D3 Stage Awareness**: Show recommended/required docs per stage
   - Add stage hints to UI (non-blocking)

3. **D4 Export**: PDF generation, better formatting

4. **D5 Linkage**: Connect to approvals, payments, versions

---

## Files Changed

### New Files
- `supabase/migrations/20260416000100_ateam_documents_liveopsx.sql`
- `Server/lib/documentStore.js`
- `Server/lib/documentRegistry.js`
- `Server/lib/documentService.js`
- `Server/lib/documentRoutes.js`

### Modified Files
- `Server/server.js` (3 strategic edits)
- `Server/lib/storage/backends/local.js` (2 edits)

### Configuration Files
- Migration applied via Supabase CLI (automatic on schema sync)

---

## Quality Assurance Checklist

- [x] No greenfield duplicates (reuse ateam_workflow_runs as truth)
- [x] No multiple models for same concept (Client/Project stay virtual for now)
- [x] Modular service architecture (documentStore → documentService → routes)
- [x] Clean separation from workflow routes (grouped clearly in server.js)
- [x] Minimal scope for D1 (3 types only, no payment/approval/PDF)
- [x] Backward compatible (no changes to existing endpoints or schema fields)
- [x] Syntax valid (all files pass Node.js parser check)
- [x] Follows existing patterns (DocumentStore mimics WorkflowRunStore, routes mimic approval routes)
- [x] Auditable (well-commented, clear intent, minimal surface)

---

**Ready for Phase D1 QA and integration with frontend document UI.**
