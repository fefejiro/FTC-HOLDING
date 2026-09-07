/**
 * Quick daily status check - what ran today, current queue status
 */

import { getDb } from "../src/db.js";

const db = getDb();
const today = new Date().toISOString().split("T")[0];

console.log("📅 Today: " + today);
console.log("");

// Job status summary
try {
  console.log("Querying job status...");
  const statusSummary = db
    .prepare(`SELECT status, COUNT(*) as count FROM hunt_jobs GROUP BY status`)
    .all() as Array<{ status: string; count: number }>;

  console.log("💼 Current Job Queue Status:");
  for (const row of statusSummary) {
    console.log(`  ${row.status}: ${row.count}`);
  }
} catch (e) {
  console.log("Error querying job status:", e instanceof Error ? e.message : e);
}

db.close();
console.log("\nDone.");
