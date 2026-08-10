import { formatLocalizedDate } from "./localizedDate";

describe("shared localized date formatting", () => {
  it.each([
    ["en", "August 1, 2026"],
    ["fr", "1 août 2026"],
    ["es", "1 de agosto de 2026"]
  ] as const)("formats a stable UTC date in %s", (locale, expected) => {
    expect(formatLocalizedDate(locale, "2026-08-01T23:30:00.000Z", { year: "numeric", month: "long", day: "numeric" })).toBe(expected);
  });

  it("returns an empty value for invalid input", () => {
    expect(formatLocalizedDate("en", "invalid", { dateStyle: "medium" })).toBe("");
  });
});
