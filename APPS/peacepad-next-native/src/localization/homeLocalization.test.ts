import { homeText } from "./homeLocalization";

it("provides task and state summaries for all supported locales", () => {
  expect(homeText("en", "notConnected")).toBe("Not connected");
  expect(homeText("fr", "today")).toBe("Aujourd’hui");
  expect(homeText("es", "send")).toBe("Enviar un mensaje");
});
