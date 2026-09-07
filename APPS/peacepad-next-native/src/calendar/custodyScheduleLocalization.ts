import type { SupportedLocale } from "../localization/LocalizationProvider";

const messages = {
  en: {
    title: "Parenting time plan",
    body: "See your parenting days at a glance. This uses the schedule patterns from PeacePad on the web.",
    pattern: "Schedule pattern",
    week_on_off: "Alternating weeks",
    every_other_weekend: "Every other weekend",
    two_two_three: "2-2-3 rotation",
    startDate: "First day of the plan (YYYY-MM-DD)",
    youStart: "Your time starts first",
    otherStart: "Other parent's time starts first",
    preview: "Upcoming preview",
    noPreview: "Enter a valid start date to preview the plan.",
    enablePlan: "Show this plan on the calendar",
    disablePlan: "Hide this plan from the calendar",
    addDates: "Add next 4 weeks to calendar",
    added: "Upcoming parenting-time blocks were added to the selected calendar.",
    addError: "PeacePad could not add the parenting-time blocks. Try again.",
    noCalendar: "Choose a calendar before adding dates.",
    yourTime: "Your parenting time",
    otherTime: "Other parent's time"
  },
  fr: {
    title: "Plan du temps parental",
    body: "Consultez vos jours parentaux. Ces modèles reprennent le calendrier PeacePad du web.",
    pattern: "Modele de calendrier",
    week_on_off: "Semaines alternees",
    every_other_weekend: "Un week-end sur deux",
    two_two_three: "Rotation 2-2-3",
    startDate: "Premier jour du plan (AAAA-MM-JJ)",
    youStart: "Votre temps commence en premier",
    otherStart: "Le temps de l'autre parent commence en premier",
    preview: "Apercu",
    noPreview: "Saisissez une date de debut valide pour voir le plan.",
    enablePlan: "Afficher ce plan dans le calendrier",
    disablePlan: "Masquer ce plan du calendrier",
    addDates: "Ajouter 4 semaines au calendrier",
    added: "Les blocs de temps parental ont ete ajoutes au calendrier choisi.",
    addError: "PeacePad n'a pas pu ajouter les blocs. Reessayez.",
    noCalendar: "Choisissez un calendrier avant d'ajouter des dates.",
    yourTime: "Votre temps parental",
    otherTime: "Temps de l'autre parent"
  },
  es: {
    title: "Plan de tiempo de crianza",
    body: "Consulta tus dias de crianza. Estos patrones vienen del calendario PeacePad web.",
    pattern: "Patron del calendario",
    week_on_off: "Semanas alternas",
    every_other_weekend: "Un fin de semana si y otro no",
    two_two_three: "Rotacion 2-2-3",
    startDate: "Primer dia del plan (AAAA-MM-DD)",
    youStart: "Tu tiempo comienza primero",
    otherStart: "El tiempo del otro progenitor comienza primero",
    preview: "Proximos dias",
    noPreview: "Escribe una fecha de inicio valida para ver el plan.",
    enablePlan: "Mostrar este plan en el calendario",
    disablePlan: "Ocultar este plan del calendario",
    addDates: "Anadir 4 semanas al calendario",
    added: "Los bloques de tiempo de crianza se anadieron al calendario elegido.",
    addError: "PeacePad no pudo anadir los bloques. Intentalo de nuevo.",
    noCalendar: "Elige un calendario antes de anadir fechas.",
    yourTime: "Tu tiempo de crianza",
    otherTime: "Tiempo del otro progenitor"
  }
} as const;

export type CustodyScheduleTextKey = keyof typeof messages.en;

export function custodyScheduleText(locale: SupportedLocale, key: CustodyScheduleTextKey): string {
  return messages[locale][key];
}
