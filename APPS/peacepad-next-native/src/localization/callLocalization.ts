import type { SupportedLocale } from "./LocalizationProvider";

const copy = {
  en: {
    title: "Audio call", body: "Call your co-parent in this conversation.", unavailable: "Audio connection is not available in this session.",
    connecting: "Connecting secure audio...", connected: "Secure audio connected.", failed: "Audio could not connect. End the call and try again.", accepted: "Call accepted", ringingBody: "Waiting for the verified participant to accept.",
    noCall: "No call in progress", noCallBody: "Starting a call rings only the verified participant in this conversation.", start: "Start audio call",
    refresh: "Refresh call status", ringingOut: "Calling your co-parent", ringingIn: "Incoming audio call", active: "Audio call connected", ended: "Call ended",
    accept: "Accept call", decline: "Decline call", cancel: "Cancel call", end: "End call", busy: "Updating call...", error: "PeacePad could not update the call. Try again."
  },
  fr: {
    title: "Appel audio", body: "Appelez votre coparent dans cette conversation.", unavailable: "La connexion audio n’est pas disponible pour cette session.",
    connecting: "Connexion audio sécurisée en cours...", connected: "Audio sécurisé connecté.", failed: "La connexion audio a échoué. Terminez l’appel et réessayez.", accepted: "Appel accepté", ringingBody: "En attente de l’acceptation de la personne vérifiée.",
    noCall: "Aucun appel en cours", noCallBody: "Le lancement d’un appel fait sonner uniquement la personne vérifiée de cette conversation.", start: "Démarrer l’appel audio",
    refresh: "Actualiser l’état de l’appel", ringingOut: "Appel de votre coparent", ringingIn: "Appel audio entrant", active: "Appel audio connecté", ended: "Appel terminé",
    accept: "Accepter l’appel", decline: "Refuser l’appel", cancel: "Annuler l’appel", end: "Terminer l’appel", busy: "Mise à jour de l’appel...", error: "PeacePad n’a pas pu mettre à jour l’appel. Réessayez."
  },
  es: {
    title: "Llamada de audio", body: "Llame a su coparental en esta conversación.", unavailable: "La conexión de audio no está disponible en esta sesión.",
    connecting: "Conectando audio seguro...", connected: "Audio seguro conectado.", failed: "No se pudo conectar el audio. Finalice la llamada e inténtelo de nuevo.", accepted: "Llamada aceptada", ringingBody: "Esperando que la persona verificada acepte.",
    noCall: "No hay ninguna llamada en curso", noCallBody: "Al iniciar una llamada, solo suena la persona verificada de esta conversación.", start: "Iniciar llamada de audio",
    refresh: "Actualizar estado de la llamada", ringingOut: "Llamando a su coparental", ringingIn: "Llamada de audio entrante", active: "Llamada de audio conectada", ended: "Llamada finalizada",
    accept: "Aceptar llamada", decline: "Rechazar llamada", cancel: "Cancelar llamada", end: "Finalizar llamada", busy: "Actualizando llamada...", error: "PeacePad no pudo actualizar la llamada. Inténtelo de nuevo."
  }
} as const;

export type CallTextKey = keyof typeof copy.en;

export function callText(locale: SupportedLocale, key: CallTextKey): string {
  return copy[locale][key];
}
