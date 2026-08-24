import React, { useCallback, useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { Platform, Text, View } from "react-native";
import { LabButton } from "../components/LabButton";
import { useOptionalLocalization, type SupportedLocale } from "../localization/LocalizationProvider";
import { useOptionalSupabaseSession, type LinkedAuthProvider } from "../session/SupabaseSessionProvider";
import { colors, spacing, typography } from "../theme";
import { requestGoogleIdentityCredential } from "./GoogleNativeAuth";

const copy = {
  en: {
    title: "Sign-in methods", body: "Link another verified way to access this PeacePad account.",
    email: "Email and password", apple: "Apple", google: "Google", linked: "Linked", notLinked: "Not linked",
    link: "Link", remove: "Remove", confirm: "Remove this sign-in method?", cancel: "Cancel",
    working: "Checking provider…", error: "PeacePad could not update this sign-in method. Try again.",
    keepOne: "Keep at least one sign-in method linked."
  },
  fr: {
    title: "Méthodes de connexion", body: "Ajoutez une autre méthode vérifiée pour accéder à ce compte PeacePad.",
    email: "Courriel et mot de passe", apple: "Apple", google: "Google", linked: "Liée", notLinked: "Non liée",
    link: "Lier", remove: "Retirer", confirm: "Retirer cette méthode de connexion?", cancel: "Annuler",
    working: "Vérification…", error: "PeacePad n’a pas pu modifier cette méthode. Réessayez.",
    keepOne: "Conservez au moins une méthode de connexion."
  },
  es: {
    title: "Métodos de acceso", body: "Vincula otra forma verificada de acceder a esta cuenta de PeacePad.",
    email: "Correo y contraseña", apple: "Apple", google: "Google", linked: "Vinculado", notLinked: "No vinculado",
    link: "Vincular", remove: "Quitar", confirm: "¿Quitar este método de acceso?", cancel: "Cancelar",
    working: "Verificando…", error: "PeacePad no pudo actualizar este método. Inténtalo de nuevo.",
    keepOne: "Mantén al menos un método de acceso vinculado."
  }
} as const;

const localized = (locale: SupportedLocale) => copy[locale] ?? copy.en;

export function LinkedSignInMethods() {
  const { locale } = useOptionalLocalization();
  const auth = useOptionalSupabaseSession();
  const strings = localized(locale);
  const googleSignInEnabled = Constants.expoConfig?.extra?.googleSignInEnabled === true;
  const [providers, setProviders] = useState<LinkedAuthProvider[]>([]);
  const [busy, setBusy] = useState<"apple" | "google">();
  const [pendingRemove, setPendingRemove] = useState<"apple" | "google">();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!auth) return;
    try {
      setProviders(await auth.getLinkedProviders());
      setError(undefined);
    } catch {
      setError(strings.error);
    }
  }, [auth, strings.error]);

  useEffect(() => { void refresh(); }, [refresh]);

  const challengeApple = async () => {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      nonce: hashedNonce,
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL]
    });
    if (!credential.identityToken || !credential.user) throw new Error("Apple challenge did not return an identity.");
    return { token: credential.identityToken, nonce: rawNonce, subject: credential.user };
  };

  const update = async (provider: "apple" | "google", remove: boolean) => {
    if (busy || !auth) return;
    setBusy(provider); setError(undefined);
    try {
      if (provider === "google") {
        const credential = await requestGoogleIdentityCredential();
        if (!credential) return;
        if (remove) await auth.unlinkProvider("google", credential.providerSubject);
        else await auth.linkProvider("google", { token: credential.idToken, accessToken: credential.accessToken });
      } else {
        const credential = await challengeApple();
        if (remove) await auth.unlinkProvider("apple", credential.subject);
        else await auth.linkProvider("apple", { token: credential.token, nonce: credential.nonce });
      }
      setPendingRemove(undefined);
      await refresh();
    } catch (cause) {
      if ((cause as { code?: string })?.code !== "ERR_REQUEST_CANCELED") {
        setError(cause instanceof Error && /at least one sign-in/i.test(cause.message) ? strings.keepOne : strings.error);
      }
    } finally {
      setBusy(undefined);
    }
  };

  const methods = ([
    { provider: "email" as const, label: strings.email, available: true },
    { provider: "apple" as const, label: strings.apple, available: Platform.OS === "ios" },
    { provider: "google" as const, label: strings.google, available: googleSignInEnabled }
  ]).filter(({ available }) => available);

  if (!auth || auth.status !== "ready") return null;

  return <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: spacing.md, padding: spacing.lg }}>
    <Text accessibilityRole="header" style={{ ...typography.subheading, color: colors.text }}>{strings.title}</Text>
    <Text style={{ ...typography.caption, color: colors.muted }}>{strings.body}</Text>
    {methods.map(({ provider, label }) => {
      const linked = providers.includes(provider);
      return <View key={provider} style={{ gap: spacing.sm }}>
        <Text style={{ ...typography.body, color: colors.text }}>{label} · {linked ? strings.linked : strings.notLinked}</Text>
        {provider !== "email" && linked && pendingRemove === provider ? <>
          <Text accessibilityLiveRegion="assertive" style={{ ...typography.caption, color: colors.text }}>{strings.confirm}</Text>
          <LabButton disabled={Boolean(busy)} label={busy === provider ? strings.working : strings.remove} onPress={() => void update(provider, true)} variant="secondary" />
          <LabButton disabled={Boolean(busy)} label={strings.cancel} onPress={() => setPendingRemove(undefined)} variant="secondary" />
        </> : provider !== "email" ? <LabButton
          disabled={Boolean(busy)}
          label={busy === provider ? strings.working : linked ? strings.remove : strings.link}
          onPress={() => linked ? setPendingRemove(provider) : void update(provider, false)}
          variant="secondary"
        /> : null}
      </View>;
    })}
    {error ? <Text accessibilityRole="alert" style={{ ...typography.caption, color: colors.dangerText }}>{error}</Text> : null}
  </View>;
}
