import pg from "pg";

const { Pool } = pg;

function option(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || "";
}

const userId = option("user-id");
const email = option("email").trim().toLowerCase();

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
  throw new Error("Use --user-id with a valid disposable smoke user UUID.");
}
if (!/^fejiro\.efiuvwere\+unascout-live-[a-z0-9-]+@gmail\.com$/.test(email)) {
  throw new Error("Live fixtures are restricted to the disposable UnaScout smoke alias.");
}
const databaseUrl = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_PUBLIC_URL or DATABASE_URL is required.");

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
  const identity = await client.query(
    "SELECT email FROM product_users WHERE id=$1 AND email=$2 AND status <> 'deleted'",
    [userId, email]
  );
  if (!identity.rows[0]) throw new Error("Disposable smoke identity was not found.");

  await client.query(
    `INSERT INTO product_career_truth_banks (user_id, facts, approved_at, updated_at)
     VALUES ($1,$2::jsonb,now(),now())
     ON CONFLICT (user_id) DO UPDATE SET
       facts=excluded.facts, approved_at=excluded.approved_at, updated_at=now()`,
    [userId, JSON.stringify([
      {
        id: "smoke-fact-requirements",
        category: "delivery",
        statement: "Led requirements discovery, UAT, and stakeholder delivery.",
        verificationStatus: "approved",
        provenance: { source: "release-smoke-fixture" }
      }
    ])]
  );

  const fitJob = await client.query(
    `INSERT INTO product_job_matches
       (user_id, source, external_id, title, company, location, job_url, score,
        status, reasons, description_text)
     VALUES ($1,'linkedin',$2,'Business Analyst','Example Company','Remote',
             'https://example.test/jobs/business-analyst',88,'recommended',$3::jsonb,$4)
     ON CONFLICT (user_id, source, external_id) DO UPDATE SET
       score=excluded.score, status=excluded.status, reasons=excluded.reasons,
       description_text=excluded.description_text, updated_at=now()
     RETURNING id`,
    [
      userId,
      `release-smoke-fit-${userId}`,
      JSON.stringify(["Requirements discovery and UAT match approved facts."]),
      "Requirements discovery, UAT, and stakeholder delivery."
    ]
  );
  const proofJob = await client.query(
    `INSERT INTO product_job_matches
       (user_id, source, external_id, title, company, location, job_url, score,
        status, reasons, description_text)
     VALUES ($1,'linkedin',$2,'IT Manager','Example Company','Remote',
             'https://example.test/jobs/it-manager',90,'package_ready','[]'::jsonb,$3)
     ON CONFLICT (user_id, source, external_id) DO UPDATE SET
       score=excluded.score, status=excluded.status, description_text=excluded.description_text,
       updated_at=now()
     RETURNING id`,
    [userId, `release-smoke-proof-${userId}`, "Enterprise systems leadership and delivery governance."]
  );

  await client.query(
    `INSERT INTO product_approval_requests
       (user_id, job_match_id, action, reason, payload, status)
     VALUES ($1,$2,'package.review','Review the tailored application package before use.',
             '{"fixture":true}'::jsonb,'pending')
     ON CONFLICT DO NOTHING`,
    [userId, fitJob.rows[0].id]
  );

  const application = await client.query(
    `INSERT INTO product_applications
       (user_id, job_match_id, status, final_url, evidence_reference, answers,
        verified_at, updated_at)
     VALUES ($1,$2,'submitted_verified','https://example.test/applied',
             'release-smoke/proof.json','{"fixture":true}'::jsonb,now(),now())
     ON CONFLICT (user_id, job_match_id) DO UPDATE SET
       status=excluded.status, final_url=excluded.final_url,
       evidence_reference=excluded.evidence_reference, verified_at=now(), updated_at=now()
     RETURNING id`,
    [userId, proofJob.rows[0].id]
  );

  await client.query(
    `INSERT INTO product_application_evidence
       (user_id, application_id, evidence_type, storage_key, mime_type, filename,
        sha256, captured_at, provenance)
     VALUES ($1,$2,'confirmation_page',$3,'application/json','confirmation.json',
             $4,now(),'{"fixture":true}'::jsonb)
     ON CONFLICT (user_id, application_id, sha256) DO NOTHING`,
    [
      userId,
      application.rows[0].id,
      `users/${userId}/proof/release-smoke.json`,
      "0".repeat(64)
    ]
  );

  await client.query(
    `INSERT INTO product_interview_prep_sessions
       (user_id, job_match_id, status, questions, rehearsal)
     SELECT $1,$2,'ready',$3::jsonb,'{}'::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM product_interview_prep_sessions
         WHERE user_id=$1 AND job_match_id=$2
      )`,
    [
      userId,
      fitJob.rows[0].id,
      JSON.stringify([{ prompt: "Describe a requirements discovery and UAT engagement." }])
    ]
  );

  await client.query("COMMIT");
  console.log(JSON.stringify({ seeded: true, userId }));
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
