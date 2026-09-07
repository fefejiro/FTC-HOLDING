import { callText } from "./callLocalization";

describe("call localization", () => {
  it("provides complete English, French, and Spanish call controls", () => {
    for (const locale of ["en", "fr", "es"] as const) {
      expect(callText(locale, "title")).toBeTruthy();
      expect(callText(locale, "start")).toBeTruthy();
      expect(callText(locale, "accept")).toBeTruthy();
      expect(callText(locale, "decline")).toBeTruthy();
      expect(callText(locale, "end")).toBeTruthy();
      expect(callText(locale, "unavailable")).toBeTruthy();
    }
    expect(callText("fr", "title")).toBe("Appel audio");
    expect(callText("es", "title")).toBe("Llamada de audio");
  });
});
