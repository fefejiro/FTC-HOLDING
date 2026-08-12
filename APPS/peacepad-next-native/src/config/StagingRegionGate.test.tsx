import React from "react";
import * as SecureStore from "expo-secure-store";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { LocalizationProvider } from "../localization/LocalizationProvider";
import type { PeacePadSupabaseConfig } from "./environment";
import { secureStagingRegionStore, StagingRegionGate, type StagingRegionStore } from "./StagingRegionGate";

const configs: readonly PeacePadSupabaseConfig[] = [
  {
    region: "ca",
    projectRef: "rohvkyuxbnqzglaromms",
    projectUrl: "https://rohvkyuxbnqzglaromms.supabase.co",
    apiBaseUrl: "https://rohvkyuxbnqzglaromms.supabase.co/functions/v1/peacepad-v2-api",
    publishableKey: "sb_publishable_fictional_ca"
  },
  {
    region: "us",
    projectRef: "spmpndalcvwmygznihec",
    projectUrl: "https://spmpndalcvwmygznihec.supabase.co",
    apiBaseUrl: "https://spmpndalcvwmygznihec.supabase.co/functions/v1/peacepad-v2-api",
    publishableKey: "sb_publishable_fictional_us"
  }
];

function createStore(stored: string | null = null) {
  const save = jest.fn(async () => undefined);
  const store: StagingRegionStore = { read: jest.fn(async () => stored), save };
  return { save, store };
}

describe("StagingRegionGate", () => {
  it("stores only the non-secret regional preference in device-only secure storage", async () => {
    await secureStagingRegionStore.save("ca");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "peacepad_v2_staging_region",
      "ca",
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
    await secureStagingRegionStore.read();
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("peacepad_v2_staging_region");
  });

  it("requires an explicit choice before creating a regional runtime and persists only the region", async () => {
    const onSelect = jest.fn();
    const { save, store } = createStore();
    render(<LocalizationProvider initialLocale="en"><StagingRegionGate configs={configs} onSelect={onSelect} store={store} /></LocalizationProvider>);

    expect(screen.getByRole("radio", { name: "Canada staging" }).props.accessibilityState).toEqual({ checked: true });
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("radio", { name: "United States staging" }));
    expect(screen.getByRole("radio", { name: "United States staging" }).props.accessibilityState).toEqual({ checked: true });
    fireEvent.press(screen.getByRole("button", { name: "Continue to United States staging" }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(configs[1]));
    expect(save).toHaveBeenCalledWith("us");
  });

  it("restores a valid preference but still waits for explicit confirmation", async () => {
    const onSelect = jest.fn();
    const { store } = createStore("us");
    render(<LocalizationProvider initialLocale="en"><StagingRegionGate configs={configs} onSelect={onSelect} store={store} /></LocalizationProvider>);

    await waitFor(() => expect(screen.getByRole("radio", { name: "United States staging" }).props.accessibilityState).toEqual({ checked: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it.each([
    ["fr", "Choisissez votre région de données", "Environnement de test au Canada", "Continuer vers Environnement de test au Canada"],
    ["es", "Elige tu región de datos", "Entorno de pruebas de Canadá", "Continuar a Entorno de pruebas de Canadá"]
  ] as const)("localizes the semantic region gate in %s", (locale, title, canada, continueLabel) => {
    const { store } = createStore();
    render(<LocalizationProvider initialLocale={locale}><StagingRegionGate configs={configs} onSelect={jest.fn()} store={store} /></LocalizationProvider>);
    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: canada })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: continueLabel })).toBeOnTheScreen();
  });

  it("rejects a malformed directory instead of silently choosing a region", () => {
    const { store } = createStore();
    expect(() => render(<LocalizationProvider initialLocale="en"><StagingRegionGate configs={[configs[0]]} onSelect={jest.fn()} store={store} /></LocalizationProvider>)).toThrow("requires at least two verified staging regions");
  });
});
