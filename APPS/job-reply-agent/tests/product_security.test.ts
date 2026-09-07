import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clearSessionCookie, hasRecentAuthentication, hashPassword, verifyPassword } from "../src/product_auth.js";
import { normalizeIdempotencyKey, requestFingerprint } from "../src/product_idempotency.js";
import { constantEqual, mutationOriginAllowed } from "../src/product_server.js";

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

  it("uses OAuth-compatible hardened cookie attributes", () => {
    const headers = new Map<string, unknown>();
    const response = { setHeader: (name: string, value: unknown) => headers.set(name, value) };
    clearSessionCookie(response as any);
    const cookie = String(headers.get("Set-Cookie"));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=0");
  });

  it("accepts mutations only from the canonical or explicitly trusted origin", () => {
    process.env.APP_ORIGIN = "https://jobagent.unalabs.cloud";
    process.env.APP_ALLOWED_ORIGINS = "https://jobagent-preview.example";
    const request = (origin: string) => ({
      method: "POST",
      url: "/api/v1/onboarding",
      headers: { origin }
    }) as any;
    expect(mutationOriginAllowed(request("https://jobagent.unalabs.cloud"))).toBe(true);
    expect(mutationOriginAllowed(request("https://jobagent-preview.example"))).toBe(true);
    expect(mutationOriginAllowed(request("https://attacker.example"))).toBe(false);
    delete process.env.APP_ORIGIN;
    delete process.env.APP_ALLOWED_ORIGINS;
  });

  it("requires a recent session for destructive account actions", () => {
    const base = { id: "user-a", email: "user@example.com", status: "active" as const };
    expect(hasRecentAuthentication({ ...base, authenticatedAt: new Date().toISOString() })).toBe(true);
    expect(hasRecentAuthentication({
      ...base,
      authenticatedAt: new Date(Date.now() - 16 * 60_000).toISOString()
    })).toBe(false);
  });

  it("binds reusable idempotency keys to the canonical request payload", () => {
    expect(normalizeIdempotencyKey("request-1234567890")).toBe("request-1234567890");
    expect(() => normalizeIdempotencyKey("short")).toThrow(/Idempotency-Key/);
    expect(requestFingerprint("put", "/api/v1/onboarding", { b: 2, a: 1 }))
      .toBe(requestFingerprint("PUT", "/api/v1/onboarding", { a: 1, b: 2 }));
    expect(requestFingerprint("PUT", "/api/v1/onboarding", { a: 1 }))
      .not.toBe(requestFingerprint("PUT", "/api/v1/onboarding", { a: 2 }));
  });

  it("enables row-level security for every tenant-owned product table", () => {
    const migration = fs.readdirSync(path.resolve("migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => fs.readFileSync(path.resolve("migrations", name), "utf8"))
      .join("\n");
    const policies = new Map([
      ["product_onboarding", "product_onboarding_tenant_policy"],
      ["product_connections", "product_connections_tenant_policy"],
      ["product_audit_logs", "product_audit_tenant_policy"],
      ["product_resumes", "product_resumes_tenant_policy"],
      ["product_career_truth_banks", "product_career_truth_banks_tenant_policy"],
      ["product_job_matches", "product_job_matches_tenant_policy"],
      ["product_job_insights", "product_job_insights_tenant_policy"],
      ["product_interview_prep_sessions", "product_interview_prep_sessions_tenant_policy"],
      ["product_outcome_events", "product_outcome_events_tenant_policy"],
      ["product_approval_requests", "product_approval_requests_tenant_policy"],
      ["product_applications", "product_applications_tenant_policy"],
      ["product_idempotency_keys", "product_idempotency_tenant_policy"],
      ["product_object_deletions", "product_object_deletions_tenant_policy"],
      ["product_oauth_states", "product_oauth_states_tenant_policy"],
      ["product_connection_secrets", "product_connection_secrets_tenant_policy"]
    ]);
    for (const [table, policy] of policies) {
      expect(migration).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      expect(migration).toContain(`CREATE POLICY ${policy}`);
    }
    expect(migration).toContain("current_setting('app.user_id', true)");
  });
});
