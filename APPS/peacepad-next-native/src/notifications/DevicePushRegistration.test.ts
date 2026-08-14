import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  clearStaleDeviceNotificationReceipt,
  currentDeviceNotificationState,
  disableDeviceNotifications,
  enableDeviceNotifications
} from "./DevicePushRegistration";

const identityId = "10000000-0000-4000-8000-000000000001";
const runtime = {
  actorIdentityId: identityId,
  identityVersion: 1,
  sessionId: "10000000-0000-4000-8000-000000000002",
  familyCircleId: "10000000-0000-4000-8000-000000000003",
  participantGrantId: "10000000-0000-4000-8000-000000000004",
  conversationId: "10000000-0000-4000-8000-000000000005",
  region: "ca" as const
};

describe("device push registration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Device, "isDevice", { configurable: true, value: true });
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: `ExpoPushToken[${"a".repeat(24)}]` });
  });

  it("registers only the provider token and stores a content-free receipt", async () => {
    const api = { registerDevicePush: jest.fn(async () => ({
      registrationId: "10000000-0000-4000-8000-000000000006",
      platform: "ios",
      transport: "expo",
      appId: "ca.peacepad.family",
      version: 1
    })) };

    await expect(enableDeviceNotifications(api as never, runtime)).resolves.toBe("enabled");
    expect(api.registerDevicePush).toHaveBeenCalledWith(expect.objectContaining({
      platform: "ios",
      transport: "expo",
      token: `ExpoPushToken[${"a".repeat(24)}]`
    }), expect.objectContaining({ region: "ca", expectedVersion: null }));
    const stored = (SecureStore.setItemAsync as jest.Mock).mock.calls.find(([key]) => key === "peacepad.v2.device.push-registration")?.[1];
    expect(stored).not.toContain("ExpoPushToken");
  });

  it("does not request or register after notification permission is denied", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
    const api = { registerDevicePush: jest.fn() };
    await expect(enableDeviceNotifications(api as never, runtime)).resolves.toBe("denied");
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(api.registerDevicePush).not.toHaveBeenCalled();
    await expect(currentDeviceNotificationState(identityId)).resolves.toBe("denied");
  });

  it("returns denied when an explicit permission request is refused", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
    const api = { registerDevicePush: jest.fn() };
    await expect(enableDeviceNotifications(api as never, runtime)).resolves.toBe("denied");
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(api.registerDevicePush).not.toHaveBeenCalled();
  });

  it("revokes the exact stored registration before removing its local receipt", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
      identityId,
      registrationId: "10000000-0000-4000-8000-000000000006",
      version: 3
    }));
    const api = { revokeDevicePush: jest.fn(async () => ({ status: "revoked" })) };
    await expect(disableDeviceNotifications(api as never, runtime)).resolves.toBe("not-enabled");
    expect(api.revokeDevicePush).toHaveBeenCalledWith(
      "10000000-0000-4000-8000-000000000006",
      expect.objectContaining({ expectedVersion: 3, region: "ca" })
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("peacepad.v2.device.push-registration");
  });

  it("reports physical-device permission and registration state without prompting", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
      identityId,
      registrationId: "10000000-0000-4000-8000-000000000006",
      version: 1
    }));
    await expect(currentDeviceNotificationState(identityId)).resolves.toBe("enabled");
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("configures the private Android call channel after explicit permission", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: "undetermined" });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
    const api = { registerDevicePush: jest.fn(async () => ({
      registrationId: "10000000-0000-4000-8000-000000000006",
      platform: "android",
      transport: "expo",
      appId: "ca.peacepad.family",
      version: 1
    })) };

    await expect(enableDeviceNotifications(api as never, runtime)).resolves.toBe("enabled");
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith("peacepad-calls", expect.objectContaining({
      importance: Notifications.AndroidImportance.MAX,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE
    }));
    expect(api.registerDevicePush).toHaveBeenCalledWith(expect.objectContaining({ platform: "android" }), expect.anything());
  });

  it("fails closed on unsupported runtimes and malformed local receipts", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    await expect(currentDeviceNotificationState(identityId)).resolves.toBe("unavailable");
    await expect(enableDeviceNotifications({} as never, runtime)).resolves.toBe("unavailable");

    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("{not-json");
    await expect(disableDeviceNotifications({} as never, runtime)).resolves.toBe("not-enabled");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("peacepad.v2.device.push-registration");
  });

  it("clears only a receipt belonging to another signed-in identity", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
      identityId,
      registrationId: "10000000-0000-4000-8000-000000000006",
      version: 1
    }));
    await clearStaleDeviceNotificationReceipt(identityId);
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    await clearStaleDeviceNotificationReceipt("20000000-0000-4000-8000-000000000001");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("peacepad.v2.device.push-registration");
  });

  it("does not revoke a registration receipt owned by a different identity", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify({
      identityId: "20000000-0000-4000-8000-000000000001",
      registrationId: "10000000-0000-4000-8000-000000000006",
      version: 1
    }));
    const api = { revokeDevicePush: jest.fn() };
    await expect(currentDeviceNotificationState(identityId)).resolves.toBe("not-enabled");
    await expect(disableDeviceNotifications(api as never, runtime)).resolves.toBe("not-enabled");
    expect(api.revokeDevicePush).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("peacepad.v2.device.push-registration");
  });
});
