// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  authenticateAdminCredentials,
  clearAdminAuthenticated,
  getAdminSessionSummary,
  isAdminAuthenticated,
  setAdminAuthenticated,
} from "./admin-auth";

describe("admin-auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects authentication when env vars are not configured", () => {
    // No SAYWETIN_ADMIN_USERNAME or SAYWETIN_ADMIN_PASSWORD set — must always reject
    const result = authenticateAdminCredentials("any@example.com", "any-password");
    expect(result.ok).toBe(false);
  });

  it("rejects invalid password", () => {
    vi.stubEnv("SAYWETIN_ADMIN_USERNAME", "admin@example.com");
    vi.stubEnv("SAYWETIN_ADMIN_PASSWORD", "correct-secret");

    const result = authenticateAdminCredentials("admin@example.com", "wrong-password");
    expect(result.ok).toBe(false);
  });

  it("uses environment credential overrides", () => {
    vi.stubEnv("SAYWETIN_ADMIN_USERNAME", "ops@example.com");
    vi.stubEnv("SAYWETIN_ADMIN_PASSWORD", "ops-secret");

    expect(authenticateAdminCredentials("other@example.com", "other-password").ok).toBe(false);
    expect(authenticateAdminCredentials("ops@example.com", "ops-secret").ok).toBe(true);
  });

  it("stores and clears session auth state", () => {
    const req = { session: {} } as any;

    expect(isAdminAuthenticated(req)).toBe(false);
    expect(getAdminSessionSummary(req)).toEqual({ authenticated: false });

    setAdminAuthenticated(req, "mike.fejiro@gmail.com");
    expect(isAdminAuthenticated(req)).toBe(true);
    expect(getAdminSessionSummary(req).authenticated).toBe(true);

    clearAdminAuthenticated(req);
    expect(isAdminAuthenticated(req)).toBe(false);
  });
});
