import type { SupportedLocale } from "./LocalizationProvider";
import { formatLocalizedDate } from "./localizedDate";

const calendarMessages = {
  en: { title: "Calendar", body: "See parenting plans, requests, activities, and calls.", view: "Calendar view", month: "Month", week: "Week", day: "Day", calendars: "Calendars", noEvents: "No events", noEventsYet: "No events yet" },
  fr: { title: "Calendrier", body: "Consultez les plans parentaux, les demandes, les activités et les appels.", view: "Vue du calendrier", month: "Mois", week: "Semaine", day: "Jour", calendars: "Calendriers", noEvents: "Aucun événement", noEventsYet: "Aucun événement pour le moment" },
  es: { title: "Calendario", body: "Consulta planes de crianza, solicitudes, actividades y llamadas.", view: "Vista del calendario", month: "Mes", week: "Semana", day: "Día", calendars: "Calendarios", noEvents: "Sin eventos", noEventsYet: "Aún no hay eventos" }
} as const;

export type CalendarMessageKey = keyof typeof calendarMessages.en;

export function calendarText(locale: SupportedLocale, key: CalendarMessageKey): string {
  return calendarMessages[locale][key];
}

export function formatCalendarDate(
  locale: SupportedLocale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions
): string {
  return formatLocalizedDate(locale, value, options);
}

export function formatCalendarDay(locale: SupportedLocale, day: number): string {
  return formatCalendarDate(locale, new Date(Date.UTC(2026, 7, day)), { weekday: "short", day: "numeric" });
}
