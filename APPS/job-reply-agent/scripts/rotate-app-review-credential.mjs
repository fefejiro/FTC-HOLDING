import process from "node:process";
import pg from "pg";
import { hashPassword } from "../dist/product_auth.js";

const email = String(process.env.JOBAGENT_APP_REVIEW_EMAIL || "").trim().toLowerCase();
const password = String(process.env.JOBAGENT_APP_REVIEW_PASSWORD || "");
const connectionString =
  process.env.DATABASE_PUBLIC_URL ||
  process.env.MIGRATION_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "";

if (!email || !password || !connectionString) {
  throw new Error(
    "JOBAGENT_APP_REVIEW_EMAIL, JOBAGENT_APP_REVIEW_PASSWORD, and a database URL are required",
  );
}

const db = new pg.Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

try {
  const result = await db.query(
    `UPDATE product_users
        SET password_hash=$2,
            status=CASE WHEN status='deleted' THEN 'active' ELSE status END,
            email_verified_at=COALESCE(email_verified_at, now()),
            updated_at=now()
      WHERE email=$1
      RETURNING id`,
    [email, hashPassword(password)],
  );
  if (result.rowCount !== 1) throw new Error("Reviewer account was not found");
  console.log(JSON.stringify({ rotated: true, email }));
} finally {
  await db.end();
}
