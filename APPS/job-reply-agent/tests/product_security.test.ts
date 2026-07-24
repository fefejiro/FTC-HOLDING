import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clearSessionCookie, hashPassword, verifyPassword } from "../src/product_auth.js";
import { constantEqual } from "../src/product_server.js";

describe("product security", () => {
  it("hashes passwords with a random salt and verifies them", () => {
    const first = hashPassword("correct horse battery staple");
    const second = hashPassword("correct horse battery staple");
    expect(first).not.toBe(second);
    expect(verifyPassword("correct horse battery staple", first)).toBe(true);
    expect(verifyPassword("wrong password", first)).toBe(false);
  });

  it("uses constant-time compatible invite comparisons", () => {
    expect(constantEqual("same-value", "same-value")).toBe(true);
    expect(constantEqual("same-value", "different-value")).toBe(false);
  });

  it("clears sessions with hardened cookie attributes", () => {
    const headers = new Map<string, unknown>();
    const response = { setHeader: (name: string, value: unknown) => headers.set(name, value) };
    clearSessionCookie(response as any);
    const cookie = String(headers.get("Set-Cookie"));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Max-Age=0");
  });

  it("enables row-level security for every tenant-owned product table", () => {
    const migration = fs.readFileSync(path.resolve("migrations/001_product.sql"), "utf8");
    const policies = new Map([
      ["product_onboarding", "product_onboarding_tenant_policy"],
      ["product_connections", "product_connections_tenant_policy"],
      ["product_audit_logs", "product_audit_tenant_policy"]
    ]);
    for (const [table, policy] of policies) {
      expect(migration).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      expect(migration).toContain(`CREATE POLICY ${policy}`);
    }
    expect(migration).toContain("current_setting('app.user_id', true)");
  });
});
