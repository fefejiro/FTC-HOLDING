import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { LocalizationProvider } from "../localization/LocalizationProvider";
import { useOptionalSupabaseSession } from "../session/SupabaseSessionProvider";
import { requestGoogleIdentityCredential } from "./GoogleNativeAuth";
import { LinkedSignInMethods } from "./LinkedSignInMethods";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

jest.mock("../session/SupabaseSessionProvider", () => ({
  useOptionalSupabaseSession: jest.fn()
}));
jest.mock("./GoogleNativeAuth", () => ({
  requestGoogleIdentityCredential: jest.fn()
}));
jest.mock("expo-apple-authentication", () => ({
  AppleAuthenticationScope: { EMAIL: 0 },
  signInAsync: jest.fn()
}));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  randomUUID: jest.fn(() => "fresh-apple-nonce"),
  digestStringAsync: jest.fn(async () => "hashed-apple-nonce")
}));

const credential = { idToken: "google-id", accessToken: "google-access", providerSubject: "google-subject" };

describe("LinkedSignInMethods", () => {
  const previousPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    (requestGoogleIdentityCredential as jest.Mock).mockResolvedValue(credential);
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: "apple-id", user: "apple-subject" });
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: previousPlatform });
  });

  it("links and removes Google only after a fresh native provider challenge", async () => {
    let linked = false;
    const auth = {
      status: "ready",
      getLinkedProviders: jest.fn(async () => linked ? ["email", "google"] : ["email"]),
      linkProvider: jest.fn(async () => { linked = true; }),
      unlinkProvider: jest.fn(async () => { linked = false; })
    };
    (useOptionalSupabaseSession as jest.Mock).mockReturnValue(auth);
    render(<LocalizationProvider initialLocale="en"><LinkedSignInMethods /></LocalizationProvider>);

    await waitFor(() => expect(screen.getByText("Google · Not linked")).toBeOnTheScreen());
    fireEvent.press(screen.getByRole("button", { name: "Link" }));
    await waitFor(() => expect(auth.linkProvider).toHaveBeenCalledWith("google", { token: "google-id", accessToken: "google-access" }));
    await waitFor(() => expect(screen.getByText("Google · Linked")).toBeOnTheScreen());

    fireEvent.press(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText("Remove this sign-in method?")).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "Remove" })));
    await waitFor(() => expect(auth.unlinkProvider).toHaveBeenCalledWith("google", "google-subject"));
    expect(requestGoogleIdentityCredential).toHaveBeenCalledTimes(2);
  });

  it("does not expose account-provider controls outside an authenticated session", () => {
    (useOptionalSupabaseSession as jest.Mock).mockReturnValue(undefined);
    render(<LocalizationProvider initialLocale="en"><LinkedSignInMethods /></LocalizationProvider>);
    expect(screen.queryByText("Sign-in methods")).toBeNull();
  });

  it("links Apple on iOS only after a fresh nonce-bound Apple challenge", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    let linked = false;
    const auth = {
      status: "ready",
      getLinkedProviders: jest.fn(async () => linked ? ["email", "apple"] : ["email"]),
      linkProvider: jest.fn(async () => { linked = true; }),
      unlinkProvider: jest.fn()
    };
    (useOptionalSupabaseSession as jest.Mock).mockReturnValue(auth);
    render(<LocalizationProvider initialLocale="en"><LinkedSignInMethods /></LocalizationProvider>);

    await waitFor(() => expect(screen.getByText(/Apple.*Not linked/)).toBeOnTheScreen());
    const linkButtons = screen.getAllByRole("button", { name: "Link" });
    fireEvent.press(linkButtons[0]);

    await waitFor(() => expect(auth.linkProvider).toHaveBeenCalledWith("apple", {
      token: "apple-id",
      nonce: "fresh-apple-nonce"
    }));
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith("SHA-256", "fresh-apple-nonce");
    expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({ nonce: "hashed-apple-nonce", requestedScopes: [0] });
  });

  it("treats a canceled provider sheet as a quiet opt-out", async () => {
    const auth = {
      status: "ready",
      getLinkedProviders: jest.fn(async () => ["email"]),
      linkProvider: jest.fn(),
      unlinkProvider: jest.fn()
    };
    (requestGoogleIdentityCredential as jest.Mock).mockResolvedValue(undefined);
    (useOptionalSupabaseSession as jest.Mock).mockReturnValue(auth);
    render(<LocalizationProvider initialLocale="en"><LinkedSignInMethods /></LocalizationProvider>);

    await waitFor(() => expect(screen.getByText(/Google.*Not linked/)).toBeOnTheScreen());
    fireEvent.press(screen.getByRole("button", { name: "Link" }));
    await waitFor(() => expect(requestGoogleIdentityCredential).toHaveBeenCalledTimes(1));
    expect(auth.linkProvider).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("presents a localized safe error when linked methods cannot be loaded", async () => {
    (useOptionalSupabaseSession as jest.Mock).mockReturnValue({
      status: "ready",
      getLinkedProviders: jest.fn(async () => { throw new Error("provider detail"); }),
      linkProvider: jest.fn(),
      unlinkProvider: jest.fn()
    });
    render(<LocalizationProvider initialLocale="fr"><LinkedSignInMethods /></LocalizationProvider>);

    await waitFor(() => expect(screen.getByRole("alert")).toBeOnTheScreen());
    expect(screen.getByRole("alert")).not.toHaveTextContent("provider detail");
  });
});
