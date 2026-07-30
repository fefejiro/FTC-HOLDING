import type { PeacePadEnvironmentConfig } from "../config/environment";
import { PeacePadApiClient, PeacePadApiError } from "./PeacePadApiClient";
import {
  createFoundationApi,
  SyntheticLabFoundationApi,
} from "./SyntheticLabFoundationApi";

const labConfig: PeacePadEnvironmentConfig = {
  environment: "lab",
  apiBaseUrl: "http://127.0.0.1:8787",
  requestTimeoutMs: 12_000,
  productionApiWritesEnabled: false,
};

const stagingConfig: PeacePadEnvironmentConfig = {
  environment: "staging",
  apiBaseUrl: "https://staging-api.peacepad.example",
  requestTimeoutMs: 12_000,
  productionApiWritesEnabled: false,
};

describe("synthetic lab foundation API", () => {
  it("is the default adapter for lab while staging retains HTTP", () => {
    expect(createFoundationApi(labConfig)).toBeInstanceOf(
      SyntheticLabFoundationApi,
    );
    expect(createFoundationApi(stagingConfig)).toBeInstanceOf(PeacePadApiClient);
  });

  it("requires explicit consent before creating a synthetic session", async () => {
    const api = new SyntheticLabFoundationApi();

    await expect(
      api.startGuest({
        requiredConsentAccepted: false,
        aiMessageConsent: false,
      }),
    ).rejects.toMatchObject<Partial<PeacePadApiError>>({
      kind: "consent-required",
    });
  });

  it("restores the same synthetic session without a network call", async () => {
    const api = new SyntheticLabFoundationApi();
    const restored = await api.startGuest({
      existingSessionId: "lab-session-existing",
      requiredConsentAccepted: true,
      aiMessageConsent: false,
    });

    expect(restored).toMatchObject({
      sessionId: "lab-session-existing",
      guestSessionId: "lab-session-existing",
      guestId: "synthetic-lab-guest",
    });
    expect(new Date(restored.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("produces deterministic rule-based previews", async () => {
    const api = new SyntheticLabFoundationApi();

    await expect(
      api.previewMessage("Can you confirm pickup at 5 PM?"),
    ).resolves.toMatchObject({
      tone: "neutral",
      flags: [],
      rewordingSuggestion: null,
    });

    await expect(
      api.previewMessage("You NEVER confirm anything!!"),
    ).resolves.toMatchObject({
      tone: "pause suggested",
      flags: ["potential-escalation"],
      rewordingSuggestion: "Please confirm the practical details when you can.",
    });
  });

  it("rejects empty and oversized drafts", async () => {
    const api = new SyntheticLabFoundationApi();

    await expect(api.previewMessage("   ")).rejects.toMatchObject({
      kind: "http",
      status: 400,
    });
    await expect(api.previewMessage("x".repeat(4_001))).rejects.toMatchObject({
      kind: "http",
      status: 400,
    });
  });
});
