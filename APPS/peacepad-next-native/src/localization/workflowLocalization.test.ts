import { workflowText } from "./workflowLocalization";

it("translates calendar and records actions without changing inserted domain labels", () => {
  expect(workflowText("fr", "confirmShare")).toBe("Confirmer le partage");
  expect(workflowText("es", "noUpload")).toBe("No se subió ningún archivo.");
  expect(workflowText("en", "useCalendar", { name: "Parenting Time" })).toBe("Use Parenting Time calendar");
});
