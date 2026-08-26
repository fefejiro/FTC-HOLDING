import {
  PeacePadApiClient,
  PeacePadApiError
} from "./PeacePadApiClient";
import type { PeacePadEnvironmentConfig } from "../config/environment";

const config: PeacePadEnvironmentConfig = {
  environment: "staging",
  apiBaseUrl: "https://staging-api.peacepad.test",
  requestTimeoutMs: 50,
  productionApiWritesEnabled: false,
  diagnosticsEnabled: false
};

function response(status: number, payload: unknown): Response {
  return {
    json: jest.fn(async () => payload),
    ok: status >= 200 && status < 300,
    status
  } as unknown as Response;
}

const validSession = {
  guestSessionId: "guest-session-1",
  sessionId: "session-1",
  guestId: "guest-1",
  expiresAt: "2099-01-01T00:00:00.000Z"
};

describe("PeacePadApiClient", () => {
  it("refuses to create a guest session before required consent", async () => {
    const fetcher = jest.fn(
      async (_input: string, _init?: RequestInit) =>
        response(200, validSession)
    );
    const client = new PeacePadApiClient(config, fetcher);

    await expect(
      client.startGuest({
        requiredConsentAccepted: false,
        aiMessageConsent: false
      })
    ).rejects.toMatchObject({
      kind: "consent-required"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("starts a staging guest session with explicit safe consent fields", async () => {
    const fetcher = jest.fn(
      async (_input: string, _init?: RequestInit) =>
        response(200, validSession)
    );
    const client = new PeacePadApiClient(config, fetcher);

    await expect(
      client.startGuest({
        existingSessionId: "existing-session",
        requiredConsentAccepted: true,
        aiMessageConsent: false
      })
    ).resolves.toEqual(validSession);

    expect(config.productionApiWritesEnabled).toBe(false);
    expect(fetcher).toHaveBeenCalledWith(
      "https://staging-api.peacepad.test/api/auth/guest",
      expect.objectContaining({
        credentials: "include",
        method: "POST"
      })
    );

    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      sessionId: "existing-session",
      hasAcceptedConsent: true,
      aiMessageConsent: false,
      aiCallConsent: false
    });
  });

  it("normalizes a rule-based message preview request", async () => {
    const preview = {
      tone: "neutral",
      summary: "The message is factual."
    };
    const fetcher = jest.fn(
      async (_input: string, _init?: RequestInit) => response(200, preview)
    );
    const client = new PeacePadApiClient(config, fetcher);

    await expect(client.previewMessage("  Pickup is at 5 PM.  ")).resolves.toEqual(
      preview
    );
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      content: "Pickup is at 5 PM."
    });
  });

  it.each([
    [403, { code: "TRIAL_EXPIRED", message: "Session expired." }, "expired"],
    [428, { code: "CONSENT_REQUIRED", message: "Consent required." }, "consent-required"],
    [500, { message: "Service unavailable." }, "http"]
  ] as const)(
    "maps HTTP %s responses to %s errors",
    async (status, payload, kind) => {
      const client = new PeacePadApiClient(
        config,
        jest.fn(async () => response(status, payload))
      );

      await expect(
        client.startGuest({
          requiredConsentAccepted: true,
          aiMessageConsent: false
        })
      ).rejects.toMatchObject({
        kind,
        status
      });
    }
  );

  it("rejects invalid successful payloads", async () => {
    const client = new PeacePadApiClient(
      config,
      jest.fn(async () => response(200, { success: true }))
    );

    await expect(
      client.startGuest({
        requiredConsentAccepted: true,
        aiMessageConsent: false
      })
    ).rejects.toMatchObject({
      kind: "invalid-response"
    });
  });

  it("maps transport failures without exposing their contents", async () => {
    const client = new PeacePadApiClient(
      config,
      jest.fn(async () => {
        throw new Error("private network details");
      })
    );

    await expect(client.previewMessage("Pickup is at 5 PM.")).rejects.toEqual(
      new PeacePadApiError(
        "PeacePad cannot reach the staging service right now.",
        "network"
      )
    );
  });

  it("aborts and reports requests that exceed the configured timeout", async () => {
    jest.useFakeTimers();
    const timeoutConfig = {
      ...config,
      requestTimeoutMs: 10
    };
    const fetcher = jest.fn(
      async (_input: string, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    );
    const client = new PeacePadApiClient(timeoutConfig, fetcher);
    const pending = client.previewMessage("Pickup is at 5 PM.");
    const timeoutExpectation = expect(pending).rejects.toMatchObject({
      kind: "timeout"
    });

    await jest.advanceTimersByTimeAsync(10);
    await timeoutExpectation;
    jest.useRealTimers();
  });
});
