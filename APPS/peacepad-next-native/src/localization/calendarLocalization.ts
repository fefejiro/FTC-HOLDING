import type { SupportedLocale } from "./LocalizationProvider";
import { formatLocalizedDate } from "./localizedDate";

const calendarMessages = {
  en: { title: "Calendar", body: "See parenting plans, requests, activities, and calls.", view: "Calendar view", month: "Month", week: "Week", day: "Day", calendars: "Calendars", manageCalendars: "Manage calendars", closeCalendarManager: "Close calendar manager", doneManagingCalendars: "Done", calendarManagerBody: "Choose what appears here. Sharing always asks first.", visibleCalendars: "visible calendars", planningTools: "Parenting plan & changes", planningToolsBody: "Set a repeating plan or propose a one-off change. Nothing is shared until you choose.", showPlanningTools: "Show planning tools", hidePlanningTools: "Hide planning tools", savingEvent: "Saving event...", shareCalendarAction: "Share calendar", changesTitle: "Changes, holidays and swaps", changesBody: "Propose a one-off change without rewriting the regular parenting plan. Both parents can see and respond to it.", yourTime: "Your time", otherTime: "Other parent’s time", sendingProposal: "Sending proposal...", proposeChange: "Propose change", accept: "Accept", decline: "Decline", changeStart: "Change start date", changeEnd: "Change end date", changeNote: "Change note", parentingChange: "Parenting-time change", noEvents: "No events", noEventsYet: "No events yet", planned: "Planned", requested: "Awaiting response", accepted: "Accepted", declined: "Declined", cancelled: "Cancelled" },
  fr: { title: "Calendrier", body: "Consultez les plans parentaux, les demandes, les activités et les appels.", view: "Vue du calendrier", month: "Mois", week: "Semaine", day: "Jour", calendars: "Calendriers", manageCalendars: "Gérer les calendriers", closeCalendarManager: "Fermer le gestionnaire de calendriers", doneManagingCalendars: "Terminer", calendarManagerBody: "Choisissez ce qui apparaît ici. Le partage demande toujours votre accord.", visibleCalendars: "calendriers visibles", planningTools: "Plan parental et changements", planningToolsBody: "Définissez un plan récurrent ou proposez un changement ponctuel. Rien n’est partagé sans votre choix.", showPlanningTools: "Afficher les outils de planification", hidePlanningTools: "Masquer les outils de planification", savingEvent: "Enregistrement de l’événement...", shareCalendarAction: "Partager le calendrier", changesTitle: "Changements, jours fériés et échanges", changesBody: "Proposez un changement ponctuel sans réécrire le plan parental habituel. Les deux parents peuvent le voir et y répondre.", yourTime: "Votre temps", otherTime: "Temps de l’autre parent", sendingProposal: "Envoi de la proposition...", proposeChange: "Proposer un changement", accept: "Accepter", decline: "Refuser", changeStart: "Date de début du changement", changeEnd: "Date de fin du changement", changeNote: "Note du changement", parentingChange: "Changement de temps parental", noEvents: "Aucun événement", noEventsYet: "Aucun événement pour le moment", planned: "Planifié", requested: "Réponse attendue", accepted: "Accepté", declined: "Refusé", cancelled: "Annulé" },
  es: { title: "Calendario", body: "Consulta planes de crianza, solicitudes, actividades y llamadas.", view: "Vista del calendario", month: "Mes", week: "Semana", day: "Día", calendars: "Calendarios", manageCalendars: "Gestionar calendarios", closeCalendarManager: "Cerrar gestor de calendarios", doneManagingCalendars: "Listo", calendarManagerBody: "Elige qué aparece aquí. Compartir siempre requiere tu confirmación.", visibleCalendars: "calendarios visibles", planningTools: "Plan de crianza y cambios", planningToolsBody: "Define un plan recurrente o propone un cambio puntual. No se comparte nada hasta que tú lo elijas.", showPlanningTools: "Mostrar herramientas de planificación", hidePlanningTools: "Ocultar herramientas de planificación", savingEvent: "Guardando evento...", shareCalendarAction: "Compartir calendario", changesTitle: "Cambios, festivos e intercambios", changesBody: "Propón un cambio puntual sin reescribir el plan habitual. Ambos padres pueden verlo y responder.", yourTime: "Tu tiempo", otherTime: "Tiempo del otro padre", sendingProposal: "Enviando propuesta...", proposeChange: "Proponer cambio", accept: "Aceptar", decline: "Rechazar", changeStart: "Fecha de inicio del cambio", changeEnd: "Fecha de fin del cambio", changeNote: "Nota del cambio", parentingChange: "Cambio de tiempo de crianza", noEvents: "Sin eventos", noEventsYet: "Aún no hay eventos", planned: "Planificado", requested: "Esperando respuesta", accepted: "Aceptado", declined: "Rechazado", cancelled: "Cancelado" }
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
