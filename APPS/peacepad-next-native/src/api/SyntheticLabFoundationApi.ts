import type {
  GuestSessionResponse,
  MessagePreviewResponse,
} from "./contracts";
import {
  PeacePadApiClient,
  PeacePadApiError,
  type PeacePadFoundationApi,
} from "./PeacePadApiClient";
import type { PeacePadEnvironmentConfig } from "../config/environment";

const LAB_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const ESCALATION_PATTERN =
  /\b(always|never|your fault|lying|liar|useless)\b|!{2,}/i;

function requireDraft(content: string): string {
  const normalized = content.trim();
  if (!normalized) {
    throw new PeacePadApiError("Enter a message to preview.", "http", 400);
  }
  if (normalized.length > 4_000) {
    throw new PeacePadApiError(
      "Keep the draft under 4,000 characters.",
      "http",
      400,
    );
  }
  return normalized;
}

function createLabSessionId(): string {
  return `lab-session-${Date.now().toString(36)}`;
}

export class SyntheticLabFoundationApi implements PeacePadFoundationApi {
  async startGuest(input: {
    existingSessionId?: string;
    requiredConsentAccepted: boolean;
    aiMessageConsent: boolean;
  }): Promise<GuestSessionResponse> {
    if (!input.requiredConsentAccepted) {
      throw new PeacePadApiError(
        "Accept the Terms and acknowledge the Privacy Policy first.",
        "consent-required",
      );
    }

    const sessionId = input.existingSessionId || createLabSessionId();
    return {
      success: true,
      user: {
        id: "synthetic-lab-guest",
        displayName: "Synthetic lab guest",
        isGuest: true,
      },
      guestSessionId: sessionId,
      sessionId,
      guestId: "synthetic-lab-guest",
      expiresAt: new Date(Date.now() + LAB_SESSION_LIFETIME_MS).toISOString(),
      message: "Synthetic device-only lab session ready.",
    };
  }

  async previewMessage(content: string): Promise<MessagePreviewResponse> {
    const normalized = requireDraft(content);
    const needsPause = ESCALATION_PATTERN.test(normalized);

    return {
      tone: needsPause ? "pause suggested" : "neutral",
      summary: needsPause
        ? "This draft contains language that may feel accusatory."
        : "This draft is direct and focused on practical details.",
      emoji: needsPause ? "⏸️" : "✓",
      confidence: 1,
      flags: needsPause ? ["potential-escalation"] : [],
      rewordingSuggestion: needsPause
        ? "Please confirm the practical details when you can."
        : null,
      originalMessage: normalized,
      ces: null,
    };
  }
}

export function createFoundationApi(
  config: PeacePadEnvironmentConfig,
): PeacePadFoundationApi {
  return config.environment === "lab"
    ? new SyntheticLabFoundationApi()
    : new PeacePadApiClient(config);
}
