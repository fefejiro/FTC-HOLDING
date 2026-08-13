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
    "invite.permissionMessages": "Messages", "invite.permissionCalendar": "Calendar", "invite.permissionSharedRecords": "Shared records", "invite.permissionCalls": "Audio calls",
    "invite.permissionMessageWrite": "Send messages", "invite.permissionCalendarWrite": "Manage calendar events", "invite.familyBlocked": "This account is already connected to a family. Family switching is not available yet, so this invitation cannot be accepted here.",
    "invite.accepted": "Invitation accepted"
    ,"foundation.restoring": "Restoring PeacePad session", "foundation.checkingDevice": "Checking this device for a saved session...", "foundation.logo": "PeacePad conch logo",
    "foundation.secure": "Connected securely", "foundation.welcomeTitle": "A calmer way through hard co-parenting moments.",
    "foundation.welcomeBody": "Pause before you send, check how a message may land, and choose a clearer next step.", "foundation.try": "Try PeacePad",
    "foundation.existing": "Existing account", "foundation.continue": "Continue to PeacePad", "foundation.accountUnavailable": "Account sign-in is not available yet.",
    "foundation.backWelcome": "Back to welcome", "foundation.consentTitle": "Your choices come first",
    "foundation.consentBody": "Opening this screen creates no account or guest session. Required consent is stored only after the server creates your guest session.",
    "foundation.termsConsent": "I agree to the Terms", "foundation.privacyConsent": "I acknowledge the Privacy Policy", "foundation.aiConsent": "Optional AI-assisted rewrites",
    "foundation.aiConsentBody": "Off by default. Rule-based tone preview works without it.", "foundation.starting": "Starting...", "foundation.continueGuest": "Continue as guest",
    "foundation.back": "Back", "foundation.privacy": "Privacy", "foundation.terms": "Terms", "foundation.support": "Support",
    "foundation.restored": "Your private guest session was restored on this device.", "foundation.requiredConsent": "Accept the Terms and acknowledge the Privacy Policy first.",
    "foundation.guestReady": "Guest session ready. AI processing remains optional.", "foundation.sessionCleared": "This device session was cleared.",
    "foundation.requestError": "PeacePad could not complete that request. Try again.",
    "foundation.composeTitle": "Check your message before sending", "foundation.composeBody": "Review your wording before deciding what to send. PeacePad does not send this message to a co-parent.",
    "foundation.draftLabel": "Message draft", "foundation.draftPlaceholder": "Write a difficult message…", "foundation.checking": "Checking…", "foundation.checkMessage": "Check message",
    "foundation.previewResult": "Message preview result", "foundation.suggested": "Suggested wording: {suggestion}", "foundation.retryCheck": "Retry message check", "foundation.resetSession": "Reset this device session"
    ,"runtime.signInTitle": "Sign in to staging", "runtime.signInBody": "Use a fictional PeacePad staging account. Real family information is not permitted.",
    "runtime.regionCanada": "Canada staging", "runtime.regionUnitedStates": "United States staging",
    "runtime.regionSelectTitle": "Choose your data region", "runtime.regionSelectBody": "Choose where this fictional staging session is stored before signing in.",
    "runtime.regionChoiceHint": "Selects this device's regional staging service. You can choose again after signing out and reopening PeacePad.",
    "runtime.regionContinue": "Continue to {region}",
    "runtime.email": "Staging email", "runtime.emailPlaceholder": "Email", "runtime.password": "Staging password", "runtime.passwordPlaceholder": "Password",
    "runtime.signingIn": "Signing in...", "runtime.signIn": "Sign in", "runtime.chooseFamily": "Choose a family", "runtime.chooseFamilyBody": "Select the family space you want to open.",
    "runtime.familyOption": "{family} - {role}", "runtime.createJoin": "Create or join a family", "runtime.createJoinBody": "Use fictional staging information only. A connection is created only after an invitation is accepted.",
    "runtime.createFamilyTitle": "Create a family space", "runtime.familyName": "Family name", "runtime.createFamily": "Create family", "runtime.enterInvite": "Enter an invitation code",
    "runtime.codePlaceholder": "6-character code", "runtime.invitedAs": "Invited by {name} as {role}.", "runtime.declineInvite": "Decline invitation",
    "runtime.requestError": "PeacePad could not complete that request.", "runtime.loadingFamily": "Loading your family space", "runtime.restoringFamily": "Restoring messages, calendars, and preferences securely."
    ,"runtime.restoringSession": "Restoring your session", "runtime.checkingDevice": "Checking this device securely.", "runtime.sessionUnavailable": "Session unavailable",
    "runtime.restoreError": "PeacePad could not restore this session.", "runtime.opening": "Opening PeacePad", "runtime.loadingAuthorized": "Loading your authorized family space.",
    "runtime.unavailable": "PeacePad is unavailable", "runtime.logo": "PeacePad conch logo",
    "runtime.invalidCredentials": "Check the fictional staging email and password.", "runtime.signInUnavailable": "PeacePad staging sign-in is unavailable. Try again.",
    "runtime.sessionExpired": "Your staging session expired. Sign in again.", "runtime.signOutRemoteFailed": "This device was signed out, but the remote session could not be closed."
    ,"runtime.connectionReady": "{family} is ready. Share a single-use code, then check again after it is accepted.", "runtime.inviteExpiry": "Expires in 72 hours. Do not use real family information in staging.",
    "runtime.checkConnection": "Check connection"
    ,"production.signInTitle": "Sign in to PeacePad", "production.signInBody": "Use your PeacePad account. Your family information is stored in Canada.",
    "production.regionCanada": "Canada", "production.email": "Email", "production.password": "Password",
    "production.createJoinBody": "Create a private family space or connect after accepting an invitation.",
    "production.invalidCredentials": "Check your email and password.", "production.signInUnavailable": "PeacePad sign-in is unavailable. Try again.",
    "production.sessionExpired": "Your session expired. Sign in again.", "production.inviteExpiry": "Expires in 72 hours. Share this code only with the intended family member.",
    "production.signOutBody": "Remove this PeacePad session from this device.", "production.delete": "Delete account", "production.deleteBody": "Permanently remove your PeacePad account and access.",
    "production.deleteTitle": "Delete this account?", "production.deleteWarning": "This permanently deletes your PeacePad identity and revokes its family access. This cannot be undone."
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
    "invite.permissionMessages": "Messages", "invite.permissionCalendar": "Calendrier", "invite.permissionSharedRecords": "Dossiers partagés", "invite.permissionCalls": "Appels audio",
    "invite.permissionMessageWrite": "Envoyer des messages", "invite.permissionCalendarWrite": "Gérer les événements du calendrier", "invite.familyBlocked": "Ce compte est déjà lié à une famille. Le changement de famille n’est pas encore disponible; cette invitation ne peut donc pas être acceptée ici.",
    "invite.accepted": "Invitation acceptée"
    ,"foundation.restoring": "Restauration de la session PeacePad", "foundation.checkingDevice": "Recherche d’une session enregistrée sur cet appareil...", "foundation.logo": "Logo coquillage de PeacePad",
    "foundation.secure": "Connexion sécurisée", "foundation.welcomeTitle": "Une façon plus calme de traverser les moments difficiles de coparentalité.",
    "foundation.welcomeBody": "Faites une pause avant d’envoyer, vérifiez comment le message pourrait être reçu et choisissez une prochaine étape plus claire.", "foundation.try": "Essayer PeacePad",
    "foundation.existing": "Compte existant", "foundation.continue": "Continuer vers PeacePad", "foundation.accountUnavailable": "La connexion au compte n’est pas encore disponible.",
    "foundation.backWelcome": "Retour à l’accueil", "foundation.consentTitle": "Vos choix passent en premier",
    "foundation.consentBody": "L’ouverture de cet écran ne crée aucun compte ni aucune session invité. Le consentement requis est enregistré uniquement après la création de votre session invité par le serveur.",
    "foundation.termsConsent": "J’accepte les conditions d’utilisation", "foundation.privacyConsent": "Je reconnais avoir lu la politique de confidentialité", "foundation.aiConsent": "Réécritures facultatives assistées par IA",
    "foundation.aiConsentBody": "Désactivées par défaut. L’aperçu du ton fondé sur des règles fonctionne sans elles.", "foundation.starting": "Démarrage...", "foundation.continueGuest": "Continuer en tant qu’invité",
    "foundation.back": "Retour", "foundation.privacy": "Confidentialité", "foundation.terms": "Conditions", "foundation.support": "Soutien",
    "foundation.restored": "Votre session invité privée a été restaurée sur cet appareil.", "foundation.requiredConsent": "Acceptez les conditions et reconnaissez la politique de confidentialité d’abord.",
    "foundation.guestReady": "La session invité est prête. Le traitement par IA reste facultatif.", "foundation.sessionCleared": "La session de cet appareil a été effacée.",
    "foundation.requestError": "PeacePad n’a pas pu effectuer cette demande. Réessayez.",
    "foundation.composeTitle": "Vérifiez votre message avant de l’envoyer", "foundation.composeBody": "Relisez votre formulation avant de décider quoi envoyer. PeacePad n’envoie pas ce message à un coparent.",
    "foundation.draftLabel": "Brouillon du message", "foundation.draftPlaceholder": "Écrivez un message difficile…", "foundation.checking": "Vérification…", "foundation.checkMessage": "Vérifier le message",
    "foundation.previewResult": "Résultat de la vérification du message", "foundation.suggested": "Formulation suggérée : {suggestion}", "foundation.retryCheck": "Réessayer la vérification", "foundation.resetSession": "Réinitialiser la session de cet appareil"
    ,"runtime.signInTitle": "Connexion à l’environnement de test", "runtime.signInBody": "Utilisez un compte PeacePad de test fictif. Les véritables renseignements familiaux sont interdits.",
    "runtime.regionCanada": "Environnement de test au Canada", "runtime.regionUnitedStates": "Environnement de test aux États-Unis",
    "runtime.regionSelectTitle": "Choisissez votre région de données", "runtime.regionSelectBody": "Choisissez où cette session de test fictive sera stockée avant de vous connecter.",
    "runtime.regionChoiceHint": "Sélectionne le service de test régional de cet appareil. Vous pourrez choisir de nouveau après vous être déconnecté et avoir rouvert PeacePad.",
    "runtime.regionContinue": "Continuer vers {region}",
    "runtime.email": "Courriel de test", "runtime.emailPlaceholder": "Courriel", "runtime.password": "Mot de passe de test", "runtime.passwordPlaceholder": "Mot de passe",
    "runtime.signingIn": "Connexion...", "runtime.signIn": "Se connecter", "runtime.chooseFamily": "Choisir une famille", "runtime.chooseFamilyBody": "Sélectionnez l’espace familial à ouvrir.",
    "runtime.familyOption": "{family} - {role}", "runtime.createJoin": "Créer ou rejoindre une famille", "runtime.createJoinBody": "Utilisez uniquement des renseignements fictifs de test. Une connexion est créée seulement après l’acceptation d’une invitation.",
    "runtime.createFamilyTitle": "Créer un espace familial", "runtime.familyName": "Nom de la famille", "runtime.createFamily": "Créer la famille", "runtime.enterInvite": "Saisir un code d’invitation",
    "runtime.codePlaceholder": "Code à 6 caractères", "runtime.invitedAs": "Invitation de {name} comme {role}.", "runtime.declineInvite": "Refuser l’invitation",
    "runtime.requestError": "PeacePad n’a pas pu effectuer cette demande.", "runtime.loadingFamily": "Chargement de votre espace familial", "runtime.restoringFamily": "Restauration sécurisée des messages, calendriers et préférences."
    ,"runtime.restoringSession": "Restauration de votre session", "runtime.checkingDevice": "Vérification sécurisée de cet appareil.", "runtime.sessionUnavailable": "Session indisponible",
    "runtime.restoreError": "PeacePad n’a pas pu restaurer cette session.", "runtime.opening": "Ouverture de PeacePad", "runtime.loadingAuthorized": "Chargement de votre espace familial autorisé.",
    "runtime.unavailable": "PeacePad est indisponible", "runtime.logo": "Logo coquillage de PeacePad",
    "runtime.invalidCredentials": "Vérifiez l’adresse courriel et le mot de passe fictifs de test.", "runtime.signInUnavailable": "La connexion de test PeacePad est indisponible. Réessayez.",
    "runtime.sessionExpired": "Votre session de test a expiré. Reconnectez-vous.", "runtime.signOutRemoteFailed": "Cet appareil a été déconnecté, mais la session distante n’a pas pu être fermée."
    ,"runtime.connectionReady": "L’espace {family} est prêt. Partagez un code à usage unique, puis vérifiez de nouveau après son acceptation.", "runtime.inviteExpiry": "Expire dans 72 heures. N’utilisez aucune information familiale réelle dans l’environnement de test.",
    "runtime.checkConnection": "Vérifier la connexion"
    ,"production.signInTitle": "Se connecter à PeacePad", "production.signInBody": "Utilisez votre compte PeacePad. Vos renseignements familiaux sont stockés au Canada.",
    "production.regionCanada": "Canada", "production.email": "Courriel", "production.password": "Mot de passe",
    "production.createJoinBody": "Créez un espace familial privé ou connectez-vous après avoir accepté une invitation.",
    "production.invalidCredentials": "Vérifiez votre courriel et votre mot de passe.", "production.signInUnavailable": "La connexion à PeacePad est indisponible. Réessayez.",
    "production.sessionExpired": "Votre session a expiré. Reconnectez-vous.", "production.inviteExpiry": "Expire dans 72 heures. Partagez ce code uniquement avec le membre de la famille concerné.",
    "production.signOutBody": "Supprimer cette session PeacePad de cet appareil.", "production.delete": "Supprimer le compte", "production.deleteBody": "Supprimer définitivement votre compte PeacePad et son accès.",
    "production.deleteTitle": "Supprimer ce compte?", "production.deleteWarning": "Cette action supprime définitivement votre identité PeacePad et révoque son accès familial. Cette action est irréversible."
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
    "invite.permissionMessages": "Mensajes", "invite.permissionCalendar": "Calendario", "invite.permissionSharedRecords": "Registros compartidos", "invite.permissionCalls": "Llamadas de audio",
    "invite.permissionMessageWrite": "Enviar mensajes", "invite.permissionCalendarWrite": "Gestionar eventos del calendario", "invite.familyBlocked": "Esta cuenta ya está conectada a una familia. El cambio de familia aún no está disponible, por lo que esta invitación no se puede aceptar aquí.",
    "invite.accepted": "Invitación aceptada"
    ,"foundation.restoring": "Restaurando la sesión de PeacePad", "foundation.checkingDevice": "Buscando una sesión guardada en este dispositivo...", "foundation.logo": "Logotipo de caracola de PeacePad",
    "foundation.secure": "Conexión segura", "foundation.welcomeTitle": "Una forma más tranquila de afrontar momentos difíciles de crianza compartida.",
    "foundation.welcomeBody": "Haz una pausa antes de enviar, comprueba cómo podría recibirse el mensaje y elige un siguiente paso más claro.", "foundation.try": "Probar PeacePad",
    "foundation.existing": "Cuenta existente", "foundation.continue": "Continuar a PeacePad", "foundation.accountUnavailable": "El inicio de sesión de la cuenta aún no está disponible.",
    "foundation.backWelcome": "Volver a la bienvenida", "foundation.consentTitle": "Tus decisiones son lo primero",
    "foundation.consentBody": "Abrir esta pantalla no crea ninguna cuenta ni sesión de invitado. El consentimiento obligatorio solo se guarda después de que el servidor cree tu sesión de invitado.",
    "foundation.termsConsent": "Acepto los Términos", "foundation.privacyConsent": "Reconozco la Política de privacidad", "foundation.aiConsent": "Reescrituras opcionales asistidas por IA",
    "foundation.aiConsentBody": "Desactivadas de forma predeterminada. La vista previa del tono basada en reglas funciona sin ellas.", "foundation.starting": "Iniciando...", "foundation.continueGuest": "Continuar como invitado",
    "foundation.back": "Volver", "foundation.privacy": "Privacidad", "foundation.terms": "Términos", "foundation.support": "Ayuda",
    "foundation.restored": "Tu sesión privada de invitado se restauró en este dispositivo.", "foundation.requiredConsent": "Acepta los Términos y reconoce la Política de privacidad primero.",
    "foundation.guestReady": "La sesión de invitado está lista. El procesamiento con IA sigue siendo opcional.", "foundation.sessionCleared": "Se borró la sesión de este dispositivo.",
    "foundation.requestError": "PeacePad no pudo completar esa solicitud. Inténtalo de nuevo.",
    "foundation.composeTitle": "Revisa tu mensaje antes de enviarlo", "foundation.composeBody": "Revisa tus palabras antes de decidir qué enviar. PeacePad no envía este mensaje a la otra persona progenitora.",
    "foundation.draftLabel": "Borrador del mensaje", "foundation.draftPlaceholder": "Escribe un mensaje difícil…", "foundation.checking": "Revisando…", "foundation.checkMessage": "Revisar mensaje",
    "foundation.previewResult": "Resultado de la revisión del mensaje", "foundation.suggested": "Redacción sugerida: {suggestion}", "foundation.retryCheck": "Volver a intentar la revisión", "foundation.resetSession": "Restablecer la sesión de este dispositivo"
    ,"runtime.signInTitle": "Iniciar sesión en pruebas", "runtime.signInBody": "Usa una cuenta ficticia de pruebas de PeacePad. No se permite información familiar real.",
    "runtime.regionCanada": "Entorno de pruebas de Canadá", "runtime.regionUnitedStates": "Entorno de pruebas de Estados Unidos",
    "runtime.regionSelectTitle": "Elige tu región de datos", "runtime.regionSelectBody": "Elige dónde se guardará esta sesión ficticia de pruebas antes de iniciar sesión.",
    "runtime.regionChoiceHint": "Selecciona el servicio regional de pruebas de este dispositivo. Podrás elegir de nuevo después de cerrar sesión y volver a abrir PeacePad.",
    "runtime.regionContinue": "Continuar a {region}",
    "runtime.email": "Correo de pruebas", "runtime.emailPlaceholder": "Correo", "runtime.password": "Contraseña de pruebas", "runtime.passwordPlaceholder": "Contraseña",
    "runtime.signingIn": "Iniciando sesión...", "runtime.signIn": "Iniciar sesión", "runtime.chooseFamily": "Elegir una familia", "runtime.chooseFamilyBody": "Selecciona el espacio familiar que quieres abrir.",
    "runtime.familyOption": "{family} - {role}", "runtime.createJoin": "Crear o unirse a una familia", "runtime.createJoinBody": "Usa únicamente información ficticia de pruebas. Solo se crea una conexión después de aceptar una invitación.",
    "runtime.createFamilyTitle": "Crear un espacio familiar", "runtime.familyName": "Nombre de la familia", "runtime.createFamily": "Crear familia", "runtime.enterInvite": "Introducir un código de invitación",
    "runtime.codePlaceholder": "Código de 6 caracteres", "runtime.invitedAs": "Invitación de {name} como {role}.", "runtime.declineInvite": "Rechazar invitación",
    "runtime.requestError": "PeacePad no pudo completar esa solicitud.", "runtime.loadingFamily": "Cargando tu espacio familiar", "runtime.restoringFamily": "Restaurando mensajes, calendarios y preferencias de forma segura."
    ,"runtime.restoringSession": "Restaurando tu sesión", "runtime.checkingDevice": "Comprobando este dispositivo de forma segura.", "runtime.sessionUnavailable": "Sesión no disponible",
    "runtime.restoreError": "PeacePad no pudo restaurar esta sesión.", "runtime.opening": "Abriendo PeacePad", "runtime.loadingAuthorized": "Cargando tu espacio familiar autorizado.",
    "runtime.unavailable": "PeacePad no está disponible", "runtime.logo": "Logotipo de caracola de PeacePad",
    "runtime.invalidCredentials": "Comprueba el correo y la contraseña ficticios de pruebas.", "runtime.signInUnavailable": "El inicio de sesión de pruebas de PeacePad no está disponible. Inténtalo de nuevo.",
    "runtime.sessionExpired": "Tu sesión de pruebas caducó. Vuelve a iniciar sesión.", "runtime.signOutRemoteFailed": "Se cerró la sesión en este dispositivo, pero no se pudo cerrar la sesión remota."
    ,"runtime.connectionReady": "El espacio {family} está listo. Comparte un código de un solo uso y vuelve a comprobar después de que se acepte.", "runtime.inviteExpiry": "Caduca en 72 horas. No uses información familiar real en el entorno de pruebas.",
    "runtime.checkConnection": "Comprobar conexión"
    ,"production.signInTitle": "Iniciar sesión en PeacePad", "production.signInBody": "Usa tu cuenta de PeacePad. Tu información familiar se almacena en Canadá.",
    "production.regionCanada": "Canadá", "production.email": "Correo", "production.password": "Contraseña",
    "production.createJoinBody": "Crea un espacio familiar privado o conéctate después de aceptar una invitación.",
    "production.invalidCredentials": "Comprueba tu correo y contraseña.", "production.signInUnavailable": "El inicio de sesión de PeacePad no está disponible. Inténtalo de nuevo.",
    "production.sessionExpired": "Tu sesión caducó. Vuelve a iniciar sesión.", "production.inviteExpiry": "Caduca en 72 horas. Comparte este código solo con el familiar previsto.",
    "production.signOutBody": "Eliminar esta sesión de PeacePad de este dispositivo.", "production.delete": "Eliminar cuenta", "production.deleteBody": "Eliminar permanentemente tu cuenta de PeacePad y su acceso.",
    "production.deleteTitle": "¿Eliminar esta cuenta?", "production.deleteWarning": "Esto elimina permanentemente tu identidad de PeacePad y revoca su acceso familiar. No se puede deshacer."
  }
} as const;

export type MessageKey = keyof typeof messages.en;

const productionKeyOverrides: Readonly<Partial<Record<MessageKey, MessageKey>>> = {
  "account.signOutBody": "production.signOutBody",
  "account.delete": "production.delete",
  "account.deleteBody": "production.deleteBody",
  "account.deleteTitle": "production.deleteTitle",
  "account.deleteWarning": "production.deleteWarning",
  "runtime.signInTitle": "production.signInTitle",
  "runtime.signInBody": "production.signInBody",
  "runtime.regionCanada": "production.regionCanada",
  "runtime.email": "production.email",
  "runtime.password": "production.password",
  "runtime.createJoinBody": "production.createJoinBody",
  "runtime.invalidCredentials": "production.invalidCredentials",
  "runtime.signInUnavailable": "production.signInUnavailable",
  "runtime.sessionExpired": "production.sessionExpired",
  "runtime.inviteExpiry": "production.inviteExpiry"
};

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
const defaultLocalization: LocalizationValue = { locale: "en", setLocale: async () => undefined, t: (key, values) => translate("en", key, values) };

export function LocalizationProvider({ children, initialLocale, production = false, store = secureLocaleStore }: { children: ReactNode; initialLocale?: string; production?: boolean; store?: LocaleStore }) {
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
  const value = useMemo<LocalizationValue>(() => ({
    locale,
    setLocale,
    t: (key, values) => translate(locale, production ? productionKeyOverrides[key] ?? key : key, values)
  }), [locale, production, setLocale]);
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationValue {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error("useLocalization must be used within LocalizationProvider");
  return value;
}

export function useOptionalLocalization(): LocalizationValue {
  return useContext(LocalizationContext) ?? defaultLocalization;
}
