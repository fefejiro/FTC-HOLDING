import { getDb } from "../src/db.js";

type AnswerEntry = { field?: string; name?: string; label?: string; value?: unknown; answer?: unknown };

function extractUploadPath(answeredFieldsJson: string, keyPattern: RegExp): string {
  if (!answeredFieldsJson) return "";
  try {
    const parsed = JSON.parse(answeredFieldsJson) as unknown;
    if (!Array.isArray(parsed)) return "";
    const entry = (parsed as AnswerEntry[]).find((item) => {
      const key = String(item.field ?? item.name ?? item.label ?? "").toLowerCase();
      return keyPattern.test(key);
    });
    return String(entry?.value ?? entry?.answer ?? "").trim();
  } catch {
    return "";
  }
}

function main() {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT a.id, a.job_id, a.status, a.submitted_at, a.answered_fields_json,
              j.title, j.company,
              COALESCE(p.cover_letter_text, '') AS cover_letter_text
       FROM application_attempts a
       LEFT JOIN hunt_jobs j ON j.id = a.job_id
       LEFT JOIN hunt_packages p ON p.job_id = a.job_id
       WHERE a.status='submitted'
       ORDER BY a.id DESC`
    )
    .all() as Array<{
      id: number;
      job_id: number;
      status: string;
      submitted_at: string;
      answered_fields_json: string;
      title: string;
      company: string;
      cover_letter_text: string;
    }>;

  const result = rows.map((row) => {
    const resumeUpload = extractUploadPath(row.answered_fields_json, /resume/);
    const coverUpload = extractUploadPath(row.answered_fields_json, /cover/);
    return {
      id: row.id,
      job_id: row.job_id,
      submitted_at: row.submitted_at,
      title: row.title,
      company: row.company,
      resume_upload: resumeUpload,
      cover_upload: coverUpload,
      cover_letter_preview: row.cover_letter_text.slice(0, 220),
      cover_letter_length: row.cover_letter_text.length
    };
  });

  console.log(JSON.stringify(result, null, 2));
  db.close();
}

main();
