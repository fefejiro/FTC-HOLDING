import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  acceptedMigrationChecksums,
  migrationChecksum,
  normalizeMigrationSql
} from "../src/product_db.js";

describe("product migration checksums", () => {
  it("uses one canonical checksum across Windows and Linux line endings", () => {
    const lf = "CREATE TABLE example (\n  id uuid PRIMARY KEY\n);\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    const cr = lf.replace(/\n/g, "\r");

    expect(normalizeMigrationSql(crlf)).toBe(lf);
    expect(normalizeMigrationSql(cr)).toBe(lf);
    expect(migrationChecksum(crlf)).toBe(migrationChecksum(lf));
    expect(migrationChecksum(cr)).toBe(migrationChecksum(lf));
  });

  it("accepts the legacy Windows checksum recorded by production", () => {
    const sql = fs.readFileSync(path.resolve("migrations/001_product.sql"), "utf8");
    const productionChecksum = "6fa425cd6bd56e5945df66cccb74fd7609ba9c3b83d2bcd5d30128f61074c32b";

    expect(acceptedMigrationChecksums(sql)).toContain(productionChecksum);
  });

  it("accepts the exact mixed-newline checksum only for its production migration", () => {
    const sql = fs.readFileSync(path.resolve("migrations/004_saas_foundation.sql"), "utf8");
    const productionChecksum = "e47711701b98b8c8cabdcced3842a4d547a70ad7720f21c4fa97300b874081c2";

    expect(acceptedMigrationChecksums(sql, "004_saas_foundation.sql")).toContain(productionChecksum);
    expect(acceptedMigrationChecksums(sql, "005_product_lifecycle.sql")).not.toContain(productionChecksum);
  });

  it("rejects a checksum for changed SQL", () => {
    const sql = "CREATE TABLE example (id uuid PRIMARY KEY);\n";
    const changed = `${sql}ALTER TABLE example ADD COLUMN title text;\n`;

    expect(acceptedMigrationChecksums(sql)).not.toContain(migrationChecksum(changed));
  });
});
