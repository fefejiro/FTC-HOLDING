import type { SupportedLocale } from "./LocalizationProvider";

const copy = {
  en: { title: "What would you like to do?", body: "Messages, plans, and records in one calm place.", send: "Send a message", sendBody: "Write clearly and review before sending.", event: "Add an event", eventBody: "Keep parenting plans and activities together.", invite: "Invite co-parent", inviteBody: "Connect only after reviewing access.", record: "Add a record", recordBody: "Organize notes and source details.", today: "Today", upcoming: "Upcoming events", saved: "Saved records", sent: "Messages sent this session", family: "Family connection", connected: "Connected", notConnected: "Not connected", logo: "PeacePad conch logo" },
  fr: { title: "Que souhaitez-vous faire?", body: "Messages, plans et dossiers réunis dans un espace calme.", send: "Envoyer un message", sendBody: "Écrivez clairement et relisez avant d’envoyer.", event: "Ajouter un événement", eventBody: "Regroupez les plans parentaux et les activités.", invite: "Inviter un coparent", inviteBody: "Connectez-vous seulement après avoir vérifié les accès.", record: "Ajouter un dossier", recordBody: "Organisez les notes et les détails des sources.", today: "Aujourd’hui", upcoming: "Événements à venir", saved: "Dossiers enregistrés", sent: "Messages envoyés pendant cette session", family: "Lien familial", connected: "Connecté", notConnected: "Non connecté", logo: "Logo coquillage de PeacePad" },
  es: { title: "¿Qué te gustaría hacer?", body: "Mensajes, planes y registros en un lugar tranquilo.", send: "Enviar un mensaje", sendBody: "Escribe con claridad y revisa antes de enviar.", event: "Añadir un evento", eventBody: "Mantén juntos los planes de crianza y las actividades.", invite: "Invitar a un copadre", inviteBody: "Conéctate solo después de revisar el acceso.", record: "Añadir un registro", recordBody: "Organiza notas y detalles de las fuentes.", today: "Hoy", upcoming: "Próximos eventos", saved: "Registros guardados", sent: "Mensajes enviados en esta sesión", family: "Conexión familiar", connected: "Conectado", notConnected: "Sin conexión", logo: "Logotipo de caracola de PeacePad" }
} as const;

export type HomeKey = keyof typeof copy.en;
export function homeText(locale: SupportedLocale, key: HomeKey): string { return copy[locale][key]; }

const heroCopy = {
  en: { greeting: "Ready for today?", greetingNamed: "Ready for today, {name}?", impact: "Small steps. Kind words. Big impact—for your kids." },
  fr: { greeting: "Prêt pour aujourd’hui?", greetingNamed: "Prêt pour aujourd’hui, {name}?", impact: "Petits pas. Mots bienveillants. Grand impact pour vos enfants." },
  es: { greeting: "¿Listo para hoy?", greetingNamed: "¿Listo para hoy, {name}?", impact: "Pequeños pasos. Palabras amables. Un gran impacto para tus hijos." }
} as const;

export type HomeHeroKey = keyof typeof heroCopy.en;
export function homeHeroText(locale: SupportedLocale, key: HomeHeroKey, name?: string): string {
  return heroCopy[locale][key].replace("{name}", name ?? "");
}
