import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { getDb } from "../src/db.js";
import { approveAllDrafts, processMockInbox, sendApprovedDrafts } from "../src/processor.js";

describe("mock processing pipeline", () => {
  it("processes inbox, creates decisions, and sends approved drafts", () => {
    const tmpDb = path.join(os.tmpdir(), `job-reply-agent-test-${Date.now()}.sqlite`);
    try {
      const cfg = loadConfig();
      const db = getDb(tmpDb);

      const outcome = processMockInbox({
        db,
        profile: cfg.profile,
        rules: cfg.rules,
        resumeMap: cfg.resumeMap,
        includeTnLine: true
      });

      expect(outcome.processed).toBeGreaterThan(0);
      expect(outcome.drafted + outcome.needsReview + outcome.skipped + outcome.blocked).toBeGreaterThan(0);

      const approved = approveAllDrafts(db);
      expect(approved).toBeGreaterThan(0);

      const sent = sendApprovedDrafts({ db, rules: cfg.rules });
      expect(sent.sent).toBeGreaterThan(0);
    } finally {
      if (fs.existsSync(tmpDb)) {
        try {
          fs.rmSync(tmpDb, { force: true });
        } catch {
          // no-op for test cleanup
        }
      }
    }
  });
});
