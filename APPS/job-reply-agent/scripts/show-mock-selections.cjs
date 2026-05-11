const Database = require('better-sqlite3');

const db = new Database('data/job_leads.sqlite');
const sql = `
  SELECT
    m.subject,
    m.sender,
    o.role_title,
    o.match_score,
    d.resume_path,
    CASE
      WHEN d.sent = 1 THEN 'sent'
      WHEN d.approved = 1 THEN 'approved'
      WHEN d.message_id IS NOT NULL THEN 'drafted'
      ELSE 'none'
    END AS draft_state,
    (
      SELECT status
      FROM decisions x
      WHERE x.message_id = m.message_id
      ORDER BY x.id DESC
      LIMIT 1
    ) AS latest_status
  FROM messages m
  LEFT JOIN opportunities o ON o.message_id = m.message_id
  LEFT JOIN drafts d ON d.message_id = m.message_id
  ORDER BY m.id
`;

const rows = db.prepare(sql).all();

console.log('--- Mock Run Resume Selections ---');
for (const r of rows) {
  console.log(`Subject: ${r.subject || 'n/a'}`);
  console.log(
    `Role: ${r.role_title || 'n/a'} | Score: ${r.match_score ?? 'n/a'} | Status: ${r.latest_status || 'n/a'}`
  );
  console.log(`Resume: ${r.resume_path || 'none'} | Draft State: ${r.draft_state || 'none'}`);
  console.log('');
}
