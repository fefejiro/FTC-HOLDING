import type { SupportedLocale } from "./LocalizationProvider";

const copy = {
  en: {
    title: "Prepare a calm message",
    body: "Start on your own. PeacePad will help you shape a message before you send it.",
    open: "Open Prep Chat",
    close: "Close Prep Chat",
    topic: "What do you need to talk about?",
    topicPlaceholder: "For example: this weekend's pickup time",
    feeling: "How are you feeling?",
    calm: "Calm",
    anxious: "Anxious",
    frustrated: "Frustrated",
    overwhelmed: "Overwhelmed",
    sad: "Sad",
    angry: "Angry",
    create: "Create a draft",
    creating: "Creating...",
    empty: "Add a short topic first.",
    draft: "Draft to review",
    use: "Use in message",
    startOver: "Start over",
    localOnly: "Your topic stays on this device until you choose to send a message."
  },
  fr: {
    title: "Preparer un message calme",
    body: "Commencez seul. PeacePad vous aide a formuler un message avant de l'envoyer.",
    open: "Ouvrir Prep Chat",
    close: "Fermer Prep Chat",
    topic: "De quoi voulez-vous parler?",
    topicPlaceholder: "Exemple : l'heure de recuperation ce week-end",
    feeling: "Comment vous sentez-vous?",
    calm: "Calme",
    anxious: "Anxieux",
    frustrated: "Frustre",
    overwhelmed: "Depasse",
    sad: "Triste",
    angry: "En colere",
    create: "Creer un brouillon",
    creating: "Creation...",
    empty: "Ajoutez d'abord un court sujet.",
    draft: "Brouillon a relire",
    use: "Utiliser dans le message",
    startOver: "Recommencer",
    localOnly: "Votre sujet reste sur cet appareil jusqu'a ce que vous choisissiez d'envoyer un message."
  },
  es: {
    title: "Prepara un mensaje tranquilo",
    body: "Empieza por tu cuenta. PeacePad te ayuda a preparar el mensaje antes de enviarlo.",
    open: "Abrir Prep Chat",
    close: "Cerrar Prep Chat",
    topic: "De que quieres hablar?",
    topicPlaceholder: "Por ejemplo: la hora de recogida este fin de semana",
    feeling: "Como te sientes?",
    calm: "Tranquilo",
    anxious: "Ansioso",
    frustrated: "Frustrado",
    overwhelmed: "Agobiado",
    sad: "Triste",
    angry: "Enfadado",
    create: "Crear borrador",
    creating: "Creando...",
    empty: "Anade primero un tema breve.",
    draft: "Borrador para revisar",
    use: "Usar en el mensaje",
    startOver: "Empezar de nuevo",
    localOnly: "El tema permanece en este dispositivo hasta que elijas enviar un mensaje."
  }
} as const;

export type PrepChatCopyKey = keyof typeof copy.en;

export function prepChatText(locale: SupportedLocale, key: PrepChatCopyKey): string {
  return copy[locale][key];
}

