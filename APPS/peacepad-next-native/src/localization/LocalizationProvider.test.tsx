import React from "react";
import { Pressable, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { LocalizationProvider, resolveSupportedLocale, translate, useLocalization, type LocaleStore, type SupportedLocale } from "./LocalizationProvider";

function Harness() {
  const { locale, setLocale, t } = useLocalization();
  return <><Text>{locale}</Text><Text>{t("navigation.home")}</Text><Pressable accessibilityRole="button" onPress={() => void setLocale("fr")}><Text>switch</Text></Pressable></>;
}

function ProductionHarness() {
  const { t } = useLocalization();
  return <><Text>{t("runtime.signInTitle")}</Text><Text>{t("runtime.signInBody")}</Text><Text>{t("account.delete")}</Text></>;
}

function createStore(stored: string | null = null) {
  const save = jest.fn<Promise<void>, [SupportedLocale]>(async () => undefined);
  const store: LocaleStore = { read: jest.fn(async () => stored), save };
  return { save, store };
}

describe("localization foundation", () => {
  it.each([["fr-CA", "fr"], ["es_US", "es"], ["en", "en"], ["de-DE", "en"], [undefined, "en"]])("resolves %s to a supported locale", (value, expected) => {
    expect(resolveSupportedLocale(value)).toBe(expected);
  });

  it("provides navigation labels in all supported languages", () => {
    expect(translate("en", "navigation.records")).toBe("Records");
    expect(translate("fr", "navigation.records")).toBe("Dossiers");
    expect(translate("es", "navigation.records")).toBe("Registros");
  });

  it("changes language immediately and persists the explicit choice", () => {
    const { save, store } = createStore();
    render(<LocalizationProvider initialLocale="en" store={store}><Harness /></LocalizationProvider>);
    fireEvent.press(screen.getByRole("button"));
    expect(screen.getByText("Accueil")).toBeOnTheScreen();
    expect(save).toHaveBeenCalledWith("fr");
  });

  it("restores a supported persisted choice", async () => {
    const { store } = createStore("es-MX");
    render(<LocalizationProvider store={store}><Harness /></LocalizationProvider>);
    expect(await screen.findByText("Inicio")).toBeOnTheScreen();
  });

  it("uses real-account copy only inside the explicit production provider", () => {
    const { store } = createStore();
    render(<LocalizationProvider initialLocale="en" production store={store}><ProductionHarness /></LocalizationProvider>);
    expect(screen.getByText("Sign in to PeacePad")).toBeOnTheScreen();
    expect(screen.getByText("Use your PeacePad account.")).toBeOnTheScreen();
    expect(screen.getByText("Delete account")).toBeOnTheScreen();
  });
});
