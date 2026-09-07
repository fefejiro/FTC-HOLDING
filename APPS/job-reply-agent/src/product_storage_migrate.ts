import { createProductPool } from "./product_db.js";
import {
  assertResumeStorageOwnership,
  buildResumeStorageKey,
  createProductObjectStorage
} from "./product_object_storage.js";

const runtimeUrl = String(process.env.DATABASE_URL || "").trim();
const migrationUrl = String(process.env.MIGRATION_DATABASE_URL || runtimeUrl).trim();
if (!migrationUrl) throw new Error("MIGRATION_DATABASE_URL or DATABASE_URL is required.");

const db = createProductPool(migrationUrl);
const storage = createProductObjectStorage();
let migrated = 0;

try {
  const users = await db.query<{ id: string }>("SELECT id FROM product_users ORDER BY id");
  for (const user of users.rows) {
    while (true) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
        const batch = await client.query<{
          id: string;
          userId: string;
          filename: string;
          mimeType: string;
          sha256: string;
          content: Buffer;
        }>(
          `SELECT id, user_id AS "userId", filename, mime_type AS "mimeType", sha256, content
             FROM product_resumes
            WHERE user_id=$1 AND storage_key IS NULL AND content IS NOT NULL
            ORDER BY created_at
            LIMIT 100`,
          [user.id]
        );
        await client.query("COMMIT");
        if (!batch.rowCount) break;

        for (const resume of batch.rows) {
          const storageKey = buildResumeStorageKey(resume.userId, resume.sha256);
          assertResumeStorageOwnership(resume.userId, storageKey);
          await storage.putObject({
            key: storageKey,
            content: resume.content,
            mimeType: resume.mimeType,
            filename: resume.filename
          });
          await client.query("BEGIN");
          await client.query("SELECT set_config('app.user_id', $1, true)", [resume.userId]);
          try {
            const updated = await client.query(
              `UPDATE product_resumes
                  SET storage_key=$3, storage_driver=$4, content=NULL
                WHERE user_id=$1 AND id=$2 AND storage_key IS NULL
                RETURNING id`,
              [resume.userId, resume.id, storageKey, storage.driver]
            );
            await client.query("COMMIT");
            if (updated.rowCount) migrated += 1;
          } catch (error) {
            await client.query("ROLLBACK").catch(() => undefined);
            await storage.deleteObject(storageKey).catch(() => undefined);
            throw error;
          }
        }
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    }
  }
  console.log(JSON.stringify({ migrated, storageDriver: storage.driver }));
} finally {
  await db.end();
}
