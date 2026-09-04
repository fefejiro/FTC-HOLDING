import React, { useEffect, useMemo, useRef, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AccessibleHeading } from "../components/AccessibleHeading";
import { LabButton } from "../components/LabButton";
import { useOptionalLocalization, type SupportedLocale } from "../localization/LocalizationProvider";
import { useSupabaseSession } from "../session/SupabaseSessionProvider";
import { requestGoogleIdentityToken } from "./GoogleNativeAuth";
import { useAuthCapabilities } from "./AuthCapabilities";
import { colors, spacing, typography } from "../theme";

const ONBOARDING_KEY = "peacepad.v2.public-onboarding.complete.v1";
const slideImages = [
  require("./onboarding-calm.png"),
  require("./onboarding-communication.png"),
  require("./onboarding-plans.png")
] as const;

const copy = {
  en: {
    slides: [
      { title: "A calmer way to coordinate parenting", body: "Communicate with care, even when the moment is difficult." },
      { title: "Pause before you send", body: "Check your words and choose a clearer way forward." },
      { title: "Keep parenting plans organized", body: "Messages, schedules and important records stay in one secure place." }
    ],
    next: "Next", skip: "Skip", start: "Get started", create: "Create account", signIn: "Sign in", or: "or",
    createTitle: "Create your PeacePad account", signInTitle: "Welcome back", email: "Email", password: "Password",
    createAction: "Create account", signInAction: "Sign in", working: "Please wait…", existing: "Already have an account?",
    newHere: "New to PeacePad?", apple: "Continue with Apple", google: "Continue with Google", confirmTitle: "Check your email",
    confirmBody: "We sent you a secure confirmation link. Open it on this iPhone to finish setting up your account.",
    forgot: "Forgot password?", resetSent: "Password reset instructions are on the way.",
    resetTitle: "Choose a new password", resetBody: "Use at least 8 characters for your new PeacePad password.",
    newPassword: "New password", updatePassword: "Save new password",
    legal: "By continuing, you agree to the Terms and acknowledge the Privacy Policy.",
    terms: "Terms", privacy: "Privacy", unavailable: "PeacePad could not complete that request. Try again.",
    invalidEmail: "Enter a valid email address.", serviceUnavailable: "PeacePad sign-in is temporarily unavailable. Please try again shortly.",
    invalidCredentials: "That email or password did not match. Check it and try again.", confirmEmailFirst: "Confirm your email before signing in.",
    appleUnavailable: "Sign in with Apple is not available right now.", googleUnavailable: "Sign in with Google is not available right now.", checkingProviders: "Checking sign-in options…", retryProviders: "Retry sign-in options", passwordHint: "Use at least 8 characters."
  },
  fr: {
    slides: [
      { title: "Une façon plus calme de coordonner la parentalité", body: "Communiquez avec soin, même dans les moments difficiles." },
      { title: "Faites une pause avant d’envoyer", body: "Relisez vos mots et choisissez une voie plus claire." },
      { title: "Organisez les plans parentaux", body: "Messages, horaires et dossiers importants restent dans un espace sécurisé." }
    ],
    next: "Suivant", skip: "Passer", start: "Commencer", create: "Créer un compte", signIn: "Se connecter", or: "ou",
    createTitle: "Créez votre compte PeacePad", signInTitle: "Bon retour", email: "Courriel", password: "Mot de passe",
    createAction: "Créer le compte", signInAction: "Se connecter", working: "Veuillez patienter…", existing: "Vous avez déjà un compte?",
    newHere: "Nouveau sur PeacePad?", apple: "Continuer avec Apple", google: "Continuer avec Google", confirmTitle: "Consultez votre courriel",
    confirmBody: "Nous vous avons envoyé un lien de confirmation sécurisé. Ouvrez-le sur cet iPhone pour terminer.",
    forgot: "Mot de passe oublié?", resetSent: "Les instructions de réinitialisation sont en route.",
    resetTitle: "Choisissez un nouveau mot de passe", resetBody: "Utilisez au moins 8 caractères pour votre nouveau mot de passe PeacePad.",
    newPassword: "Nouveau mot de passe", updatePassword: "Enregistrer le mot de passe",
    legal: "En continuant, vous acceptez les Conditions et reconnaissez la Politique de confidentialité.",
    terms: "Conditions", privacy: "Confidentialité", unavailable: "PeacePad n’a pas pu effectuer cette demande. Réessayez.",
    invalidEmail: "Entrez une adresse courriel valide.", serviceUnavailable: "La connexion à PeacePad est temporairement indisponible. Réessayez bientôt.",
    invalidCredentials: "Ce courriel ou mot de passe ne correspond pas. Vérifiez-le et réessayez.", confirmEmailFirst: "Confirmez votre courriel avant de vous connecter.",
    appleUnavailable: "La connexion avec Apple est indisponible pour le moment.", googleUnavailable: "La connexion avec Google est indisponible pour le moment.", checkingProviders: "Vérification des options de connexion…", retryProviders: "Réessayer les options de connexion", passwordHint: "Utilisez au moins 8 caractères."
  },
  es: {
    slides: [
      { title: "Una forma más tranquila de coordinar la crianza", body: "Comunícate con cuidado, incluso en momentos difíciles." },
      { title: "Haz una pausa antes de enviar", body: "Revisa tus palabras y elige una forma más clara de avanzar." },
      { title: "Organiza los planes de crianza", body: "Mensajes, horarios y registros importantes permanecen en un espacio seguro." }
    ],
    next: "Siguiente", skip: "Omitir", start: "Empezar", create: "Crear cuenta", signIn: "Iniciar sesión", or: "o",
    createTitle: "Crea tu cuenta de PeacePad", signInTitle: "Te damos la bienvenida", email: "Correo", password: "Contraseña",
    createAction: "Crear cuenta", signInAction: "Iniciar sesión", working: "Espera…", existing: "¿Ya tienes una cuenta?",
    newHere: "¿Eres nuevo en PeacePad?", apple: "Continuar con Apple", google: "Continuar con Google", confirmTitle: "Revisa tu correo",
    confirmBody: "Te enviamos un enlace de confirmación seguro. Ábrelo en este iPhone para terminar.",
    forgot: "¿Olvidaste la contraseña?", resetSent: "Las instrucciones para restablecerla están en camino.",
    resetTitle: "Elige una contraseña nueva", resetBody: "Usa al menos 8 caracteres para tu nueva contraseña de PeacePad.",
    newPassword: "Contraseña nueva", updatePassword: "Guardar contraseña nueva",
    legal: "Al continuar, aceptas los Términos y reconoces la Política de privacidad.",
    terms: "Términos", privacy: "Privacidad", unavailable: "PeacePad no pudo completar la solicitud. Inténtalo de nuevo.",
    invalidEmail: "Ingresa una dirección de correo válida.", serviceUnavailable: "El inicio de sesión de PeacePad no está disponible temporalmente. Inténtalo de nuevo pronto.",
    invalidCredentials: "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.", confirmEmailFirst: "Confirma tu correo antes de iniciar sesión.",
    appleUnavailable: "Iniciar sesión con Apple no está disponible ahora.", googleUnavailable: "Iniciar sesión con Google no está disponible ahora.", checkingProviders: "Comprobando opciones de inicio de sesión…", retryProviders: "Reintentar opciones de inicio de sesión", passwordHint: "Usa al menos 8 caracteres."
  }
} as const;

function localized(locale: SupportedLocale) {
  return copy[locale] ?? copy.en;
}

type AuthStrings = ReturnType<typeof localized>;

function authFailureMessage(cause: unknown, strings: AuthStrings, provider?: "apple" | "google"): string {
  const detail = cause && typeof cause === "object"
    ? `${"code" in cause ? String(cause.code) : ""} ${"message" in cause ? String(cause.message) : ""}`
    : cause instanceof Error ? cause.message : String(cause ?? "");
  if (/invalid login credentials/i.test(detail)) return strings.invalidCredentials;
  if (/email not confirmed/i.test(detail)) return strings.confirmEmailFirst;
  if (/invalid.*email|email.*invalid/i.test(detail)) return strings.invalidEmail;
  if (/invalid.*api.?key|unauthorized|jwt|network request failed|fetch failed/i.test(detail)) return strings.serviceUnavailable;
  if (provider === "apple") return strings.appleUnavailable;
  if (provider === "google") return strings.googleUnavailable;
  return strings.unavailable;
}

function reportAuthFailure(stage: "password" | "apple" | "google" | "reset" | "update-password", cause: unknown) {
  const status = cause && typeof cause === "object" && "status" in cause ? Number(cause.status) || undefined : undefined;
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code).slice(0, 80) : "unknown";
  console.warn(`[PeacePadAuth] ${stage} failed`, { code, status });
}

type AuthEnvironmentNotice = Readonly<{
  label: string;
  body: string;
  labelTestID?: string;
}>;

export function PublicOnboardingAuth({ environmentNotice }: { environmentNotice?: AuthEnvironmentNotice } = {}) {
  const { locale } = useOptionalLocalization();
  const auth = useSupabaseSession();
  const capabilities = useAuthCapabilities();
  const strings = localized(locale);
  const emailSignInEnabled = capabilities.email.available;
  const googleSignInEnabled = capabilities.google.available;
  const [restoring, setRestoring] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [mode, setMode] = useState<"create" | "sign-in">("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const passwordInput = useRef<TextInput>(null);
  const submissionInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(ONBOARDING_KEY).then((value) => {
      if (active) setIntroComplete(value === "true");
    }).catch(() => undefined).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  const finishIntro = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true", { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    setIntroComplete(true);
  };

  const submit = async () => {
    const normalizedEmail = email.trim();
    if (busy || submissionInFlight.current || !emailSignInEnabled || !normalizedEmail || password.length < 8) return;
    submissionInFlight.current = true;
    setBusy(true); setError(undefined); setMessage(undefined);
    try {
      if (mode === "create") {
        const result = await auth.signUpWithPassword(normalizedEmail, password);
        if (result.confirmationRequired) setMessage(strings.confirmBody);
      } else {
        await auth.signInWithPassword(normalizedEmail, password);
      }
    } catch (cause) {
      reportAuthFailure("password", cause);
      setError(authFailureMessage(cause, strings));
    } finally { submissionInFlight.current = false; setBusy(false); }
  };

  const signInWithApple = async () => {
    if (busy || !capabilities.apple.available) return;
    setBusy(true); setError(undefined); setMessage(undefined);
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        nonce: hashedNonce,
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL]
      });
      if (!credential.identityToken) throw new Error("Apple did not return an identity token.");
      await auth.signInWithApple(credential.identityToken, rawNonce, credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ") || undefined
        : undefined);
    } catch (cause) {
      if ((cause as { code?: string })?.code !== "ERR_REQUEST_CANCELED") {
        reportAuthFailure("apple", cause);
        setError(authFailureMessage(cause, strings, "apple"));
      }
    } finally { setBusy(false); }
  };

  const signInWithGoogle = async () => {
    if (busy || !capabilities.google.available) return;
    setBusy(true); setError(undefined); setMessage(undefined);
    try {
      const identityToken = await requestGoogleIdentityToken();
      if (identityToken) await auth.signInWithGoogle(identityToken);
    } catch (cause) {
      reportAuthFailure("google", cause);
      setError(authFailureMessage(cause, strings, "google"));
    } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    if (busy || !emailSignInEnabled || !email.trim()) return;
    setBusy(true); setError(undefined); setMessage(undefined);
    try {
      await auth.sendPasswordReset(email.trim());
      setMessage(strings.resetSent);
    } catch (cause) { reportAuthFailure("reset", cause); setError(authFailureMessage(cause, strings)); }
    finally { setBusy(false); }
  };

  const updatePassword = async () => {
    if (busy || newPassword.length < 8) return;
    setBusy(true); setError(undefined); setMessage(undefined);
    try {
      await auth.updatePassword(newPassword);
    } catch (cause) { reportAuthFailure("update-password", cause); setError(authFailureMessage(cause, strings)); }
    finally { setBusy(false); }
  };

  if (auth.authIntent === "password-recovery") {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.auth} keyboardShouldPersistTaps="handled">
          <View style={styles.logoRow}><Image source={require("../../assets/icon-production.png")} style={styles.logo} /><Text style={styles.brand}>PeacePad</Text></View>
          {environmentNotice ? <EnvironmentNotice notice={environmentNotice} /> : null}
          <AccessibleHeading style={styles.title}>{strings.resetTitle}</AccessibleHeading>
          <Text style={styles.body}>{strings.resetBody}</Text>
          <TextInput accessibilityLabel={strings.newPassword} autoComplete="new-password" onChangeText={setNewPassword} onSubmitEditing={() => void updatePassword()} placeholder={strings.newPassword} returnKeyType="done" secureTextEntry style={styles.input} textContentType="newPassword" value={newPassword} />
          <LabButton disabled={busy || newPassword.length < 8} label={busy ? strings.working : strings.updatePassword} onPress={() => void updatePassword()} />
          {error || auth.error ? <Text accessibilityRole="alert" style={styles.error}>{error ?? auth.error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (restoring) return <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>;

  if (!introComplete) {
    return <PublicOnboardingSlides onComplete={finishIntro} />;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
      <ScrollView contentContainerStyle={styles.auth} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}><Image source={require("../../assets/icon-production.png")} style={styles.logo} /><Text style={styles.brand}>PeacePad</Text></View>
        {environmentNotice ? <EnvironmentNotice notice={environmentNotice} /> : null}
        <AccessibleHeading style={styles.title}>{mode === "create" ? strings.createTitle : strings.signInTitle}</AccessibleHeading>
        {capabilities.apple.available ? <AppleAuthentication.AppleAuthenticationButton
          accessibilityLabel={strings.apple}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          buttonType={mode === "create" ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          cornerRadius={24}
          onPress={() => void signInWithApple()}
          style={styles.appleButton}
        /> : null}
        {googleSignInEnabled ? <LabButton disabled={busy} label={strings.google} onPress={() => void signInWithGoogle()} /> : null}
        {capabilities.status === "loading" ? <Text accessibilityLiveRegion="polite" style={styles.providerStatus}>{strings.checkingProviders}</Text> : null}
        {capabilities.status === "error" ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void capabilities.refresh()}><Text style={styles.link}>{strings.retryProviders}</Text></Pressable> : null}
        {capabilities.google.backend === "disabled" && capabilities.google.nativeAvailable && capabilities.google.appConfigured ? <Text accessibilityRole="alert" style={styles.providerStatus}>{strings.googleUnavailable}</Text> : null}
        {capabilities.apple.backend === "disabled" && capabilities.apple.nativeAvailable && capabilities.apple.appConfigured ? <Text accessibilityRole="alert" style={styles.providerStatus}>{strings.appleUnavailable}</Text> : null}
        {capabilities.apple.available || googleSignInEnabled ? <Text style={styles.or}>{strings.or}</Text> : null}
        <View style={styles.field}><Text style={styles.inputLabel}>{strings.email}</Text><TextInput accessibilityLabel={strings.email} autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} onSubmitEditing={() => passwordInput.current?.focus()} placeholder={strings.email} placeholderTextColor={colors.muted} returnKeyType="next" style={styles.input} textContentType="emailAddress" value={email} /></View>
        <View style={styles.field}><Text style={styles.inputLabel}>{strings.password}</Text><TextInput accessibilityLabel={strings.password} autoComplete={mode === "create" ? "new-password" : "current-password"} onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder={strings.password} placeholderTextColor={colors.muted} ref={passwordInput} returnKeyType="done" secureTextEntry style={styles.input} textContentType={mode === "create" ? "newPassword" : "password"} value={password} /></View>
        {mode === "create" ? <Text style={styles.hint}>{strings.passwordHint}</Text> : null}
        <LabButton disabled={busy || !emailSignInEnabled || !email.trim() || password.length < 8} label={busy ? strings.working : mode === "create" ? strings.createAction : strings.signInAction} onPress={() => void submit()} />
        {capabilities.email.backend === "disabled" ? <Text accessibilityRole="alert" style={styles.providerStatus}>{strings.serviceUnavailable}</Text> : null}
        {mode === "sign-in" ? <Pressable accessibilityRole="button" disabled={busy || !emailSignInEnabled || !email.trim()} onPress={() => void resetPassword()}><Text style={styles.link}>{strings.forgot}</Text></Pressable> : null}
        {message ? <View accessibilityRole="alert" style={styles.success}><Text style={styles.successTitle}>{mode === "create" ? strings.confirmTitle : message}</Text>{mode === "create" ? <Text style={styles.body}>{message}</Text> : null}</View> : null}
        {error || auth.error ? <Text accessibilityRole="alert" style={styles.error}>{error ?? auth.error}</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => { setMode(mode === "create" ? "sign-in" : "create"); setError(undefined); setMessage(undefined); }}>
          <Text style={styles.switch}>{mode === "create" ? strings.existing : strings.newHere} <Text style={styles.switchAction}>{mode === "create" ? strings.signIn : strings.create}</Text></Text>
        </Pressable>
        <Text style={styles.legal}>{strings.legal}</Text>
        <View style={styles.legalLinks}>
          <Text accessibilityRole="link" onPress={() => Linking.openURL("https://peacepad.ca/terms")} style={styles.link}>{strings.terms}</Text>
          <Text accessibilityRole="link" onPress={() => Linking.openURL("https://peacepad.ca/privacy")} style={styles.link}>{strings.privacy}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EnvironmentNotice({ notice }: { notice: AuthEnvironmentNotice }) {
  return (
    <View accessibilityRole="summary" style={styles.environmentNotice}>
      <Text testID={notice.labelTestID} style={styles.environmentNoticeLabel}>{notice.label}</Text>
      <Text style={styles.environmentNoticeBody}>{notice.body}</Text>
    </View>
  );
}

export function PublicOnboardingSlides({ compact = false, onComplete }: { compact?: boolean; onComplete: () => void | Promise<void> }) {
  const { locale } = useOptionalLocalization();
  const strings = localized(locale);
  const [slide, setSlide] = useState(0);
  const current = strings.slides[slide];
  return (
    <View style={[styles.intro, compact ? styles.introCompact : null]}>
      <Image accessible={false} accessibilityIgnoresInvertColors source={slideImages[slide]} style={compact ? styles.heroCompact : styles.hero} />
      <View style={[styles.introCopy, compact ? styles.introCopyCompact : null]}>
        <Text style={styles.brand}>PeacePad</Text>
        <AccessibleHeading style={styles.title}>{current.title}</AccessibleHeading>
        <Text style={styles.body}>{current.body}</Text>
        <View accessibilityLabel={`${slide + 1} of ${strings.slides.length}`} style={styles.dots}>
          {strings.slides.map((_, index) => <View key={index} style={[styles.dot, index === slide ? styles.dotActive : null]} />)}
        </View>
        <LabButton label={slide === strings.slides.length - 1 ? strings.start : strings.next} onPress={() => {
          if (slide === strings.slides.length - 1) void onComplete(); else setSlide((value) => value + 1);
        }} />
        {slide < strings.slides.length - 1 ? <Pressable accessibilityRole="button" onPress={() => void onComplete()}><Text style={styles.link}>{strings.skip}</Text></Pressable> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: { backgroundColor: colors.background, flex: 1 },
  center: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" },
  intro: { backgroundColor: "#FFF8F2", flex: 1 },
  introCompact: { borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  hero: { borderBottomLeftRadius: 42, borderBottomRightRadius: 42, height: "45%", resizeMode: "cover", width: "100%" },
  heroCompact: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, height: 220, resizeMode: "cover", width: "100%" },
  introCopy: { backgroundColor: "#FFF8F2", flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl },
  introCopyCompact: { padding: spacing.lg },
  auth: { backgroundColor: "#FFF8F2", flexGrow: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl },
  logoRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  logo: { borderRadius: 16, height: 48, width: 48 },
  brand: { color: colors.accent, fontSize: 25, fontWeight: "900", letterSpacing: 0.2 },
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  input: { backgroundColor: colors.surface, borderColor: "#E7C8BD", borderRadius: 18, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 54, padding: spacing.md },
  field: { gap: spacing.xs },
  inputLabel: { ...typography.caption, color: colors.text, fontWeight: "700" },
  hint: { ...typography.caption, color: colors.muted },
  providerStatus: { ...typography.caption, color: colors.muted, textAlign: "center" },
  link: { ...typography.body, color: colors.brand, fontWeight: "700", textAlign: "center" },
  dots: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 24 },
  dot: { backgroundColor: colors.border, borderRadius: 4, height: 8, width: 8 },
  dotActive: { backgroundColor: colors.coral, width: 24 },
  appleButton: { height: 52, width: "100%" },
  or: { color: colors.muted, textAlign: "center" },
  error: { color: colors.dangerText, fontSize: 14 },
  success: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 14, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  successTitle: { color: colors.successText, fontSize: 16, fontWeight: "700" },
  environmentNotice: { backgroundColor: colors.successSurface, borderColor: colors.successBorder, borderRadius: 16, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  environmentNoticeLabel: { ...typography.caption, color: colors.successText, fontWeight: "800", textTransform: "uppercase" },
  environmentNoticeBody: { ...typography.body, color: colors.text },
  switch: { color: colors.muted, textAlign: "center" },
  switchAction: { color: colors.brand, fontWeight: "700" },
  legal: { ...typography.caption, color: colors.muted, textAlign: "center" },
  legalLinks: { flexDirection: "row", gap: spacing.lg, justifyContent: "center" }
});
