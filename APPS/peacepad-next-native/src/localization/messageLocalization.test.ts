import { messageText } from "./messageLocalization";

it("provides core send and recovery actions in every supported locale", () => {
  expect(messageText("en", "sendOriginal")).toBe("Send original");
  expect(messageText("fr", "tryAgain")).toBe("Réessayer");
  expect(messageText("es", "remove")).toBe("Eliminar de este dispositivo");
});
