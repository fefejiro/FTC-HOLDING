import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("public onboarding copy guard", () => {
  it("removes beta/guest gate messaging from onboarding", () => {
    const onboarding = readSource("../../client/src/pages/onboarding.tsx");

    expect(onboarding).not.toMatch(/private beta/i);
    expect(onboarding).not.toMatch(/request private beta access/i);
    expect(onboarding).not.toMatch(/continue as guest/i);
    expect(onboarding).not.toMatch(/support@peacepad\.ca/i);
    expect(onboarding).toContain("Preparing your PeacePad workspace");
  });

  it("keeps landing cta neutral and free of beta gate copy", () => {
    const landing = readSource("../../client/src/pages/landing.tsx");

    expect(landing).toContain("Continue to PeacePad");
    expect(landing).not.toMatch(/private beta/i);
    expect(landing).not.toMatch(/replit/i);
  });
});

