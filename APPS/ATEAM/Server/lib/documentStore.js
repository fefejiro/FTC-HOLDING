import crypto from "crypto";
import { getDb } from "./sqliteDb.js";

function safeText(value, limit = 220) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, limit);
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function safeJsonStringify(value, fallback = "{}") {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function normalizeDocType(value = "") {
  const normalized = safeText(value, 40).toLowerCase();
  const valid = ["inquiry_form", "proposal", "kickoff"];
  return valid.includes(normalized) ? normalized : "inquiry_form";
}

function normalizeDocStatus(value = "") {
  const normalized = safeText(value, 20).toLowerCase();
  const valid = ["draft", "generated", "sent", "approved", "archived"];
  return valid.includes(normalized) ? normalized : "draft";
}

export function createDocumentStore() {
  const db = getDb();

  const insertStmt = db.prepare(`
    INSERT INTO documents (
      id, run_id, created_ts, updated_ts, doc_type, status, title,
      summary, structured_fields_json, rendered_output, version, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const selectStmt = db.prepare("SELECT * FROM documents WHERE id = ? LIMIT 1");
  const selectByRunStmt = db.prepare("SELECT * FROM documents WHERE run_id = ? ORDER BY updated_ts DESC");
  const selectByRunAndTypeStmt = db.prepare(
    "SELECT * FROM documents WHERE run_id = ? AND doc_type = ? ORDER BY updated_ts DESC LIMIT 1"
  );
  const listStmt = db.prepare("SELECT * FROM documents ORDER BY updated_ts DESC LIMIT ?");
  const updateStmt = db.prepare(`
    UPDATE documents
    SET updated_ts = ?, status = ?, title = ?, summary = ?,
        structured_fields_json = ?, rendered_output = ?, version = ?, metadata_json = ?
    WHERE id = ?
  `);

  const deleteStmt = db.prepare("DELETE FROM documents WHERE id = ?");

  function rowToDocument(row) {
    if (!row) return null;
    return {
      id: String(row.id),
      runId: String(row.run_id),
      createdTs: String(row.created_ts),
      updatedTs: String(row.updated_ts),
      docType: normalizeDocType(row.doc_type),
      status: normalizeDocStatus(row.status),
      title: safeText(row.title, 220),
      summary: safeText(row.summary, 400),
      structuredFields: normalizeObject(safeJsonParse(row.structured_fields_json, {})),
      renderedOutput: String(row.rendered_output || ""),
      version: Math.max(1, parseInt(row.version) || 1),
      metadata: normalizeObject(safeJsonParse(row.metadata_json, {}))
    };
  }

  function normalizeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  return {
    insert(doc) {
      const id = doc.id || `doc_${crypto.randomBytes(8).toString("hex")}`;
      const now = new Date().toISOString();
      const runId = String(doc.runId || "");
      const docType = normalizeDocType(doc.docType);
      const status = normalizeDocStatus(doc.status || "draft");
      const title = safeText(doc.title, 220);
      const summary = safeText(doc.summary, 400);
      const fields = normalizeObject(doc.structuredFields);
      const output = String(doc.renderedOutput || "");
      const version = Math.max(1, parseInt(doc.version) || 1);
      const metadata = normalizeObject(doc.metadata);

      try {
        insertStmt.run(
          id,
          runId,
          now,
          now,
          docType,
          status,
          title,
          summary,
          safeJsonStringify(fields),
          output,
          version,
          safeJsonStringify(metadata)
        );
        return this.get(id);
      } catch (err) {
        console.error("DocumentStore.insert failed:", err.message);
        return null;
      }
    },

    get(id) {
      try {
        const row = selectStmt.get(id);
        return rowToDocument(row);
      } catch (err) {
        console.error("DocumentStore.get failed:", err.message);
        return null;
      }
    },

    getByRunId(runId) {
      try {
        const rows = selectByRunStmt.all(runId);
        return rows.map(rowToDocument);
      } catch (err) {
        console.error("DocumentStore.getByRunId failed:", err.message);
        return [];
      }
    },

    getByRunAndType(runId, docType) {
      try {
        const normalized = normalizeDocType(docType);
        const row = selectByRunAndTypeStmt.get(runId, normalized);
        return rowToDocument(row);
      } catch (err) {
        console.error("DocumentStore.getByRunAndType failed:", err.message);
        return null;
      }
    },

    list(limit = 50) {
      try {
        const rows = listStmt.all(Math.min(limit, 1000));
        return rows.map(rowToDocument);
      } catch (err) {
        console.error("DocumentStore.list failed:", err.message);
        return [];
      }
    },

    update(id, updates) {
      try {
        const doc = this.get(id);
        if (!doc) return null;

        const now = new Date().toISOString();
        const status = updates.status ? normalizeDocStatus(updates.status) : doc.status;
        const title = updates.title ? safeText(updates.title, 220) : doc.title;
        const summary = updates.summary ? safeText(updates.summary, 400) : doc.summary;
        const fields = updates.structuredFields ? normalizeObject(updates.structuredFields) : doc.structuredFields;
        const output = updates.renderedOutput ? String(updates.renderedOutput) : doc.renderedOutput;
        const version = updates.version ? Math.max(1, parseInt(updates.version)) : doc.version;
        const metadata = updates.metadata ? normalizeObject(updates.metadata) : doc.metadata;

        updateStmt.run(
          now,
          status,
          title,
          summary,
          safeJsonStringify(fields),
          output,
          version,
          safeJsonStringify(metadata),
          id
        );

        return this.get(id);
      } catch (err) {
        console.error("DocumentStore.update failed:", err.message);
        return null;
      }
    },

    delete(id) {
      try {
        deleteStmt.run(id);
        return true;
      } catch (err) {
        console.error("DocumentStore.delete failed:", err.message);
        return false;
      }
    },

    changeStatus(id, status) {
      try {
        const doc = this.get(id);
        if (!doc) return null;
        return this.update(id, { status: normalizeDocStatus(status) });
      } catch (err) {
        console.error("DocumentStore.changeStatus failed:", err.message);
        return null;
      }
    }
  };
}
