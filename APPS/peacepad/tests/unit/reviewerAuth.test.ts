import { pbkdf2Sync } from "crypto";
import { describe, expect, it } from "vitest";
import {
  getReviewerAuthConfig,
  reviewerCredentialsMatch,
  verifyReviewerPassword,
} from "../../server/reviewerAuth";

function makeHash(password: string, saltHex = "0123456789abcdef0123456789abcdef"): string {
  const iterations = 210_000;
  const digest = pbkdf2Sync(password, Buffer.from(saltHex, "hex"), iterations, 32, "sha256");
  return `pbkdf2-sha256$${iterations}$${saltHex}$${digest.toString("hex")}`;
}

describe("reviewer auth configuration", () => {
  it("is disabled unless explicitly enabled", () => {
    expect(getReviewerAuthConfig({})).toBeNull();
  });

  it("requires every secret-backed setting when enabled", () => {
    expect(() =>
      getReviewerAuthConfig({
        PEACEPAD_REVIEWER_LOGIN_ENABLED: "true",
        PEACEPAD_REVIEWER_EMAIL: "review@example.com",
      }),
    ).toThrow(/Reviewer login is enabled/);
  });

  it("normalizes configured email without exposing the password", () => {
    const passwordHash = makeHash("correct horse battery staple");
    expect(
      getReviewerAuthConfig({
        PEACEPAD_REVIEWER_LOGIN_ENABLED: "1",
        PEACEPAD_REVIEWER_EMAIL: "  Apple.Review@Example.com ",
        PEACEPAD_REVIEWER_PASSWORD_HASH: passwordHash,
        PEACEPAD_REVIEWER_USER_ID: "apple-review-user",
      }),
    ).toEqual({
      email: "apple.review@example.com",
      passwordHash,
      userId: "apple-review-user",
    });
  });
});

describe("reviewer credential verification", () => {
  const config = {
    email: "apple.review@example.com",
    passwordHash: makeHash("review-only-password"),
    userId: "apple-review-user",
  };

  it("accepts the configured email and password", async () => {
    await expect(
      reviewerCredentialsMatch(config, "Apple.Review@Example.com", "review-only-password"),
    ).resolves.toBe(true);
  });

  it("rejects invalid email and password combinations", async () => {
    await expect(
      reviewerCredentialsMatch(config, "other@example.com", "review-only-password"),
    ).resolves.toBe(false);
    await expect(reviewerCredentialsMatch(config, config.email, "incorrect")).resolves.toBe(false);
  });

  it("rejects weak or malformed encoded hashes", async () => {
    await expect(verifyReviewerPassword("password", "sha256$bad")).resolves.toBe(false);
    await expect(
      verifyReviewerPassword(
        "password",
        "pbkdf2-sha256$1000$0123456789abcdef0123456789abcdef$" + "00".repeat(32),
      ),
    ).resolves.toBe(false);
  });
});
