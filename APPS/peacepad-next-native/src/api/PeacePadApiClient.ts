import type {
  ApiErrorKind,
  GuestSessionRequest,
  GuestSessionResponse,
  MessagePreviewResponse
} from "./contracts";
import type { PeacePadEnvironmentConfig } from "../config/environment";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type ErrorPayload = {
  code?: string;
  message?: string;
};

export class PeacePadApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message);
    this.name = "PeacePadApiError";
    this.kind = kind;
    this.status = status;
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PeacePadApiError(
      `PeacePad returned an invalid ${field}.`,
      "invalid-response"
    );
  }
  return value;
}

export interface PeacePadFoundationApi {
  startGuest(input: {
    existingSessionId?: string;
    requiredConsentAccepted: boolean;
    aiMessageConsent: boolean;
  }): Promise<GuestSessionResponse>;
  previewMessage(content: string): Promise<MessagePreviewResponse>;
}

export class PeacePadApiClient implements PeacePadFoundationApi {
  private readonly config: PeacePadEnvironmentConfig;
  private readonly fetcher: FetchLike;

  constructor(config: PeacePadEnvironmentConfig, fetcher: FetchLike = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  async startGuest(input: {
    existingSessionId?: string;
    requiredConsentAccepted: boolean;
    aiMessageConsent: boolean;
  }): Promise<GuestSessionResponse> {
    if (!input.requiredConsentAccepted) {
      throw new PeacePadApiError(
        "Accept the Terms and acknowledge the Privacy Policy first.",
        "consent-required"
      );
    }

    const payload: GuestSessionRequest = {
      sessionId: input.existingSessionId,
      hasAcceptedConsent: true,
      aiMessageConsent: input.aiMessageConsent,
      aiCallConsent: false
    };

    const response = await this.request<GuestSessionResponse>("/api/auth/guest", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    return {
      ...response,
      guestSessionId: requireString(response.guestSessionId, "guest session ID"),
      sessionId: requireString(response.sessionId, "session ID"),
      guestId: requireString(response.guestId, "guest ID"),
      expiresAt: requireString(response.expiresAt, "session expiry")
    };
  }

  async previewMessage(content: string): Promise<MessagePreviewResponse> {
    const normalized = content.trim();
    if (!normalized) {
      throw new PeacePadApiError("Enter a message to preview.", "http", 400);
    }
    if (normalized.length > 4_000) {
      throw new PeacePadApiError(
        "Keep the draft under 4,000 characters.",
        "http",
        400
      );
    }

    const response = await this.request<MessagePreviewResponse>("/api/v2/message-previews", {
      method: "POST",
      body: JSON.stringify({ content: normalized })
    });

    requireString(response.tone, "tone");
    requireString(response.summary, "tone summary");
    return response;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    try {
      const response = await this.fetcher(`${this.config.apiBaseUrl}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...init.headers
        },
        signal: controller.signal
      });

      const payload = (await response.json().catch(() => null)) as T | ErrorPayload | null;

      if (!response.ok) {
        const error = (payload ?? {}) as ErrorPayload;
        if (response.status === 403 && error.code === "TRIAL_EXPIRED") {
          throw new PeacePadApiError(
            error.message || "This guest session has expired.",
            "expired",
            response.status
          );
        }
        if (response.status === 428 || error.code === "CONSENT_REQUIRED") {
          throw new PeacePadApiError(
            error.message || "Consent is required.",
            "consent-required",
            response.status
          );
        }
        throw new PeacePadApiError(
          error.message || `PeacePad request failed (${response.status}).`,
          "http",
          response.status
        );
      }

      if (!payload || typeof payload !== "object") {
        throw new PeacePadApiError(
          "PeacePad returned an empty response.",
          "invalid-response"
        );
      }

      return payload as T;
    } catch (error) {
      if (error instanceof PeacePadApiError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new PeacePadApiError(
          "PeacePad took too long to respond. Try again.",
          "timeout"
        );
      }
      throw new PeacePadApiError(
        "PeacePad cannot reach the staging service right now.",
        "network"
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
