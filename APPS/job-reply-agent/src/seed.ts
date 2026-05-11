import type Database from "better-sqlite3";

export function seedSampleData(db: Database.Database, reportDate: string): void {
  const now = `${reportDate}T18:00:00.000Z`;

  const insertOpportunity = db.prepare(
    `INSERT OR REPLACE INTO opportunities (message_id, thread_id, role_title, location, match_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertDecision = db.prepare(
    `INSERT INTO decisions (message_id, status, reason, created_at)
     VALUES (?, ?, ?, ?)`
  );

  const rows = [
    {
      messageId: "msg-1",
      role: "Technical Program Manager II",
      location: "Remote",
      score: 82,
      status: "drafted",
      reason: null
    },
    {
      messageId: "msg-2",
      role: "ERP Systems Analyst",
      location: "Hybrid Toronto",
      score: 78,
      status: "needs_review",
      reason: null
    },
    {
      messageId: "msg-3",
      role: "Business Systems Analyst",
      location: "Remote",
      score: 74,
      status: "sent",
      reason: null
    },
    {
      messageId: "msg-4",
      role: "Integration Analyst",
      location: "Onsite",
      score: 61,
      status: "blocked",
      reason: "Recruiter asked for full address before client submission"
    },
    {
      messageId: "msg-5",
      role: "Solutions Analyst",
      location: "Remote",
      score: 69,
      status: "blocked",
      reason: "Right-to-represent language detected"
    }
  ] as const;

  const tx = db.transaction(() => {
    for (const row of rows) {
      insertOpportunity.run(
        row.messageId,
        `thread-${row.messageId}`,
        row.role,
        row.location,
        row.score,
        now
      );

      insertDecision.run(row.messageId, "processed", null, now);
      insertDecision.run(row.messageId, row.status, row.reason, now);
    }

    insertDecision.run("msg-6", "skipped", "Low match score", now);
    insertDecision.run("msg-7", "error", "SMTP temporary failure", now);
  });

  tx();
}
