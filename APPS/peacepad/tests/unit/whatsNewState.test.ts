import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  decideWhatsNewAutoOpen,
  WHATS_NEW_LAST_SEEN_KEY,
} from "../../client/src/lib/whatsNewState";

describe("What's New first-run behavior", () => {
  it("does not interrupt a fresh installation after welcome and consent", () => {
    expect(
      decideWhatsNewAutoOpen({ lastSeenVersion: null, latestVersion: "release-a" }),
    ).toEqual({ shouldOpen: false, markSeen: true });
  });

  it("stays closed when the current release was already seen", () => {
    expect(
      decideWhatsNewAutoOpen({ lastSeenVersion: "release-a", latestVersion: "release-a" }),
    ).toEqual({ shouldOpen: false, markSeen: false });
  });

  it("opens for an existing installation when a later release is available", () => {
    expect(
      decideWhatsNewAutoOpen({ lastSeenVersion: "release-a", latestVersion: "release-b" }),
    ).toEqual({ shouldOpen: true, markSeen: false });
  });

  it("keeps the storage contract stable and hides stale binary metadata", () => {
    expect(WHATS_NEW_LAST_SEEN_KEY).toBe("lastSeenChangelogVersion");

    const componentPath = fileURLToPath(
      new URL("../../client/src/components/WhatsNewModal.tsx", import.meta.url),
    );
    const source = readFileSync(componentPath, "utf8");

    expect(source).toContain("Current release");
    expect(source).not.toContain("Version {entry.version}");
    expect(source).not.toMatch(/April 14, 2026/);
  });
});
