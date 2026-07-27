import { getProductPool, migrateProductDb } from "./product_db.js";

const pool = getProductPool();

try {
  await migrateProductDb(pool);
  console.log("Product database migrations completed.");
} finally {
  await pool.end();
}
