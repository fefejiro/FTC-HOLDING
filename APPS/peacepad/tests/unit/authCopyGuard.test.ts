import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("public auth copy guard", () => {
  it("keeps onboarding auth choice in private-beta posture", () => {
    const onboarding = readSource("../../client/src/pages/onboarding.tsx");

    expect(onboarding).toContain("private beta");
    expect(onboarding).toContain("Request private beta access");
    expect(onboarding).not.toMatch(/Start as a guest for up to 14 days/i);
    expect(onboarding).not.toMatch(/Continue as guest/i);
    expect(onboarding).not.toMatch(/private beta access window/i);
  });

  it("keeps landing CTA aligned to private-beta access", () => {
    const landing = readSource("../../client/src/pages/landing.tsx");

    expect(landing).toContain("Continue to Private Beta");
    expect(landing).toContain("private beta rollout");
    expect(landing).not.toMatch(/replit/i);
  });
});
