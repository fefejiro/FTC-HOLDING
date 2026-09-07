import { taskCopy } from "./taskLocalization";

describe("task localization", () => {
  it("covers the customer-facing task copy in every supported locale", () => {
    const french = taskCopy("fr");
    expect(french.title).toBe("Tâches");
    expect(french.due("2026-08-27")).toContain("2026-08-27");
    expect(french.invalidDate).toContain("AAAA-MM-JJ");

    const spanish = taskCopy("es");
    expect(spanish.title).toBe("Tareas");
    expect(spanish.due("2026-08-27")).toContain("2026-08-27");
    expect(spanish.required).toContain("tarea");

    const english = taskCopy("en");
    expect(english.due("2026-08-27")).toBe("Due 2026-08-27");
  });
});
