import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { GuestSessionResponse } from "../api/contracts";
import type { PeacePadFoundationApi } from "../api/PeacePadApiClient";
import type { GuestSessionStore, StoredGuestSession } from "../session/secureGuestSession";
import type { StagingSessionStore, StoredStagingSession } from "../session/secureStagingSession";
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

  it("verifies staging access before consent and stores it only after consent", async () => {
    const { api, sessionStore } = createHarness();
    const stagingSessionStore: jest.Mocked<StagingSessionStore> = {
      clear: jest.fn(async () => undefined),
      read: jest.fn(async () => null),
      save: jest.fn(async (_session: StoredStagingSession) => undefined)
    };
    const verifySession = jest.fn(async () => ({
      identityId: "synthetic-owner",
      displayName: "Alex Example",
      familyIds: ["family-staging"]
    }));
    render(
      <FoundationScreen
        api={api}
        environment="staging"
        sessionStore={sessionStore}
        stagingSessionStore={stagingSessionStore}
        verifySession={verifySession}
      />
    );
    fireEvent.press(await screen.findByText("Existing account"));
    fireEvent.changeText(screen.getByLabelText("Secure access key"), "a".repeat(48));
    fireEvent.press(screen.getByText("Continue securely"));
    await waitFor(() => expect(verifySession).toHaveBeenCalledWith("a".repeat(48)));
    expect(stagingSessionStore.save).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("I agree to the Terms"));
    fireEvent.press(screen.getByLabelText("I acknowledge the Privacy Policy"));
    fireEvent.press(screen.getByText("Continue securely"));
    await waitFor(() => expect(stagingSessionStore.save).toHaveBeenCalledWith(expect.objectContaining({
      accessToken: "a".repeat(48),
      actorIdentityId: "synthetic-owner",
      actorDisplayName: "Alex Example",
      consent: { termsAccepted: true, privacyAcknowledged: true, aiMessageConsent: false }
    })));
    expect(api.startGuest).not.toHaveBeenCalled();
  });

  it("re-verifies a saved staging session before restoring account access", async () => {
    const { api, sessionStore } = createHarness();
    const stored: StoredStagingSession = {
      accessToken: "b".repeat(48),
      actorIdentityId: "stale-identity-is-not-trusted",
      actorDisplayName: "Saved name is not trusted",
      consent: { termsAccepted: true, privacyAcknowledged: true, aiMessageConsent: false },
      savedAt: "2026-08-04T12:00:00.000Z"
    };
    const stagingSessionStore: jest.Mocked<StagingSessionStore> = {
      clear: jest.fn(async () => undefined),
      read: jest.fn(async () => stored),
      save: jest.fn(async (_session: StoredStagingSession) => undefined)
    };
    const verifySession = jest.fn(async () => ({
      identityId: "synthetic-owner",
      displayName: "Alex Example",
      familyIds: ["family-staging"]
    }));

    render(
      <FoundationScreen
        api={api}
        environment="staging"
        sessionStore={sessionStore}
        stagingSessionStore={stagingSessionStore}
        verifySession={verifySession}
      />
    );

    await waitFor(() => expect(verifySession).toHaveBeenCalledWith(stored.accessToken));
    expect(stagingSessionStore.save).toHaveBeenCalledWith(expect.objectContaining({
      actorIdentityId: "synthetic-owner",
      actorDisplayName: "Alex Example"
    }));
    expect(await screen.findByText("Welcome back, Alex Example.")).toBeOnTheScreen();
    expect(screen.getByText("You’re ready")).toBeOnTheScreen();
    expect(api.startGuest).not.toHaveBeenCalled();
  });

  it("clears a rejected saved staging session and returns to welcome", async () => {
    const { api, sessionStore } = createHarness();
    const stagingSessionStore: jest.Mocked<StagingSessionStore> = {
      clear: jest.fn(async () => undefined),
      read: jest.fn(async () => ({
        accessToken: "c".repeat(48),
        actorIdentityId: "synthetic-owner",
        actorDisplayName: "Alex Example",
        consent: { termsAccepted: true, privacyAcknowledged: true, aiMessageConsent: false },
        savedAt: "2026-08-04T12:00:00.000Z"
      })),
      save: jest.fn(async (_session: StoredStagingSession) => undefined)
    };
    const verifySession = jest.fn(async () => {
      throw new Error("rejected");
    });

    render(
      <FoundationScreen
        api={api}
        environment="staging"
        sessionStore={sessionStore}
        stagingSessionStore={stagingSessionStore}
        verifySession={verifySession}
      />
    );

    await waitFor(() => expect(stagingSessionStore.clear).toHaveBeenCalled());
    expect(await screen.findByText("A calmer way through hard co-parenting moments.")).toBeOnTheScreen();
    expect(api.startGuest).not.toHaveBeenCalled();
  });
});
