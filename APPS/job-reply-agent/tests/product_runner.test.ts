import { describe, expect, it } from "vitest";
import { runnerSignature } from "../src/product_public_beta_repository.js";
import { verifyRunnerTask } from "../src/product_runner_client.js";
import { inQuietHours } from "../src/product_worker.js";
import type { RunnerTask } from "../src/product_domain.js";

const userId = "11111111-1111-4111-8111-111111111111";
const secret = "runner-secret-that-is-long-enough-for-hmac-validation";
const config = {
  origin: "https://jobagent.unalabs.cloud",
  deviceId: "22222222-2222-4222-8222-222222222222",
  deviceSecret: secret,
  candidateUserId: userId,
  name: "Fejiro Windows",
  enrolledAt: new Date().toISOString()
};

function signedTask(overrides: Partial<RunnerTask> = {}): RunnerTask {
  const unsigned = {
    id: "33333333-3333-4333-8333-333333333333",
    candidateUserId: userId,
    source: "linkedin" as const,
    action: "assist_submit" as const,
    applicationId: "44444444-4444-4444-8444-444444444444",
    payload: {
      expectedCandidateUserId: userId,
      resumeId: "55555555-5555-4555-8555-555555555555"
    },
    proofRequired: true,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides
  };
  return { ...unsigned, signature: runnerSignature(secret, unsigned) };
}

describe("trusted runner contract", () => {
  it("accepts only a current signed task for the enrolled candidate", () => {
    expect(() => verifyRunnerTask(config, signedTask())).not.toThrow();
    expect(() => verifyRunnerTask(config, signedTask({
      candidateUserId: "66666666-6666-4666-8666-666666666666"
    }))).toThrow(/candidate/);
    expect(() => verifyRunnerTask(config, {
      ...signedTask(),
      signature: "invalid-signature"
    })).toThrow(/signature/);
    expect(() => verifyRunnerTask(config, signedTask({
      expiresAt: new Date(Date.now() - 1_000).toISOString()
    }))).toThrow(/expired/);
  });

  it("handles wrapping and non-wrapping quiet hours", () => {
    expect(inQuietHours(23, 23, 7)).toBe(true);
    expect(inQuietHours(6, 23, 7)).toBe(true);
    expect(inQuietHours(12, 23, 7)).toBe(false);
    expect(inQuietHours(10, 9, 17)).toBe(true);
    expect(inQuietHours(17, 9, 17)).toBe(false);
  });
});
