import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertInstanceReady,
  instanceBanner,
  loadUserInstance,
  resolveInstanceId
} from "../src/instance.js";
import { getDb } from "../src/db.js";

const originalAccount = process.env.GMAIL_ACCOUNT_EMAIL;

afterEach(() => {
  process.env.JOB_AGENT_INSTANCE_ID = "fejiro";
  if (originalAccount === undefined) {
    delete process.env.GMAIL_ACCOUNT_EMAIL;
  } else {
    process.env.GMAIL_ACCOUNT_EMAIL = originalAccount;
  }
});

describe("JobAgent instance isolation", () => {
  it("requires an explicit instance when neither argument nor environment is present", () => {
    delete process.env.JOB_AGENT_INSTANCE_ID;
    expect(() => resolveInstanceId()).toThrow(/Missing JobAgent instance/);
  });

  it("resolves Fejiro and Chukwuma to different private roots", () => {
    const fejiro = loadUserInstance("fejiro");
    const chukwuma = loadUserInstance("chukwuma");

    expect(fejiro.expectedGmailAccount).toBe("fejiro.efiuvwere@gmail.com");
    expect(chukwuma.expectedGmailAccount).toBe("chukwumamezok@gmail.com");
    expect(path.normalize(fejiro.paths.database)).not.toBe(path.normalize(chukwuma.paths.database));
    expect(path.normalize(fejiro.paths.gmailTokens)).not.toBe(path.normalize(chukwuma.paths.gmailTokens));
    expect(path.normalize(fejiro.paths.resumeRoot)).not.toBe(path.normalize(chukwuma.paths.resumeRoot));
  });

  it("keeps the friend pilot disabled until onboarding is approved", () => {
    const chukwuma = loadUserInstance("chukwuma");
    expect(() => assertInstanceReady(chukwuma, "process:gmail")).toThrow(/not activated/);
    expect(() => assertInstanceReady(chukwuma, "hunt:apply-one")).toThrow(/not activated/);
    expect(() => assertInstanceReady(chukwuma, "instance:status")).not.toThrow();
  });

  it("prints the identity and storage boundary in the command banner", () => {
    const banner = instanceBanner(loadUserInstance("chukwuma"));
    expect(banner).toMatchObject({
      instanceId: "chukwuma",
      mailbox: "chukwumamezok@gmail.com",
      onboardingApproved: false,
      activationEnabled: false,
      proactiveWorkAuthorization: false
    });
  });

  it("creates the migration-ready application proof ledger", () => {
    const db = getDb(":memory:");
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='application_proofs'"
    ).get() as { name: string } | undefined;
    expect(table?.name).toBe("application_proofs");
    db.close();
  });
});
