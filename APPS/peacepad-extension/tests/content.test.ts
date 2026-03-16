/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/adapters", async () => {
  const actual = await vi.importActual("../src/adapters");
  return {
    ...actual,
    detectSupportedSite: vi.fn(),
  };
});

vi.mock("../src/storage", async () => {
  const actual = await vi.importActual("../src/storage");
  return {
    ...actual,
    getSettings: vi.fn().mockResolvedValue({}),
  };
});

describe("content script bootstrap", () => {
  it("should install watchers when a supported site is detected", async () => {
    const adapters = await import("../src/adapters");
    (adapters.detectSupportedSite as ReturnType<typeof vi.fn>).mockReturnValue("whatsapp");

    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    await import("../src/content");

    expect(adapters.detectSupportedSite).toHaveBeenCalledWith(window.location.hostname);
    expect(addEventListenerSpy).toHaveBeenCalledWith("input", expect.any(Function), true);
    
    addEventListenerSpy.mockRestore();
  });
});
