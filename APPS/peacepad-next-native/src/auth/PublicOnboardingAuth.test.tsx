import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { LocalizationProvider } from "../localization/LocalizationProvider";
import { useSupabaseSession } from "../session/SupabaseSessionProvider";
import { PublicOnboardingAuth } from "./PublicOnboardingAuth";
import { requestGoogleIdentityToken } from "./GoogleNativeAuth";
import { useAuthCapabilities } from "./AuthCapabilities";

jest.mock("../session/SupabaseSessionProvider", () => ({ useSupabaseSession: jest.fn() }));
jest.mock("./GoogleNativeAuth", () => ({ requestGoogleIdentityToken: jest.fn() }));
jest.mock("./AuthCapabilities", () => ({ useAuthCapabilities: jest.fn() }));
const sessionValue = (overrides: Record<string, unknown> = {}) => ({
  status: "signed-out",
  authIntent: "default",
  session: undefined,
  error: undefined,
  getAccessToken: jest.fn(),
  signInWithPassword: jest.fn(async () => undefined),
  signUpWithPassword: jest.fn(async () => ({ confirmationRequired: true })),
  signInWithApple: jest.fn(async () => undefined),
  signInWithGoogle: jest.fn(async () => undefined),
  sendPasswordReset: jest.fn(async () => undefined),
  updatePassword: jest.fn(async () => undefined),
  signOut: jest.fn(async () => undefined),
  ...overrides
});

const enabledCapabilities = () => ({
  status: "ready",
  email: { nativeAvailable: true, appConfigured: true, backend: "enabled", available: true },
  google: { nativeAvailable: true, appConfigured: true, backend: "enabled", available: true },
  apple: { nativeAvailable: true, appConfigured: true, backend: "enabled", available: true },
  refresh: jest.fn(async () => undefined)
});

describe("PublicOnboardingAuth", () => {
  const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    secureStore.getItemAsync.mockResolvedValue(null);
    (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    jest.spyOn(Crypto, "randomUUID").mockReturnValue("raw-nonce");
    jest.spyOn(Crypto, "digestStringAsync").mockResolvedValue("hashed-nonce");
    (useSupabaseSession as jest.Mock).mockReturnValue(sessionValue());
    (useAuthCapabilities as jest.Mock).mockReturnValue(enabledCapabilities());
    (requestGoogleIdentityToken as jest.Mock).mockResolvedValue(undefined);
  });

  it("opens with a short, warm first-run introduction and no staging language", async () => {
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    expect(await screen.findByText("A calmer way to coordinate parenting")).toBeTruthy();
    expect(screen.getByText("Communicate with care, even when the moment is difficult.")).toBeTruthy();
    expect(screen.queryByText(/staging|Canada|stored in/i)).toBeNull();
  });

  it("lets a new user create an account and explains email confirmation", async () => {
    const signUpWithPassword = jest.fn(async () => ({ confirmationRequired: true }));
    (useSupabaseSession as jest.Mock).mockReturnValue(sessionValue({ signUpWithPassword }));
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    fireEvent.press(await screen.findByText("Skip"));
    fireEvent.changeText(await screen.findByLabelText("Email"), "  new.parent@example.com  ");
    fireEvent.changeText(screen.getByLabelText("Password"), "calmer-password");
    fireEvent.press(screen.getByText("Create account"));
    await waitFor(() => expect(signUpWithPassword).toHaveBeenCalledWith("new.parent@example.com", "calmer-password"));
    expect(await screen.findByText("Check your email")).toBeTruthy();
  });

  it("keeps existing account sign-in available without making it the only path", async () => {
    secureStore.getItemAsync.mockResolvedValue("true");
    const signInWithPassword = jest.fn(async () => undefined);
    (useSupabaseSession as jest.Mock).mockReturnValue(sessionValue({ signInWithPassword }));
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    fireEvent.press(await screen.findByText("Sign in"));
    fireEvent.changeText(screen.getByLabelText("Email"), "parent@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "calmer-password");
    fireEvent.press(screen.getAllByText("Sign in")[0]);
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith("parent@example.com", "calmer-password"));
  });

  it("explains invalid credentials without exposing provider details", async () => {
    secureStore.getItemAsync.mockResolvedValue("true");
    const signInWithPassword = jest.fn(async () => {
      throw { code: "invalid_credentials", status: 400, message: "Invalid login credentials" };
    });
    (useSupabaseSession as jest.Mock).mockReturnValue(sessionValue({ signInWithPassword }));
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    fireEvent.press(await screen.findByText("Sign in"));
    fireEvent.changeText(screen.getByLabelText("Email"), "parent@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "wrong-password");
    fireEvent.press(screen.getAllByText("Sign in")[0]);
    expect(await screen.findByText("That email or password did not match. Check it and try again.")).toBeTruthy();
  });

  it("reports a provider outage when the protected public key is rejected", async () => {
    secureStore.getItemAsync.mockResolvedValue("true");
    const signInWithPassword = jest.fn(async () => {
      throw { code: "invalid_api_key", status: 401, message: "Invalid API key" };
    });
    (useSupabaseSession as jest.Mock).mockReturnValue(sessionValue({ signInWithPassword }));
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    fireEvent.press(await screen.findByText("Sign in"));
    fireEvent.changeText(screen.getByLabelText("Email"), "parent@example.com");
    fireEvent.changeText(screen.getByLabelText("Password"), "calmer-password");
    fireEvent.press(screen.getAllByText("Sign in")[0]);
    expect(await screen.findByText("PeacePad sign-in is temporarily unavailable. Please try again shortly.")).toBeTruthy();
  });

  it("keeps the full account flow while clearly identifying fictional staging", async () => {
    secureStore.getItemAsync.mockResolvedValue("true");
    render(
      <LocalizationProvider initialLocale="en" production>
        <PublicOnboardingAuth environmentNotice={{
          label: "Canada staging",
          body: "Use fictional test accounts only.",
          labelTestID: "staging-region-label"
        }} />
      </LocalizationProvider>
    );
    expect(await screen.findByTestId("staging-region-label")).toHaveTextContent("Canada staging");
    expect(screen.getByText("Use fictional test accounts only.")).toBeTruthy();
    expect(screen.getByText("Create your PeacePad account")).toBeTruthy();
  });

  it("uses the native Apple credential only when Apple returns an identity token", async () => {
    secureStore.getItemAsync.mockResolvedValue("true");
    const signInWithApple = jest.fn(async () => undefined);
    (useSupabaseSession as jest.Mock).mockReturnValue(sessionValue({ signInWithApple }));
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
      identityToken: "apple-identity-token",
      fullName: { givenName: "Peace", familyName: "Parent" }
    });
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    fireEvent.press(await screen.findByLabelText("Continue with Apple"));
    await waitFor(() => expect(signInWithApple).toHaveBeenCalledWith("apple-identity-token", "raw-nonce", "Peace Parent"));
    expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith(expect.objectContaining({ nonce: "hashed-nonce" }));
  });

  it("passes only the native Google ID token to the Supabase session boundary", async () => {
    secureStore.getItemAsync.mockResolvedValue("true");
    const signInWithGoogle = jest.fn(async () => undefined);
    (useSupabaseSession as jest.Mock).mockReturnValue(sessionValue({ signInWithGoogle }));
    (requestGoogleIdentityToken as jest.Mock).mockResolvedValue("google-id-token");
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    fireEvent.press(await screen.findByText("Continue with Google"));
    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalledWith("google-id-token"));
  });

  it("hides Google without blocking email and Apple when OAuth is unavailable", async () => {
    (useAuthCapabilities as jest.Mock).mockReturnValue({
      ...enabledCapabilities(),
      google: { nativeAvailable: true, appConfigured: true, backend: "disabled", available: false }
    });
    secureStore.getItemAsync.mockResolvedValue("true");
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    expect(await screen.findByLabelText("Email")).toBeTruthy();
    expect(screen.queryByText("Continue with Google")).toBeNull();
    expect(screen.getByLabelText("Continue with Apple")).toBeTruthy();
    expect(screen.getByText("Sign in with Google is not available right now.")).toBeTruthy();
  });

  it("keeps email available while social providers fail closed during a status outage", async () => {
    secureStore.getItemAsync.mockResolvedValue("true");
    const refresh = jest.fn(async () => undefined);
    (useAuthCapabilities as jest.Mock).mockReturnValue({
      status: "error",
      email: { nativeAvailable: true, appConfigured: true, backend: "unknown", available: false },
      google: { nativeAvailable: true, appConfigured: true, backend: "unknown", available: false },
      apple: { nativeAvailable: true, appConfigured: true, backend: "unknown", available: false },
      refresh
    });
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    expect(await screen.findByLabelText("Email")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Email"), "fictional.parent@example.test");
    fireEvent.changeText(screen.getByLabelText("Password"), "fictional-password");
    expect(screen.getByRole("button", { name: "Create account" }).props.accessibilityState).toEqual({ disabled: false });
    fireEvent.press(screen.getByText("Retry sign-in options"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("finishes a password-recovery callback before entering the family runtime", async () => {
    const updatePassword = jest.fn(async () => undefined);
    (useSupabaseSession as jest.Mock).mockReturnValue(sessionValue({
      authIntent: "password-recovery",
      status: "ready",
      updatePassword
    }));
    render(<LocalizationProvider initialLocale="en" production><PublicOnboardingAuth /></LocalizationProvider>);
    fireEvent.changeText(screen.getByLabelText("New password"), "new-calm-password");
    fireEvent.press(screen.getByText("Save new password"));
    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith("new-calm-password"));
  });

  it.each([
    ["fr", "Une façon plus calme de coordonner la parentalité"],
    ["es", "Una forma más tranquila de coordinar la crianza"]
  ])("localizes the first public introduction in %s", async (locale, title) => {
    render(<LocalizationProvider initialLocale={locale} production><PublicOnboardingAuth /></LocalizationProvider>);
    expect(await screen.findByText(title)).toBeTruthy();
  });
});
