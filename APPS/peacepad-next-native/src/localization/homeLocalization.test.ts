import { homeHeroText, homeText } from "./homeLocalization";

it("provides task and state summaries for all supported locales", () => {
  expect(homeText("en", "notConnected")).toBe("Not connected");
  expect(homeText("fr", "today")).toBe("Aujourd’hui");
  expect(homeText("es", "send")).toBe("Enviar un mensaje");
});

it("keeps the family-first greeting localized with an optional parent name", () => {
  expect(homeHeroText("en", "greetingNamed", "Alex")).toBe("Ready for today, Alex?");
  expect(homeHeroText("fr", "greeting")).toBe("Prêt pour aujourd’hui?");
  expect(homeHeroText("es", "impact")).toContain("Pequeños pasos");
});
