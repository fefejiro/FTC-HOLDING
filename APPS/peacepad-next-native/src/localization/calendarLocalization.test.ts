import { calendarText, formatCalendarDate, formatCalendarDay } from "./calendarLocalization";

describe("calendar localization", () => {
  it("translates the calendar navigation foundation", () => {
    expect(calendarText("en", "month")).toBe("Month");
    expect(calendarText("fr", "week")).toBe("Semaine");
    expect(calendarText("es", "day")).toBe("Día");
  });

  it("formats the same UTC date for every supported locale", () => {
    const date = "2026-08-01T14:00:00.000Z";
    expect(formatCalendarDate("en", date, { month: "long", year: "numeric" })).toBe("August 2026");
    expect(formatCalendarDate("fr", date, { month: "long", year: "numeric" })).toBe("août 2026");
    expect(formatCalendarDate("es", date, { month: "long", year: "numeric" })).toBe("agosto de 2026");
    expect(formatCalendarDay("fr", 1)).toMatch(/1/);
  });

  it("fails safely for invalid dates", () => {
    expect(formatCalendarDate("en", "not-a-date", { dateStyle: "medium" })).toBe("");
  });
});
