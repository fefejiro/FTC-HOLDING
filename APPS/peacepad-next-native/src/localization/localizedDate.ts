import type { SupportedLocale } from "./LocalizationProvider";

export function formatLocalizedDate(
  locale: SupportedLocale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }).format(date);
}

