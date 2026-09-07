import { getDb } from "../src/db.js";

function main() {
  const db = getDb();

  const recent = db
    .prepare(
      `SELECT aa.job_id, aa.status, aa.pause_reason, aa.created_at,
              j.title, j.company, j.source, j.score
       FROM application_attempts aa
       JOIN hunt_jobs j ON j.id = aa.job_id
       ORDER BY aa.id DESC
       LIMIT 12`
    )
    .all();

  const submitted24 = db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM application_attempts
       WHERE status='submitted'
         AND datetime(created_at) >= datetime(?)`
    )
    .get(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as { c: number };

  const dicePending = db
    .prepare(
      `SELECT id, title, company, score, status
       FROM hunt_jobs
       WHERE source='dice'
         AND IFNULL(score, 0) >= 39
         AND id NOT IN (
           SELECT job_id FROM application_attempts WHERE status='submitted'
         )
       ORDER BY score DESC, id ASC
       LIMIT 10`
    )
    .all();

  console.log("submitted_last24h", submitted24.c);
  console.log("recent_attempts", recent);
  console.log("dice_highscore_not_submitted", dicePending);

  db.close();
}

main();
