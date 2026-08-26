import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { LocalizationProvider } from "../localization/LocalizationProvider";
import { SupportPanel } from "./SupportPanel";

describe("SupportPanel", () => {
  it.each([
    ["en", "Contact support", "Diagnostic ID: PP-100000000000"],
    ["fr", "Contacter le soutien", "Identifiant de diagnostic : PP-100000000000"],
    ["es", "Contactar con soporte", "ID de diagnóstico: PP-100000000000"]
  ] as const)("offers localized support in %s", async (locale, contact, diagnostic) => {
    const openUrl = jest.fn<Promise<void>, [string]>(async () => undefined);
    render(<LocalizationProvider initialLocale={locale}><SupportPanel openUrl={openUrl} /></LocalizationProvider>);

    expect(await screen.findByText(diagnostic)).toBeTruthy();
    fireEvent.press(screen.getByText(contact));
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining("mailto:support@peacepad.ca"));
  });

  it("opens only approved help, privacy, and safety destinations", async () => {
    const openUrl = jest.fn<Promise<void>, [string]>(async () => undefined);
    render(<LocalizationProvider initialLocale="en"><SupportPanel openUrl={openUrl} /></LocalizationProvider>);
    await screen.findByText("Diagnostic ID: PP-100000000000");

    fireEvent.press(screen.getByText("Help center"));
    fireEvent.press(screen.getByText("Privacy"));
    fireEvent.press(screen.getByText("Safety"));
    await waitFor(() => expect(openUrl).toHaveBeenCalledTimes(3));
    expect(openUrl.mock.calls.map(([url]) => url)).toEqual([
      "https://peacepad.ca/support",
      "https://peacepad.ca/privacy",
      "https://peacepad.ca/safety"
    ]);
  });

  it("announces a safe error when a destination cannot open", async () => {
    const openUrl = jest.fn<Promise<void>, [string]>(async () => { throw new Error("provider detail"); });
    render(<LocalizationProvider initialLocale="en"><SupportPanel openUrl={openUrl} /></LocalizationProvider>);
    fireEvent.press(screen.getByText("Help center"));
    expect(await screen.findByRole("alert")).toHaveTextContent("PeacePad could not open that link.");
  });
});
