import type { SupportedLocale } from "./LocalizationProvider";
import { formatLocalizedDate } from "./localizedDate";

const calendarMessages = {
  en: { title: "Calendar", body: "See parenting plans, requests, activities, and calls.", view: "Calendar view", month: "Month", week: "Week", day: "Day", calendars: "Calendars", noEvents: "No events", noEventsYet: "No events yet", planned: "Planned", requested: "Awaiting response", accepted: "Accepted", declined: "Declined", cancelled: "Cancelled" },
  fr: { title: "Calendrier", body: "Consultez les plans parentaux, les demandes, les activités et les appels.", view: "Vue du calendrier", month: "Mois", week: "Semaine", day: "Jour", calendars: "Calendriers", noEvents: "Aucun événement", noEventsYet: "Aucun événement pour le moment", planned: "Planifié", requested: "Réponse attendue", accepted: "Accepté", declined: "Refusé", cancelled: "Annulé" },
  es: { title: "Calendario", body: "Consulta planes de crianza, solicitudes, actividades y llamadas.", view: "Vista del calendario", month: "Mes", week: "Semana", day: "Día", calendars: "Calendarios", noEvents: "Sin eventos", noEventsYet: "Aún no hay eventos", planned: "Planificado", requested: "Esperando respuesta", accepted: "Aceptado", declined: "Rechazado", cancelled: "Cancelado" }
} as const;

const calendarNavigationMessages = {
  en: { previous: "Previous", today: "Today", next: "Next", startsAt: "Starts", endsAt: "Ends", invalidTime: "Enter a valid end time after the start time." },
  fr: { previous: "Précédent", today: "Aujourd'hui", next: "Suivant", startsAt: "Début", endsAt: "Fin", invalidTime: "Saisissez une heure de fin valide après le début." },
  es: { previous: "Anterior", today: "Hoy", next: "Siguiente", startsAt: "Inicio", endsAt: "Fin", invalidTime: "Introduce una hora de finalización válida posterior al inicio." }
} as const;

export type CalendarMessageKey = keyof typeof calendarMessages.en;

export function calendarText(locale: SupportedLocale, key: CalendarMessageKey): string {
  return calendarMessages[locale][key];
}

export type CalendarStatus = "planned" | "requested" | "accepted" | "declined" | "cancelled";

export function calendarStatusText(locale: SupportedLocale, status: CalendarStatus): string {
  return calendarText(locale, status);
}

export type CalendarNavigationMessageKey = keyof typeof calendarNavigationMessages.en;

export function calendarNavigationText(locale: SupportedLocale, key: CalendarNavigationMessageKey): string {
  return calendarNavigationMessages[locale][key];
}

export function formatCalendarDate(
  locale: SupportedLocale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions
): string {
  return formatLocalizedDate(locale, value, options);
}

export function formatCalendarDay(locale: SupportedLocale, value: Date | number): string {
  const date = typeof value === "number" ? new Date(Date.UTC(2026, 7, value)) : value;
  return formatCalendarDate(locale, date, { weekday: "short", day: "numeric" });
}
