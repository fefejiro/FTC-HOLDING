import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("App Store visibility contracts", () => {
  it("links the rating prompt to the real PeacePad storefront", () => {
    const prompt = readSource("../../client/src/components/AppRatingPrompt.tsx");

    expect(prompt).toContain(
      "https://apps.apple.com/app/id6793350735?action=write-review",
    );
    expect(prompt).toContain(
      "https://play.google.com/store/apps/details?id=ca.peacepad.family",
    );
    expect(prompt).not.toContain("id1234567890");
    expect(prompt).not.toContain("com.peacepad.app");
  });

  it("advertises the public iOS app from the PeacePad website", () => {
    const index = readSource("../../client/index.html");

    expect(index).toContain(
      'name="apple-itunes-app" content="app-id=6793350735, app-argument=https://peacepad.ca/"',
    );
    expect(index).toContain('"operatingSystem": "Web, iOS, iPadOS, Android"');
    expect(index).toContain('"downloadUrl": "https://apps.apple.com/app/id6793350735"');
    expect(index).toContain('"installUrl": "https://apps.apple.com/app/id6793350735"');
    expect(index).not.toMatch(/aggregateRating|ratingValue|reviewCount/);
  });
});
