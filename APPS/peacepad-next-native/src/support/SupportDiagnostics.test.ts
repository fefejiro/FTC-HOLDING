import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { createSupportDiagnosticId, createSupportEmailUrl, getOrCreateSupportDiagnosticId } from "./SupportDiagnostics";

describe("support diagnostics", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates and securely stores a content-free device identifier", async () => {
    const identifier = await getOrCreateSupportDiagnosticId();

    expect(identifier).toBe("PP-100000000000");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "peacepad.support.diagnostic-id.v1",
      identifier,
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
  });

  it("reuses only a valid stored identifier", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("PP-ABCDEF123456");
    await expect(getOrCreateSupportDiagnosticId()).resolves.toBe("PP-ABCDEF123456");
    expect(Crypto.randomUUID).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("replaces malformed values and rejects malformed email inputs", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("parent@example.com");
    await expect(getOrCreateSupportDiagnosticId()).resolves.toBe("PP-100000000000");
    expect(() => createSupportDiagnosticId("short")).toThrow("Unable to create");
    expect(() => createSupportEmailUrl("parent@example.com")).toThrow("valid PeacePad support identifier");
  });

  it("builds a support email without identity or family content", () => {
    const url = createSupportEmailUrl("PP-ABCDEF123456");
    expect(decodeURIComponent(url)).toContain("support@peacepad.ca");
    expect(decodeURIComponent(url)).toContain("Diagnostic ID: PP-ABCDEF123456");
    expect(url).not.toContain("family");
  });
});
