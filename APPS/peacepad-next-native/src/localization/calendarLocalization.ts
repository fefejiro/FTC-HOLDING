import type { SupportedLocale } from "./LocalizationProvider";
import { formatLocalizedDate } from "./localizedDate";

const calendarMessages = {
  en: { title: "Calendar", body: "See parenting plans, requests, activities, and calls.", view: "Calendar view", month: "Month", week: "Week", day: "Day", calendars: "Calendars", noEvents: "No events", noEventsYet: "No events yet", activityIdeasTitle: "Activity ideas", activityIdeasBody: "Suggestions from the original PeacePad activity guide, filtered by age and weather.", activityAge: "Child age", activityWeather: "Weather", allAges: "All ages", baby: "Baby", toddler: "Toddler", preschool: "Preschool", schoolAge: "School age", teen: "Teen", allWeather: "All weather", sunny: "Sunny", rainy: "Rainy", snowy: "Snowy", cloudy: "Cloudy", windy: "Windy", hot: "Hot", cold: "Cold", noActivityIdeas: "No activities match those filters.", activityIdeasList: "Suggested activities", materials: "Materials", minutes: "min", moreActivityIdeas: "+{count} more ideas" },
  fr: { title: "Calendrier", body: "Consultez les plans parentaux, les demandes, les activit\u00e9s et les appels.", view: "Vue du calendrier", month: "Mois", week: "Semaine", day: "Jour", calendars: "Calendriers", noEvents: "Aucun \u00e9v\u00e9nement", noEventsYet: "Aucun \u00e9v\u00e9nement pour le moment", activityIdeasTitle: "Id\u00e9es d'activit\u00e9s", activityIdeasBody: "Des suggestions de l'ancien guide PeacePad, filtr\u00e9es par \u00e2ge et m\u00e9t\u00e9o.", activityAge: "\u00c2ge de l'enfant", activityWeather: "M\u00e9t\u00e9o", allAges: "Tous les \u00e2ges", baby: "B\u00e9b\u00e9", toddler: "Tout-petit", preschool: "Pr\u00e9scolaire", schoolAge: "\u00c2ge scolaire", teen: "Adolescent", allWeather: "Toutes les m\u00e9t\u00e9os", sunny: "Ensoleill\u00e9", rainy: "Pluvieux", snowy: "Neigeux", cloudy: "Nuageux", windy: "Venteux", hot: "Chaud", cold: "Froid", noActivityIdeas: "Aucune activit\u00e9 ne correspond \u00e0 ces filtres.", activityIdeasList: "Activit\u00e9s sugg\u00e9r\u00e9es", materials: "Mat\u00e9riel", minutes: "min", moreActivityIdeas: "+{count} id\u00e9es suppl\u00e9mentaires" },
  es: { title: "Calendario", body: "Consulta planes de crianza, solicitudes, actividades y llamadas.", view: "Vista del calendario", month: "Mes", week: "Semana", day: "D\u00eda", calendars: "Calendarios", noEvents: "Sin eventos", noEventsYet: "A\u00fan no hay eventos", activityIdeasTitle: "Ideas de actividades", activityIdeasBody: "Sugerencias de la gu\u00eda original de PeacePad, filtradas por edad y clima.", activityAge: "Edad del menor", activityWeather: "Clima", allAges: "Todas las edades", baby: "Beb\u00e9", toddler: "Ni\u00f1o peque\u00f1o", preschool: "Preescolar", schoolAge: "Edad escolar", teen: "Adolescente", allWeather: "Cualquier clima", sunny: "Soleado", rainy: "Lluvioso", snowy: "Nevado", cloudy: "Nublado", windy: "Ventoso", hot: "Caluroso", cold: "Fr\u00edo", noActivityIdeas: "Ninguna actividad coincide con esos filtros.", activityIdeasList: "Actividades sugeridas", materials: "Materiales", minutes: "min", moreActivityIdeas: "+{count} ideas m\u00e1s" }
} as const;

export type CalendarMessageKey = keyof typeof calendarMessages.en;

export function calendarText(locale: SupportedLocale, key: CalendarMessageKey, values?: Readonly<Record<string, string>>): string {
  const value = calendarMessages[locale][key];
  return values ? value.replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token) : value;
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
