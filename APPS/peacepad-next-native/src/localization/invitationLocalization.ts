import type { InvitationFailureReason } from "../api/CoordinationApi";
import type { SupportedLocale } from "./LocalizationProvider";

const copy: Record<SupportedLocale, Record<InvitationFailureReason, string>> = {
  en: {
    invalid: "That code does not look right. Check all six characters and try again.",
    expired: "This invitation has expired. Ask the sender to create a new one.",
    revoked: "This invitation was cancelled. Ask the sender for a new invitation.",
    used: "This invitation has already been used.",
    "rate-limited": "Too many attempts. Wait a moment before trying again.",
    offline: "PeacePad could not check the code. Check your connection and try again."
  },
  fr: {
    invalid: "Ce code ne semble pas correct. Vérifiez les six caractères et réessayez.",
    expired: "Cette invitation a expiré. Demandez à l’expéditeur d’en créer une nouvelle.",
    revoked: "Cette invitation a été annulée. Demandez un nouveau code à l’expéditeur.",
    used: "Cette invitation a déjà été utilisée.",
    "rate-limited": "Trop de tentatives. Attendez un moment avant de réessayer.",
    offline: "PeacePad n’a pas pu vérifier le code. Vérifiez votre connexion et réessayez."
  },
  es: {
    invalid: "El código no parece correcto. Comprueba los seis caracteres e inténtalo de nuevo.",
    expired: "Esta invitación ha caducado. Pide al remitente que cree una nueva.",
    revoked: "Esta invitación fue cancelada. Pide un nuevo código al remitente.",
    used: "Esta invitación ya se ha utilizado.",
    "rate-limited": "Demasiados intentos. Espera un momento antes de volver a intentarlo.",
    offline: "PeacePad no pudo comprobar el código. Comprueba tu conexión e inténtalo de nuevo."
  }
};

export function invitationErrorText(locale: SupportedLocale, reason: InvitationFailureReason): string {
  return copy[locale][reason];
}
