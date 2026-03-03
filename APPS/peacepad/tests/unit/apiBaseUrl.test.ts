import { describe, expect, it } from "vitest";
import {
  NATIVE_API_BASE_FALLBACK_URL,
  isApiPeacepadBaseUrl,
  resolveApiBaseUrl,
} from "../../client/src/lib/apiBaseUrl";

describe("apiBaseUrl resolution", () => {
  it("uses VITE_API_BASE_URL override when set (web)", () => {
    const resolution = resolveApiBaseUrl({
      configuredBaseUrl: "  https://example.com/  ",
      isNativePlatform: false,
    });

    expect(resolution.baseUrl).toBe("https://example.com");
    expect(resolution.source).toBe("env");
  });

  it("uses VITE_API_BASE_URL override when set (native)", () => {
    const resolution = resolveApiBaseUrl({
      configuredBaseUrl: "https://mobile-api.example.com",
      isNativePlatform: true,
    });

    expect(resolution.baseUrl).toBe("https://mobile-api.example.com");
    expect(resolution.source).toBe("env");
  });

  it("defaults web to window origin when VITE_API_BASE_URL is missing", () => {
    const resolution = resolveApiBaseUrl({
      configuredBaseUrl: "",
      isNativePlatform: false,
      webOrigin: "https://peacepad.ca",
    });

    expect(resolution.baseUrl).toBe("https://peacepad.ca");
    expect(resolution.source).toBe("same-origin");
  });

  it("uses empty base when web origin is unavailable", () => {
    const resolution = resolveApiBaseUrl({
      configuredBaseUrl: "",
      isNativePlatform: false,
      webOrigin: "",
    });

    expect(resolution.baseUrl).toBe("");
    expect(resolution.source).toBe("same-origin");
  });

  it("falls back native to api.peacepad.ca when env override is missing", () => {
    const resolution = resolveApiBaseUrl({
      configuredBaseUrl: "   ",
      isNativePlatform: true,
    });

    expect(resolution.baseUrl).toBe(NATIVE_API_BASE_FALLBACK_URL);
    expect(resolution.source).toBe("native-fallback");
  });

  it("recognizes api.peacepad.ca host", () => {
    expect(isApiPeacepadBaseUrl("https://api.peacepad.ca")).toBe(true);
    expect(isApiPeacepadBaseUrl("https://api.peacepad.ca/")).toBe(true);
    expect(isApiPeacepadBaseUrl("https://peacepad.ca")).toBe(false);
  });
});
