/**
 * Document Service
 * Orchestrates document generation, editing, and status management
 */

import { DOCUMENT_TEMPLATES, autofillFromRun, normalizeDocType } from "./documentRegistry.js";

function safeText(value, limit = 220) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function createDocumentService(documentStore, workflowRunStore) {
  return {
    /**
     * Generate a new document for a workflow run
     * Autofills from run data using template defaults
     */
    generateDocument(runId, docType) {
      const normalized = normalizeDocType(docType);
      const template = DOCUMENT_TEMPLATES[normalized];

      if (!template) {
        return {
          success: false,
          error: `Unknown document type: ${docType}`,
          doc: null
        };
      }

      const run = workflowRunStore.get(runId);
      if (!run) {
        return {
          success: false,
          error: `Workflow run not found: ${runId}`,
          doc: null
        };
      }

      // Autofill from run data
      const autofilled = autofillFromRun(run, normalized);

      // Render using template
      const rendered = template.renderer(autofilled);

      // Create document
      const doc = documentStore.insert({
        runId,
        docType: normalized,
        status: "generated",
        title: template.name,
        summary: `${template.name} for "${run.title}"`,
        structuredFields: autofilled,
        renderedOutput: rendered,
        version: 1
      });

      if (!doc) {
        return {
          success: false,
          error: "Failed to insert document",
          doc: null
        };
      }

      return {
        success: true,
        doc,
        template
      };
    },

    /**
     * Update document fields and re-render
     */
    updateDocumentFields(docId, updatedFields) {
      const doc = documentStore.get(docId);
      if (!doc) {
        return {
          success: false,
          error: `Document not found: ${docId}`,
          doc: null
        };
      }

      const template = DOCUMENT_TEMPLATES[doc.docType];
      if (!template) {
        return {
          success: false,
          error: `Unknown template: ${doc.docType}`,
          doc: null
        };
      }

      const merged = {
        ...doc.structuredFields,
        ...normalizeObject(updatedFields)
      };

      const rendered = template.renderer(merged);

      const updated = documentStore.update(docId, {
        structuredFields: merged,
        renderedOutput: rendered,
        version: doc.version + 1
      });

      if (!updated) {
        return {
          success: false,
          error: "Failed to update document",
          doc: null
        };
      }

      return {
        success: true,
        doc: updated
      };
    },

    /**
     * Change document status
     */
    changeDocumentStatus(docId, newStatus) {
      const updated = documentStore.changeStatus(docId, newStatus);

      if (!updated) {
        return {
          success: false,
          error: `Failed to change status for ${docId}`,
          doc: null
        };
      }

      return {
        success: true,
        doc: updated
      };
    },

    /**
     * Get all documents for a run with status summary
     */
    getRunDocuments(runId) {
      const docs = documentStore.getByRunId(runId);

      return {
        runId,
        documents: docs,
        summary: {
          total: docs.length,
          byStatus: docs.reduce((acc, doc) => {
            acc[doc.status] = (acc[doc.status] || 0) + 1;
            return acc;
          }, {}),
          byType: docs.reduce((acc, doc) => {
            acc[doc.docType] = (acc[doc.docType] || 0) + 1;
            return acc;
          }, {})
        }
      };
    },

    /**
     * Get available document types for UI
     */
    getAvailableDocTypes() {
      return Object.entries(DOCUMENT_TEMPLATES).map(([key, template]) => ({
        docType: key,
        name: template.name,
        description: template.description,
        fields: template.fields
      }));
    },

    /**
     * Export document as markdown
     */
    exportAsMarkdown(docId) {
      const doc = documentStore.get(docId);
      if (!doc) {
        return {
          success: false,
          error: `Document not found: ${docId}`,
          content: null,
          filename: null
        };
      }

      const filename = `${doc.title.replace(/\s+/g, "_")}_${doc.version}.md`;

      return {
        success: true,
        content: doc.renderedOutput,
        filename,
        doc
      };
    },

    /**
     * Export document as HTML
     */
    exportAsHtml(docId) {
      const doc = documentStore.get(docId);
      if (!doc) {
        return {
          success: false,
          error: `Document not found: ${docId}`,
          content: null,
          filename: null
        };
      }

      const markdown = doc.renderedOutput;
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeText(doc.title, 100)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { margin-top: 1.5em; }
    pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    code { background: #f0f0f0; padding: 2px 4px; }
  </style>
</head>
<body>
  <pre>${markdown}</pre>
  <hr>
  <p style="font-size: 0.9em; color: #666;">Generated by Una Labs ATEAM • ${new Date().toISOString()}</p>
</body>
</html>`;

      const filename = `${doc.title.replace(/\s+/g, "_")}_${doc.version}.html`;

      return {
        success: true,
        content: html,
        filename,
        doc
      };
    }
  };
}
