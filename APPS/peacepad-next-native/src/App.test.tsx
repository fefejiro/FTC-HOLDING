import React from "react";
import { render, screen } from "@testing-library/react-native";
import App, { PeacePadErrorBoundary } from "./App";

jest.mock("react-native-safe-area-context", () => {
  const ReactRuntime = require("react") as typeof React;
  const { View } = require("react-native") as typeof import("react-native");
  const SafeContainer = ({ children }: { children?: React.ReactNode }) =>
    ReactRuntime.createElement(View, null, children);
  return { SafeAreaProvider: SafeContainer, SafeAreaView: SafeContainer };
});

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device-only",
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined)
}));

describe("PeacePad isolated native foundation", () => {
  it("opens the consent-first welcome experience", async () => {
    render(<App />);
    expect(await screen.findByText("A calmer way through hard co-parenting moments.")).toBeOnTheScreen();
    expect(screen.getByText("Try PeacePad")).toBeOnTheScreen();
    expect(screen.getByText("Existing account")).toBeOnTheScreen();
  });

  it("contains a fail-closed render boundary", () => {
    function Broken(): React.JSX.Element {
      throw new Error("synthetic render failure");
    }
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    render(<PeacePadErrorBoundary><Broken /></PeacePadErrorBoundary>);
    expect(screen.getByText("PeacePad could not open this screen.")).toBeOnTheScreen();
    consoleError.mockRestore();
  });
});
