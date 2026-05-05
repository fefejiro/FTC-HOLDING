import { describe, expect, it } from "vitest";
import {
  applyPrepChatPersonalityStyle,
  buildPrepChatPersonalityProfile,
} from "../../server/services/prepChatService";

describe("prep chat personality propagation", () => {
  it("builds adaptation notes when both personalities are provided", () => {
    const profile = buildPrepChatPersonalityProfile("INTJ", "ENFP");

    expect(profile.applied).toBe(true);
    expect(profile.userPersonalityType).toBe("INTJ");
    expect(profile.coParentPersonalityType).toBe("ENFP");
    expect(profile.adaptationNotes.length).toBeGreaterThan(1);
  });

  it("produces distinct revisions for different personality pairings", () => {
    const draftRevision = "Could we adjust pickup to 6:30 PM so the routine stays consistent?";

    const feelerProfile = buildPrepChatPersonalityProfile("INTJ", "ENFP");
    const thinkerProfile = buildPrepChatPersonalityProfile("INFP", "ENTJ");

    const feelerVersion = applyPrepChatPersonalityStyle(draftRevision, feelerProfile);
    const thinkerVersion = applyPrepChatPersonalityStyle(draftRevision, thinkerProfile);

    expect(feelerVersion).not.toBe(thinkerVersion);
    expect(feelerVersion).toContain("works best for both of us");
    expect(thinkerVersion).toContain("specific plan and timing");
  });

  it("falls back gracefully when no valid personality is provided", () => {
    const draftRevision = "Could we coordinate tomorrow's pickup?";
    const profile = buildPrepChatPersonalityProfile(undefined, undefined);

    expect(profile.applied).toBe(false);
    expect(applyPrepChatPersonalityStyle(draftRevision, profile)).toBe(draftRevision);
  });

  it("ignores invalid personality values safely", () => {
    const profile = buildPrepChatPersonalityProfile("NOT_A_TYPE", "1234");

    expect(profile.applied).toBe(false);
    expect(profile.userPersonalityType).toBeUndefined();
    expect(profile.coParentPersonalityType).toBeUndefined();
    expect(profile.adaptationNotes).toEqual([]);
  });
});

