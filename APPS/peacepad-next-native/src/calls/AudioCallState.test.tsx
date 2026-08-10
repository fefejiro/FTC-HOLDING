import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SyntheticCoordinationApi } from "../api/SyntheticCoordinationApi";
import { LocalizationProvider } from "../localization/LocalizationProvider";
import { AudioCallScreen } from "./AudioCallScreen";
import { AudioCallStateProvider } from "./AudioCallState";

describe("foreground audio-call state UI", () => {
  it("starts and cancels only a verified lifecycle call while media remains truthfully unavailable", async () => {
    const api = new SyntheticCoordinationApi();
    const create = jest.spyOn(api, "createAudioCall");
    render(
      <LocalizationProvider initialLocale="en">
        <AudioCallStateProvider api={api}>
          <AudioCallScreen />
        </AudioCallStateProvider>
      </LocalizationProvider>
    );

    await waitFor(() => expect(screen.getByText("No call in progress")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Start audio call" }));
    fireEvent.press(screen.getByRole("button", { name: "Start audio call" }));
    await waitFor(() => expect(screen.getByText("Calling your co-parent")).toBeTruthy());
    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Audio connection is not enabled in this build yet.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Cancel call" }));
    await waitFor(() => expect(screen.getByText("Call ended")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Start audio call" })).toBeTruthy();
  });

  it("renders Spanish semantic call controls without changing backend identifiers", async () => {
    render(
      <LocalizationProvider initialLocale="es">
        <AudioCallStateProvider api={new SyntheticCoordinationApi()}>
          <AudioCallScreen />
        </AudioCallStateProvider>
      </LocalizationProvider>
    );
    await waitFor(() => expect(screen.getByRole("header", { name: "Llamada de audio" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Iniciar llamada de audio" })).toBeTruthy();
  });
});
