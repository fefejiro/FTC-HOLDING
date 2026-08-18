import { describe, expect, it } from "vitest";
import { configuredPublicSignupCap } from "../src/product_registration.js";

describe("public registration capacity", () => {
  it("keeps commercial signup unlimited when no emergency cap is configured", () => {
    expect(configuredPublicSignupCap(undefined)).toBeNull();
    expect(configuredPublicSignupCap("")).toBeNull();
    expect(configuredPublicSignupCap("   ")).toBeNull();
  });

  it("accepts an explicit capacity limit", () => {
    expect(configuredPublicSignupCap("250000")).toBe(250000);
  });

  it.each(["0", "1.5", "1000001", "many"])("rejects invalid capacity %s", (value) => {
    expect(() => configuredPublicSignupCap(value)).toThrow(/PUBLIC_SIGNUP_CAP/);
  });
});
