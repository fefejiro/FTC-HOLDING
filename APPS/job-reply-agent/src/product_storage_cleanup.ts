import { createProductPool } from "./product_db.js";
import {
  assertResumeStorageOwnership,
  createProductObjectStorage
} from "./product_object_storage.js";

const runtimeUrl = String(process.env.DATABASE_URL || "").trim();
const migrationUrl = String(process.env.MIGRATION_DATABASE_URL || runtimeUrl).trim();
if (!migrationUrl) throw new Error("MIGRATION_DATABASE_URL or DATABASE_URL is required.");

const db = createProductPool(migrationUrl);
const storage = createProductObjectStorage();
let completed = 0;
let failed = 0;

try {
  const users = await db.query<{ id: string }>("SELECT id FROM product_users ORDER BY id");
  for (const user of users.rows) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
      const pending = await client.query<{
        id: number;
        storageKey: string;
        storageDriver: "local" | "s3";
      }>(
        `SELECT id, storage_key AS "storageKey", storage_driver AS "storageDriver"
           FROM product_object_deletions
          WHERE user_id=$1 AND status IN ('pending','failed') AND attempts < 10
          ORDER BY created_at
          LIMIT 100`,
        [user.id]
      );
      await client.query("COMMIT");

      for (const item of pending.rows) {
        try {
          assertResumeStorageOwnership(user.id, item.storageKey);
          if (item.storageDriver !== storage.driver) throw new Error("Storage driver mismatch.");
          await storage.deleteObject(item.storageKey);
          await client.query("BEGIN");
          await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
          await client.query(
            `UPDATE product_object_deletions
                SET status='completed', attempts=attempts+1, last_error=NULL, completed_at=now()
              WHERE user_id=$1 AND id=$2`,
            [user.id, item.id]
          );
          await client.query("COMMIT");
          completed += 1;
        } catch (error) {
          await client.query("ROLLBACK").catch(() => undefined);
          await client.query("BEGIN");
          await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
          await client.query(
            `UPDATE product_object_deletions
                SET status='failed', attempts=attempts+1, last_error=$3, completed_at=NULL
              WHERE user_id=$1 AND id=$2`,
            [user.id, item.id, (error instanceof Error ? error.message : "Object deletion failed.").slice(0, 500)]
          );
          await client.query("COMMIT");
          failed += 1;
        }
      }
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  console.log(JSON.stringify({ completed, failed, storageDriver: storage.driver }));
  if (failed) process.exitCode = 1;
} finally {
  await db.end();
}
