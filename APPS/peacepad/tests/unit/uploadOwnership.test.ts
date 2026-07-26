import { afterEach, describe, expect, it } from "vitest";
import {
  buildOwnerScopedUploadPath,
  getUploadOwnerKey,
  isOwnerScopedUploadReference,
} from "../../server/uploadOwnership";

const originalPublicBaseUrl = process.env.PUBLIC_BASE_URL;

afterEach(() => {
  if (originalPublicBaseUrl === undefined) {
    delete process.env.PUBLIC_BASE_URL;
  } else {
    process.env.PUBLIC_BASE_URL = originalPublicBaseUrl;
  }
});

describe("owner-scoped upload references", () => {
  it("creates deterministic, non-identifying owner paths", () => {
    const first = getUploadOwnerKey("synthetic-user");
    const second = getUploadOwnerKey("synthetic-user");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("synthetic-user");
    expect(
      buildOwnerScopedUploadPath("chat", "synthetic-user", "1700000000-file.pdf"),
    ).toBe(`/uploads/chat/${first}/1700000000-file.pdf`);
  });

  it("rejects filename traversal", () => {
    expect(() =>
      buildOwnerScopedUploadPath("receipts", "synthetic-user", "../outside.pdf"),
    ).toThrow("Invalid upload filename");
    expect(() =>
      buildOwnerScopedUploadPath("receipts", "synthetic-user", String.raw`..\outside.pdf`),
    ).toThrow("Invalid upload filename");
  });

  it("accepts only the expected owner's relative or first-party URL", () => {
    const reference = buildOwnerScopedUploadPath(
      "profiles",
      "synthetic-user",
      "avatar.jpg",
    );

    expect(isOwnerScopedUploadReference("profiles", "synthetic-user", reference)).toBe(true);
    expect(
      isOwnerScopedUploadReference(
        "profiles",
        "synthetic-user",
        `https://peacepad.ca${reference}?download=1`,
      ),
    ).toBe(true);
    expect(isOwnerScopedUploadReference("profiles", "another-user", reference)).toBe(false);
    expect(
      isOwnerScopedUploadReference(
        "profiles",
        "synthetic-user",
        `https://evil.example${reference}`,
      ),
    ).toBe(false);
  });

  it("permits an explicitly configured deployment host but not a lookalike", () => {
    process.env.PUBLIC_BASE_URL = "https://peacepad-production.example";
    const reference = buildOwnerScopedUploadPath(
      "recordings",
      "synthetic-user",
      "call.webm",
    );

    expect(
      isOwnerScopedUploadReference(
        "recordings",
        "synthetic-user",
        `https://peacepad-production.example${reference}`,
      ),
    ).toBe(true);
    expect(
      isOwnerScopedUploadReference(
        "recordings",
        "synthetic-user",
        `https://peacepad-production.example.evil.test${reference}`,
      ),
    ).toBe(false);
  });
});
