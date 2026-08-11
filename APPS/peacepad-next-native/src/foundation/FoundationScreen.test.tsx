import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type {
  GuestSessionResponse,
  MessagePreviewResponse
} from "../api/contracts";
import type { PeacePadFoundationApi } from "../api/PeacePadApiClient";
import type {
  GuestSessionStore,
  StoredGuestSession
} from "../session/secureGuestSession";
import { FoundationScreen } from "./FoundationScreen";
import { LocalizationProvider } from "../localization/LocalizationProvider";

const sessionResponse: GuestSessionResponse = {
  guestSessionId: "guest-session-1",
  sessionId: "session-1",
  guestId: "guest-1",
  expiresAt: "2099-01-01T00:00:00.000Z"
};

const previewResponse: MessagePreviewResponse = {
  tone: "neutral",
  summary: "The message is factual."
};

function createHarness(stored: StoredGuestSession | null = null) {
  const api: jest.Mocked<PeacePadFoundationApi> = {
    previewMessage: jest.fn(async (_content: string) => previewResponse),
    startGuest: jest.fn(
      async (_input: Parameters<PeacePadFoundationApi["startGuest"]>[0]) =>
        sessionResponse
    )
  };
  const sessionStore: jest.Mocked<GuestSessionStore> = {
    clear: jest.fn(async () => undefined),
    read: jest.fn(async () => stored),
    save: jest.fn(async (_session: StoredGuestSession) => undefined)
  };

  return { api, sessionStore };
}

describe("PeacePad native foundation", () => {
  it.each([
    ["fr", "Essayer PeacePad", "Vos choix passent en premier", "Réécritures facultatives assistées par IA"],
    ["es", "Probar PeacePad", "Tus decisiones son lo primero", "Reescrituras opcionales asistidas por IA"]
  ])("localizes consent while preserving default-off AI semantics in %s", async (locale, tryLabel, consentTitle, aiLabel) => {
    const { api, sessionStore } = createHarness();
    render(<LocalizationProvider initialLocale={locale}><FoundationScreen api={api} sessionStore={sessionStore} /></LocalizationProvider>);
    fireEvent.press(await screen.findByText(tryLabel));
    expect(screen.getByText(consentTitle)).toBeOnTheScreen();
    expect(screen.getByLabelText(aiLabel)).not.toBeChecked();
    expect(api.startGuest).not.toHaveBeenCalled();
  });

  it.each([
    ["fr", "Essayer PeacePad", "J’accepte les conditions d’utilisation", "Je reconnais avoir lu la politique de confidentialité", "Continuer en tant qu’invité", "Vérifiez votre message avant de l’envoyer", "Brouillon du message", "Vérifier le message", "Réinitialiser la session de cet appareil"],
    ["es", "Probar PeacePad", "Acepto los Términos", "Reconozco la Política de privacidad", "Continuar como invitado", "Revisa tu mensaje antes de enviarlo", "Borrador del mensaje", "Revisar mensaje", "Restablecer la sesión de este dispositivo"]
  ])("localizes the compose and recovery surface with heading semantics in %s", async (locale, tryLabel, terms, privacy, continueLabel, title, draftLabel, checkLabel, resetLabel) => {
    const { api, sessionStore } = createHarness();
    render(<LocalizationProvider initialLocale={locale}><FoundationScreen api={api} sessionStore={sessionStore} /></LocalizationProvider>);
    fireEvent.press(await screen.findByText(tryLabel));
    fireEvent.press(screen.getByLabelText(terms));
    fireEvent.press(screen.getByLabelText(privacy));
    fireEvent.press(screen.getByText(continueLabel));
    expect(await screen.findByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByLabelText(draftLabel)).toBeOnTheScreen();
    expect(screen.getByText(checkLabel)).toBeOnTheScreen();
    expect(screen.getByText(resetLabel)).toBeOnTheScreen();
  });

  it("shows the real conch brand and creates no session on welcome", async () => {
    const { api, sessionStore } = createHarness();
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);

    expect(await screen.findByLabelText("PeacePad conch logo")).toBeOnTheScreen();
    expect(
      screen.getByText("A calmer way through hard co-parenting moments.")
    ).toBeOnTheScreen();
    expect(api.startGuest).not.toHaveBeenCalled();
    expect(sessionStore.save).not.toHaveBeenCalled();
  });

  it("keeps existing-account access as a clear unavailable state", async () => {
    const { api, sessionStore } = createHarness();
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);

    fireEvent.press(await screen.findByText("Existing account"));
    expect(
      screen.getByText("Account sign-in is not available yet.")
    ).toBeOnTheScreen();
    expect(api.startGuest).not.toHaveBeenCalled();
    expect(sessionStore.save).not.toHaveBeenCalled();
  });

  it("requests a scroll reset when the foundation phase changes", async () => {
    const { api, sessionStore } = createHarness();
    const onPhaseChange = jest.fn();
    render(
      <FoundationScreen
        api={api}
        sessionStore={sessionStore}
        onPhaseChange={onPhaseChange}
      />
    );

    fireEvent.press(await screen.findByText("Try PeacePad"));
    await waitFor(() => expect(onPhaseChange).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Your choices come first")).toBeOnTheScreen();
  });

  it("requires explicit consent and keeps AI consent off by default", async () => {
    const { api, sessionStore } = createHarness();
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);

    fireEvent.press(await screen.findByText("Try PeacePad"));
    expect(screen.getByLabelText("Optional AI-assisted rewrites")).not.toBeChecked();
    expect(screen.getByText("Continue as guest")).toBeDisabled();

    fireEvent.press(screen.getByLabelText("I agree to the Terms"));
    fireEvent.press(screen.getByLabelText("I acknowledge the Privacy Policy"));
    fireEvent.press(screen.getByText("Continue as guest"));

    await waitFor(() =>
      expect(api.startGuest).toHaveBeenCalledWith({
        requiredConsentAccepted: true,
        aiMessageConsent: false
      })
    );
    expect(sessionStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        guestId: "guest-1",
        consent: {
          termsAccepted: true,
          privacyAcknowledged: true,
          aiMessageConsent: false
        }
      })
    );
    expect(
      await screen.findByText("Check your message before sending")
    ).toBeOnTheScreen();
  });

  it("restores a valid device session and refreshes it through staging", async () => {
    const stored: StoredGuestSession = {
      sessionId: "stored-session",
      guestId: "stored-guest",
      expiresAt: "2099-01-01T00:00:00.000Z",
      consent: {
        termsAccepted: true,
        privacyAcknowledged: true,
        aiMessageConsent: false
      }
    };
    const { api, sessionStore } = createHarness(stored);
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);

    await waitFor(() =>
      expect(api.startGuest).toHaveBeenCalledWith({
        existingSessionId: "stored-session",
        requiredConsentAccepted: true,
        aiMessageConsent: false
      })
    );
    expect(
      await screen.findByText("Your private guest session was restored on this device.")
    ).toBeOnTheScreen();
  });

  it("previews a message without enabling production writes", async () => {
    const { api, sessionStore } = createHarness();
    render(<FoundationScreen api={api} sessionStore={sessionStore} />);

    fireEvent.press(await screen.findByText("Try PeacePad"));
    fireEvent.press(screen.getByLabelText("I agree to the Terms"));
    fireEvent.press(screen.getByLabelText("I acknowledge the Privacy Policy"));
    fireEvent.press(screen.getByText("Continue as guest"));
    await screen.findByText("Check your message before sending");

    fireEvent.changeText(
      screen.getByLabelText("Message draft"),
      "Pickup is at 5 PM."
    );
    fireEvent.press(screen.getByText("Check message"));

    await waitFor(() =>
      expect(api.previewMessage).toHaveBeenCalledWith("Pickup is at 5 PM.")
    );
    expect(await screen.findByText("The message is factual.")).toBeOnTheScreen();
  });
});
