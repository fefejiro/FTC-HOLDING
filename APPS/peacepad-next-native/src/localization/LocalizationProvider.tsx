import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export const supportedLocales = ["en", "fr", "es"] as const;
export type SupportedLocale = typeof supportedLocales[number];
export const languageNames: Record<SupportedLocale, string> = { en: "English", fr: "Français", es: "Español" };
const localeStorageKey = "peacepad_v2_locale";

const messages = {
  en: {
    "navigation.primary": "Primary navigation", "navigation.home": "Home", "navigation.messages": "Messages",
    "navigation.calendar": "Calendar", "navigation.records": "Records", "navigation.more": "More",
    "more.title": "More", "more.family.title": "Family connection", "more.family.body": "Review or enter an invitation.",
    "more.privacy.title": "Privacy and consent", "more.privacy.body": "Review your choices and how PeacePad handles information.",
    "more.support.title": "Help & Support", "more.support.body": "Get help using PeacePad.",
    "language.title": "Language", "language.body": "Choose the language used for navigation and supported screens.",
    "language.optionHint": "Changes the app language on this device.", "language.selected": "Selected",
    "account.signOut": "Sign out", "account.signOutBody": "Remove this fictional staging session from this device.",
    "account.delete": "Delete staging account", "account.deleteBody": "Permanently remove this fictional account and its access.",
    "account.deleteTitle": "Delete this staging account?", "account.deleteWarning": "This permanently deletes the fictional staging identity and revokes its family access. This cannot be undone.",
    "account.deleting": "Deleting account...", "account.deletePermanently": "Delete account permanently", "account.cancel": "Cancel",
    "invite.title": "Family connection", "invite.body": "Invite a co-parent or enter a code you received.", "invite.action": "Invitation action",
    "invite.createTab": "Invite someone", "invite.joinTab": "Enter a code", "invite.joinBody": "Enter the six-character code from your invitation.",
    "invite.code": "Invitation code", "invite.checking": "Checking...", "invite.review": "Review invitation", "invite.accept": "Accept invitation",
    "invite.decline": "Decline", "invite.privateUntilAccepted": "Nothing is shared until you accept.", "invite.connected": "You’re connected",
    "invite.connectedBody": "Your approved family access is now active.", "invite.createCard": "Create family invitation", "invite.createTitle": "Invite a co-parent",
    "invite.createBody": "They will review your name, the shared space, and access before connecting.", "invite.access": "Access", "invite.messages": "Messages",
    "invite.calendar": "Calendar", "invite.sharedRecords": "Shared records", "invite.creating": "Creating...", "invite.create": "Create invitation",
    "invite.ready": "Invitation ready", "invite.codeLabel": "Invitation code {code}", "invite.qrHint": "Scanning opens the invitation review screen. It does not connect anyone automatically.",
    "invite.qrLabel": "Scannable invitation QR", "invite.qrAction": "Scan to review access", "invite.expiry": "Single use · expires in 72 hours",
    "invite.share": "Share invitation", "invite.cancelling": "Cancelling...", "invite.cancel": "Cancel invitation", "invite.shareTitle": "PeacePad invitation",
    "invite.shareReview": "Review the access before you connect.", "invite.shareCode": "Code: {code}", "invite.shareUnavailable": "Sharing is unavailable. Use the six-character code instead.",
    "invite.preview": "Invitation preview", "invite.invitedBy": "{name} invited you", "invite.role": "Role", "invite.roleParent": "Parent",
    "invite.permissionMessages": "Messages", "invite.permissionCalendar": "Calendar", "invite.permissionSharedRecords": "Shared records",
    "invite.permissionMessageWrite": "Send messages", "invite.permissionCalendarWrite": "Manage calendar events", "invite.familyBlocked": "This account is already connected to a family. Family switching is not available yet, so this invitation cannot be accepted here.",
    "invite.accepted": "Invitation accepted"
  },
  fr: {
    "navigation.primary": "Navigation principale", "navigation.home": "Accueil", "navigation.messages": "Messages",
    "navigation.calendar": "Calendrier", "navigation.records": "Dossiers", "navigation.more": "Plus",
    "more.title": "Plus", "more.family.title": "Lien familial", "more.family.body": "Consultez ou saisissez une invitation.",
    "more.privacy.title": "Confidentialité et consentement", "more.privacy.body": "Consultez vos choix et la façon dont PeacePad traite les informations.",
    "more.support.title": "Aide et soutien", "more.support.body": "Obtenez de l’aide pour utiliser PeacePad.",
    "language.title": "Langue", "language.body": "Choisissez la langue de la navigation et des écrans pris en charge.",
    "language.optionHint": "Change la langue de l’application sur cet appareil.", "language.selected": "Sélectionnée",
    "account.signOut": "Se déconnecter", "account.signOutBody": "Supprimez cette session de test fictive de cet appareil.",
    "account.delete": "Supprimer le compte de test", "account.deleteBody": "Supprimez définitivement ce compte fictif et ses accès.",
    "account.deleteTitle": "Supprimer ce compte de test?", "account.deleteWarning": "Cette action supprime définitivement l’identité fictive de test et révoque son accès familial. Elle est irréversible.",
    "account.deleting": "Suppression du compte...", "account.deletePermanently": "Supprimer définitivement le compte", "account.cancel": "Annuler",
    "invite.title": "Lien familial", "invite.body": "Invitez un coparent ou saisissez un code reçu.", "invite.action": "Action d’invitation",
    "invite.createTab": "Inviter quelqu’un", "invite.joinTab": "Saisir un code", "invite.joinBody": "Saisissez le code à six caractères de votre invitation.",
    "invite.code": "Code d’invitation", "invite.checking": "Vérification...", "invite.review": "Consulter l’invitation", "invite.accept": "Accepter l’invitation",
    "invite.decline": "Refuser", "invite.privateUntilAccepted": "Aucune information n’est partagée avant votre acceptation.", "invite.connected": "Vous êtes connecté",
    "invite.connectedBody": "Votre accès familial approuvé est maintenant actif.", "invite.createCard": "Créer une invitation familiale", "invite.createTitle": "Inviter un coparent",
    "invite.createBody": "Cette personne examinera votre nom, l’espace partagé et les accès avant de se connecter.", "invite.access": "Accès", "invite.messages": "Messages",
    "invite.calendar": "Calendrier", "invite.sharedRecords": "Dossiers partagés", "invite.creating": "Création...", "invite.create": "Créer l’invitation",
    "invite.ready": "Invitation prête", "invite.codeLabel": "Code d’invitation {code}", "invite.qrHint": "Le balayage ouvre l’écran de vérification de l’invitation. Il ne connecte personne automatiquement.",
    "invite.qrLabel": "Code QR d’invitation à balayer", "invite.qrAction": "Balayer pour vérifier les accès", "invite.expiry": "Usage unique · expire dans 72 heures",
    "invite.share": "Partager l’invitation", "invite.cancelling": "Annulation...", "invite.cancel": "Annuler l’invitation", "invite.shareTitle": "Invitation PeacePad",
    "invite.shareReview": "Vérifiez les accès avant de vous connecter.", "invite.shareCode": "Code : {code}", "invite.shareUnavailable": "Le partage est indisponible. Utilisez plutôt le code à six caractères.",
    "invite.preview": "Aperçu de l’invitation", "invite.invitedBy": "{name} vous a invité", "invite.role": "Rôle", "invite.roleParent": "Parent",
    "invite.permissionMessages": "Messages", "invite.permissionCalendar": "Calendrier", "invite.permissionSharedRecords": "Dossiers partagés",
    "invite.permissionMessageWrite": "Envoyer des messages", "invite.permissionCalendarWrite": "Gérer les événements du calendrier", "invite.familyBlocked": "Ce compte est déjà lié à une famille. Le changement de famille n’est pas encore disponible; cette invitation ne peut donc pas être acceptée ici.",
    "invite.accepted": "Invitation acceptée"
  },
  es: {
    "navigation.primary": "Navegación principal", "navigation.home": "Inicio", "navigation.messages": "Mensajes",
    "navigation.calendar": "Calendario", "navigation.records": "Registros", "navigation.more": "Más",
    "more.title": "Más", "more.family.title": "Conexión familiar", "more.family.body": "Revisa o introduce una invitación.",
    "more.privacy.title": "Privacidad y consentimiento", "more.privacy.body": "Revisa tus decisiones y cómo PeacePad maneja la información.",
    "more.support.title": "Ayuda y soporte", "more.support.body": "Obtén ayuda para usar PeacePad.",
    "language.title": "Idioma", "language.body": "Elige el idioma de la navegación y las pantallas compatibles.",
    "language.optionHint": "Cambia el idioma de la aplicación en este dispositivo.", "language.selected": "Seleccionado",
    "account.signOut": "Cerrar sesión", "account.signOutBody": "Elimina de este dispositivo esta sesión ficticia de pruebas.",
    "account.delete": "Eliminar cuenta de pruebas", "account.deleteBody": "Elimina permanentemente esta cuenta ficticia y su acceso.",
    "account.deleteTitle": "¿Eliminar esta cuenta de pruebas?", "account.deleteWarning": "Esta acción elimina permanentemente la identidad ficticia de pruebas y revoca su acceso familiar. No se puede deshacer.",
    "account.deleting": "Eliminando cuenta...", "account.deletePermanently": "Eliminar cuenta permanentemente", "account.cancel": "Cancelar",
    "invite.title": "Conexión familiar", "invite.body": "Invita a un copadre o introduce un código recibido.", "invite.action": "Acción de invitación",
    "invite.createTab": "Invitar a alguien", "invite.joinTab": "Introducir un código", "invite.joinBody": "Introduce el código de seis caracteres de tu invitación.",
    "invite.code": "Código de invitación", "invite.checking": "Comprobando...", "invite.review": "Revisar invitación", "invite.accept": "Aceptar invitación",
    "invite.decline": "Rechazar", "invite.privateUntilAccepted": "No se comparte nada hasta que aceptes.", "invite.connected": "Ya tienes conexión",
    "invite.connectedBody": "Tu acceso familiar aprobado ya está activo.", "invite.createCard": "Crear invitación familiar", "invite.createTitle": "Invitar a un copadre",
    "invite.createBody": "Esta persona revisará tu nombre, el espacio compartido y el acceso antes de conectarse.", "invite.access": "Acceso", "invite.messages": "Mensajes",
    "invite.calendar": "Calendario", "invite.sharedRecords": "Registros compartidos", "invite.creating": "Creando...", "invite.create": "Crear invitación",
    "invite.ready": "Invitación lista", "invite.codeLabel": "Código de invitación {code}", "invite.qrHint": "Al escanear se abre la pantalla de revisión de la invitación. No conecta a nadie automáticamente.",
    "invite.qrLabel": "Código QR de invitación escaneable", "invite.qrAction": "Escanear para revisar el acceso", "invite.expiry": "Un solo uso · caduca en 72 horas",
    "invite.share": "Compartir invitación", "invite.cancelling": "Cancelando...", "invite.cancel": "Cancelar invitación", "invite.shareTitle": "Invitación de PeacePad",
    "invite.shareReview": "Revisa el acceso antes de conectarte.", "invite.shareCode": "Código: {code}", "invite.shareUnavailable": "No se puede compartir. Usa el código de seis caracteres.",
    "invite.preview": "Vista previa de la invitación", "invite.invitedBy": "{name} te invitó", "invite.role": "Rol", "invite.roleParent": "Progenitor",
    "invite.permissionMessages": "Mensajes", "invite.permissionCalendar": "Calendario", "invite.permissionSharedRecords": "Registros compartidos",
    "invite.permissionMessageWrite": "Enviar mensajes", "invite.permissionCalendarWrite": "Gestionar eventos del calendario", "invite.familyBlocked": "Esta cuenta ya está conectada a una familia. El cambio de familia aún no está disponible, por lo que esta invitación no se puede aceptar aquí.",
    "invite.accepted": "Invitación aceptada"
  }
} as const;

export type MessageKey = keyof typeof messages.en;

export function resolveSupportedLocale(value?: string | null): SupportedLocale {
  const language = value?.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(language as SupportedLocale) ? language as SupportedLocale : "en";
}

export function translate(locale: SupportedLocale, key: MessageKey, values?: Readonly<Record<string, string>>): string {
  const message = messages[locale][key] ?? messages.en[key];
  return values ? message.replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token) : message;
}

export type LocaleStore = { read(): Promise<string | null>; save(locale: SupportedLocale): Promise<void> };
export const secureLocaleStore: LocaleStore = {
  read: () => SecureStore.getItemAsync(localeStorageKey),
  save: (locale) => SecureStore.setItemAsync(localeStorageKey, locale, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
};

type LocalizationValue = { locale: SupportedLocale; setLocale(locale: SupportedLocale): Promise<void>; t(key: MessageKey, values?: Readonly<Record<string, string>>): string };
const LocalizationContext = createContext<LocalizationValue | null>(null);

export function LocalizationProvider({ children, initialLocale, store = secureLocaleStore }: { children: ReactNode; initialLocale?: string; store?: LocaleStore }) {
  const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  const [locale, setLocaleState] = useState<SupportedLocale>(() => resolveSupportedLocale(initialLocale ?? systemLocale));

  useEffect(() => {
    if (initialLocale) return;
    let active = true;
    store.read().then((stored) => { if (active && stored) setLocaleState(resolveSupportedLocale(stored)); }).catch(() => undefined);
    return () => { active = false; };
  }, [initialLocale, store]);

  const setLocale = useCallback(async (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    await store.save(nextLocale);
  }, [store]);
  const value = useMemo<LocalizationValue>(() => ({ locale, setLocale, t: (key, values) => translate(locale, key, values) }), [locale, setLocale]);
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationValue {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error("useLocalization must be used within LocalizationProvider");
  return value;
}
