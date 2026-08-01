import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { GuestSessionResponse } from "../api/contracts";
import type { PeacePadFoundationApi } from "../api/PeacePadApiClient";
import type { GuestSessionStore, StoredGuestSession } from "../session/secureGuestSession";
import { FoundationScreen } from "./FoundationScreen";

const sessionResponse: GuestSessionResponse = {
  guestSessionId: "guest-session-1",
  sessionId: "session-1",
  guestId: "guest-1",
  expiresAt: "2099-01-01T00:00:00.000Z"
};

function createHarness(stored: StoredGuestSession | null = null) {
  const api: jest.Mocked<PeacePadFoundationApi> = {
    previewMessage: jest.fn(async (_content: string) => ({ tone: "clear", summary: "Clear." })),
    startGuest: jest.fn(async (_input: Parameters<PeacePadFoundationApi["startGuest"]>[0]) => sessionResponse)
  };
  const sessionStore: jest.Mocked<GuestSessionStore> = {
    clear: jest.fn(async () => undefined),
    read: jest.fn(async () => stored),
    save: jest.fn(async (_session: StoredGuestSession) => undefined)
  };
  return { api, sessionStore };
}

describe("PeacePad welcome and consent", () => {
  it("shows the conch brand and creates no session on welcome", async () => {
    const { api, sessionStore } = createHarness();
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);
    expect(await screen.findByLabelText("PeacePad conch logo")).toBeOnTheScreen();
    expect(screen.getByText("A calmer way through hard co-parenting moments.")).toBeOnTheScreen();
    expect(api.startGuest).not.toHaveBeenCalled();
    expect(sessionStore.save).not.toHaveBeenCalled();
  });

  it("keeps account messaging concise without creating a session", async () => {
    const { api, sessionStore } = createHarness();
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);
    fireEvent.press(await screen.findByText("Existing account"));
    expect(screen.getByText("Sign-in is temporarily unavailable. You can continue as a guest.")).toBeOnTheScreen();
    expect(api.startGuest).not.toHaveBeenCalled();
  });

  it("requires explicit consent and keeps optional AI off", async () => {
    const { api, sessionStore } = createHarness();
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);
    fireEvent.press(await screen.findByText("Try PeacePad"));
    expect(screen.getByLabelText("Optional AI-assisted rewrites")).not.toBeChecked();
    expect(screen.getByText("Continue as guest")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("I agree to the Terms"));
    fireEvent.press(screen.getByLabelText("I acknowledge the Privacy Policy"));
    fireEvent.press(screen.getByText("Continue as guest"));
    await waitFor(() => expect(api.startGuest).toHaveBeenCalledWith({ requiredConsentAccepted: true, aiMessageConsent: false }));
    expect(sessionStore.save).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-1" }));
    expect(await screen.findByText("You’re ready")).toBeOnTheScreen();
  });

  it("restores a valid device session", async () => {
    const stored: StoredGuestSession = {
      sessionId: "stored-session",
      guestId: "stored-guest",
      expiresAt: "2099-01-01T00:00:00.000Z",
      consent: { termsAccepted: true, privacyAcknowledged: true, aiMessageConsent: false }
    };
    const { api, sessionStore } = createHarness(stored);
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);
    await waitFor(() => expect(api.startGuest).toHaveBeenCalledWith({
      existingSessionId: "stored-session",
      requiredConsentAccepted: true,
      aiMessageConsent: false
    }));
    expect(await screen.findByText("Welcome back.")).toBeOnTheScreen();
  });
});
