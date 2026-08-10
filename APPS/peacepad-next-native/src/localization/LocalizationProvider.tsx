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
    "account.deleting": "Deleting account...", "account.deletePermanently": "Delete account permanently", "account.cancel": "Cancel"
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
    "account.deleting": "Suppression du compte...", "account.deletePermanently": "Supprimer définitivement le compte", "account.cancel": "Annuler"
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
    "account.deleting": "Eliminando cuenta...", "account.deletePermanently": "Eliminar cuenta permanentemente", "account.cancel": "Cancelar"
  }
} as const;

export type MessageKey = keyof typeof messages.en;

export function resolveSupportedLocale(value?: string | null): SupportedLocale {
  const language = value?.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(language as SupportedLocale) ? language as SupportedLocale : "en";
}

export function translate(locale: SupportedLocale, key: MessageKey): string { return messages[locale][key] ?? messages.en[key]; }

export type LocaleStore = { read(): Promise<string | null>; save(locale: SupportedLocale): Promise<void> };
export const secureLocaleStore: LocaleStore = {
  read: () => SecureStore.getItemAsync(localeStorageKey),
  save: (locale) => SecureStore.setItemAsync(localeStorageKey, locale, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
};

type LocalizationValue = { locale: SupportedLocale; setLocale(locale: SupportedLocale): Promise<void>; t(key: MessageKey): string };
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
  const value = useMemo<LocalizationValue>(() => ({ locale, setLocale, t: (key) => translate(locale, key) }), [locale, setLocale]);
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationValue {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error("useLocalization must be used within LocalizationProvider");
  return value;
}
