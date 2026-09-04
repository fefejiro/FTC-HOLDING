import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CUSTOMER_ONBOARDING_STEPS,
  automationModeForCustomer,
  customerOnboardingProgress,
  mergeCustomerOnboardingRecord,
  onboardingConsentChanged,
  onboardingRecordHasValidConsent
} from "../src/product_customer_intelligence.js";

const root = path.resolve(".");

describe("UnaScout customer intelligence", () => {
  it("merges resumable onboarding without accepting unknown fields", () => {
    const record = mergeCustomerOnboardingRecord(
      { fullName: "Fejiro", consent: { recruiterDrafts: true } },
      "location",
      {
        locations: "Toronto, ON\nRemote - Canada",
        workModes: ["remote", "hybrid"],
        compensationCurrency: "CAD",
        resumeText: "private text that must never become a profile field",
        password: "not a profile field"
      },
      "2026-09-03T12:00:00.000Z"
    );

    expect(record.locations).toEqual(["Toronto, ON", "Remote - Canada"]);
    expect(record.workModes).toEqual(["remote", "hybrid"]);
    expect(record.compensationCurrency).toBeUndefined();
    expect(record.resumeText).toBeUndefined();
    expect(record.password).toBeUndefined();
    expect(record._progress).toEqual({
      currentStep: "location",
      completedSteps: ["location"],
      updatedAt: "2026-09-03T12:00:00.000Z"
    });
    expect((record.consent as Record<string, unknown>).recruiterDrafts).toBe(true);
  });

  it("returns a safe first step when progress is absent or invalid", () => {
    expect(customerOnboardingProgress(null)).toEqual({ currentStep: "goals", completedSteps: [] });
    expect(customerOnboardingProgress({ _progress: { currentStep: "unknown", completedSteps: ["nope"] } }))
      .toEqual({ currentStep: "goals", completedSteps: [] });
    expect(CUSTOMER_ONBOARDING_STEPS).toHaveLength(9);
  });

  it("keeps ordinary edits from changing consent and fails closed on revocation", () => {
    const completed = { consent: { truthConfirmed: true, recruiterDrafts: true } };
    const edited = mergeCustomerOnboardingRecord(completed, "goals", { fullName: "Fejiro Efiuvwere" });
    expect(onboardingConsentChanged(completed, edited)).toBe(false);
    expect(onboardingRecordHasValidConsent(edited)).toBe(true);
    const revoked = mergeCustomerOnboardingRecord(completed, "control", { consent: { truthConfirmed: false } });
    expect(onboardingConsentChanged(completed, revoked)).toBe(true);
    expect(onboardingRecordHasValidConsent(revoked)).toBe(false);
  });

  it("maps customer modes to explicit existing policies", () => {
    expect(automationModeForCustomer("review")).toBe("approval_required");
    expect(automationModeForCustomer("assisted")).toBe("assist");
    expect(automationModeForCustomer("controlled_autopilot")).toBe("approval_required");
  });

  it("keeps proposal review and feedback contracts tenant-owned", () => {
    const migration = fs.readFileSync(path.join(root, "migrations", "012_customer_intelligence.sql"), "utf8");
    const server = fs.readFileSync(path.join(root, "src", "product_server.ts"), "utf8");
    expect(migration).toContain("product_resume_fact_proposals");
    expect(migration).toContain("product_recommendation_feedback");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("superseded");
    expect(migration).toContain("resume_version_id");
    expect(migration).toContain("source_location");
    expect(server).toContain("/fact-proposal");
    expect(server).toContain("recommendations\\/([0-9a-f-]{36})\\/feedback");
    expect(server).toContain('"recommendation_rejected"');
  });

  it("exposes the guided customer journey without weakening approval language", () => {
    const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
    const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");
    const server = fs.readFileSync(path.join(root, "src", "product_server.ts"), "utf8");
    for (const step of CUSTOMER_ONBOARDING_STEPS) expect(html).toContain(`data-onboarding-panel="${step}"`);
    expect(html).toContain('id="fact-proposal-form"');
    expect(html).toContain('id="feedback-form"');
    expect(server).toContain("review_resume_facts");
    expect(app).toContain("adjusted from your feedback");
    expect(app).not.toContain("Future recommendations will use this signal.");
    expect(html).toContain('name="controlMode"');
    expect(html).toContain("Step 1 of 9");
    expect(html).toContain("Unapproved resume facts stay out of analysis");
  });
});
