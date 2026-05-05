/**
 * Document API Routes
 * Handles document generation, editing, status management, and export
 * D1: Inquiry Form, Proposal, Kickoff Document
 */

import { createDocumentService } from "./documentService.js";

export function createDocumentRoutes({ documentStore, workflowRunStore, serverErrorHandler, badRequestHandler }) {
  const documentService = createDocumentService(documentStore, workflowRunStore);

  return {
    // Get all documents for a workflow run
    getRunDocuments: (req, res) => {
      try {
        const runId = String(req.params.runId || "").trim();
        if (!runId) return badRequestHandler(res, "runId required");

        const result = documentService.getRunDocuments(runId);
        res.json({ ok: true, ...result });
      } catch (err) {
        serverErrorHandler(res, "failed_to_get_run_documents", err);
      }
    },

    // Get a specific document
    getDocument: (req, res) => {
      try {
        const docId = String(req.params.docId || "").trim();
        if (!docId) return badRequestHandler(res, "docId required");

        const doc = documentStore.get(docId);
        if (!doc) {
          return res.status(404).json({ ok: false, error: "document_not_found" });
        }

        res.json({ ok: true, doc });
      } catch (err) {
        serverErrorHandler(res, "failed_to_get_document", err);
      }
    },

    // Generate a new document from workflow run data
    generateDocument: (req, res) => {
      try {
        const runId = String(req.params.runId || "").trim();
        const docType = String(req.body?.docType || "").trim();

        if (!runId) return badRequestHandler(res, "runId required");
        if (!docType) return badRequestHandler(res, "docType required");

        const result = documentService.generateDocument(runId, docType);
        if (!result.success) {
          return res.status(400).json({
            ok: false,
            error: "generation_failed",
            details: result.error
          });
        }

        res.json({ ok: true, doc: result.doc, template: result.template });
      } catch (err) {
        serverErrorHandler(res, "failed_to_generate_document", err);
      }
    },

    // Update document fields and re-render
    updateDocumentFields: (req, res) => {
      try {
        const docId = String(req.params.docId || "").trim();
        const fields = req.body?.fields || {};

        if (!docId) return badRequestHandler(res, "docId required");

        const result = documentService.updateDocumentFields(docId, fields);
        if (!result.success) {
          return res.status(400).json({
            ok: false,
            error: "update_failed",
            details: result.error
          });
        }

        res.json({ ok: true, doc: result.doc });
      } catch (err) {
        serverErrorHandler(res, "failed_to_update_document_fields", err);
      }
    },

    // Change document status
    changeDocumentStatus: (req, res) => {
      try {
        const docId = String(req.params.docId || "").trim();
        const newStatus = String(req.body?.status || "").trim();

        if (!docId) return badRequestHandler(res, "docId required");
        if (!newStatus) return badRequestHandler(res, "status required");

        const result = documentService.changeDocumentStatus(docId, newStatus);
        if (!result.success) {
          return res.status(400).json({
            ok: false,
            error: "status_change_failed",
            details: result.error
          });
        }

        res.json({ ok: true, doc: result.doc });
      } catch (err) {
        serverErrorHandler(res, "failed_to_change_document_status", err);
      }
    },

    // Export document as markdown
    exportDocumentMarkdown: (req, res) => {
      try {
        const docId = String(req.params.docId || "").trim();
        if (!docId) return badRequestHandler(res, "docId required");

        const result = documentService.exportAsMarkdown(docId);
        if (!result.success) {
          return res.status(404).json({ ok: false, error: "export_failed", details: result.error });
        }

        res.setHeader("Content-Type", "text/markdown; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.status(200).send(result.content);
      } catch (err) {
        serverErrorHandler(res, "failed_to_export_markdown", err);
      }
    },

    // Export document as HTML
    exportDocumentHtml: (req, res) => {
      try {
        const docId = String(req.params.docId || "").trim();
        if (!docId) return badRequestHandler(res, "docId required");

        const result = documentService.exportAsHtml(docId);
        if (!result.success) {
          return res.status(404).json({ ok: false, error: "export_failed", details: result.error });
        }

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        res.status(200).send(result.content);
      } catch (err) {
        serverErrorHandler(res, "failed_to_export_html", err);
      }
    },

    // Get available document types
    getDocumentTypes: (req, res) => {
      try {
        const types = documentService.getAvailableDocTypes();
        res.json({ ok: true, docTypes: types });
      } catch (err) {
        serverErrorHandler(res, "failed_to_get_document_types", err);
      }
    }
  };
}
