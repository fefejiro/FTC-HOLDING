import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type {
  DevicePushRegistration,
  PeacePadCoordinationApi
} from "../api/CoordinationApi";
import { createWriteContext } from "../domain/v2";
import type { CoordinationRuntime } from "../coordination/CoordinationState";

const INSTALLATION_KEY = "peacepad.v2.device.installation";
const REGISTRATION_KEY = "peacepad.v2.device.push-registration";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DeviceNotificationState = "enabled" | "denied" | "unavailable" | "not-enabled";

type StoredRegistration = Readonly<{
  identityId: string;
  registrationId: string;
  version: number;
}>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

function parseStoredRegistration(raw: string | null): StoredRegistration | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<StoredRegistration>;
    return typeof value.identityId === "string"
      && UUID_PATTERN.test(value.identityId)
      && typeof value.registrationId === "string"
      && UUID_PATTERN.test(value.registrationId)
      && Number.isInteger(value.version)
      && (value.version ?? 0) > 0
      ? value as StoredRegistration
      : undefined;
  } catch {
    return undefined;
  }
}

async function installationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(INSTALLATION_KEY);
  if (existing && UUID_PATTERN.test(existing)) return existing;
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(INSTALLATION_KEY, created, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  return created;
}

function appId(): DevicePushRegistration["appId"] | undefined {
  const configured = Platform.OS === "ios"
    ? Constants.expoConfig?.ios?.bundleIdentifier
    : Constants.expoConfig?.android?.package;
  return configured === "ca.peacepad.family" || configured === "ca.peacepad.nextnative.lab"
    ? configured
    : undefined;
}

function projectId(): string | undefined {
  const value = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : undefined;
}

function context(runtime: CoordinationRuntime, expectedVersion: number | null, action: string) {
  return createWriteContext({
    actor: { identityId: runtime.actorIdentityId, sessionId: runtime.sessionId },
    expectedVersion,
    idempotencyKey: `${action}-${Date.now().toString(36)}-${Crypto.randomUUID()}`,
    region: runtime.region
  });
}

export async function currentDeviceNotificationState(identityId: string): Promise<DeviceNotificationState> {
  if (!Device.isDevice || !["ios", "android"].includes(Platform.OS)) return "unavailable";
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status === "denied") return "denied";
  const stored = parseStoredRegistration(await SecureStore.getItemAsync(REGISTRATION_KEY));
  return permission.status === "granted" && stored?.identityId === identityId ? "enabled" : "not-enabled";
}

export async function enableDeviceNotifications(
  api: PeacePadCoordinationApi,
  runtime: CoordinationRuntime
): Promise<DeviceNotificationState> {
  if (!Device.isDevice || (Platform.OS !== "ios" && Platform.OS !== "android")) return "unavailable";
  const configuredAppId = appId();
  const easProjectId = projectId();
  if (!configuredAppId || !easProjectId) return "unavailable";

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status === "undetermined") permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return "denied";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("peacepad-calls", {
      name: "PeacePad calls",
      importance: Notifications.AndroidImportance.MAX,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      sound: "default",
      vibrationPattern: [0, 250, 150, 250]
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })).data;
  const result = await api.registerDevicePush({
    installationId: await installationId(),
    platform: Platform.OS,
    transport: "expo",
    appId: configuredAppId,
    token
  }, context(runtime, null, "device-push-register"));
  await SecureStore.setItemAsync(REGISTRATION_KEY, JSON.stringify({
    identityId: runtime.actorIdentityId,
    registrationId: result.registrationId,
    version: result.version
  }), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return "enabled";
}

export async function disableDeviceNotifications(
  api: PeacePadCoordinationApi,
  runtime: CoordinationRuntime
): Promise<DeviceNotificationState> {
  const stored = parseStoredRegistration(await SecureStore.getItemAsync(REGISTRATION_KEY));
  if (!stored || stored.identityId !== runtime.actorIdentityId) {
    await SecureStore.deleteItemAsync(REGISTRATION_KEY);
    return "not-enabled";
  }
  await api.revokeDevicePush(
    stored.registrationId,
    context(runtime, stored.version, "device-push-revoke")
  );
  await SecureStore.deleteItemAsync(REGISTRATION_KEY);
  return "not-enabled";
}

export async function clearStaleDeviceNotificationReceipt(identityId?: string): Promise<void> {
  const stored = parseStoredRegistration(await SecureStore.getItemAsync(REGISTRATION_KEY));
  if (!stored || !identityId || stored.identityId === identityId) return;
  await SecureStore.deleteItemAsync(REGISTRATION_KEY);
}
