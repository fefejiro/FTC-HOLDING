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

  it("accepts default fallback credentials", () => {
    const result = authenticateAdminCredentials("mike.fejiro@gmail.com", "Efiuvwere@1234!");
    expect(result.ok).toBe(true);
    expect(result.username).toBe("mike.fejiro@gmail.com");
  });

  it("rejects invalid password", () => {
    const result = authenticateAdminCredentials("mike.fejiro@gmail.com", "wrong-password");
    expect(result.ok).toBe(false);
  });

  it("uses environment credential overrides", () => {
    vi.stubEnv("SAYWETIN_ADMIN_USERNAME", "ops@example.com");
    vi.stubEnv("SAYWETIN_ADMIN_PASSWORD", "ops-secret");

    expect(authenticateAdminCredentials("mike.fejiro@gmail.com", "Efiuvwere@1234!").ok).toBe(false);
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
