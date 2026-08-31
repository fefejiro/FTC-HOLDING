jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined)
}));

jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
    type: "WIFI"
  }))
}));

jest.mock("expo-device", () => ({ isDevice: true }));

jest.mock("expo-audio", () => ({
  AudioModule: { requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })) },
  RecordingPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: jest.fn(async () => undefined),
  useAudioPlayer: jest.fn(() => ({ pause: jest.fn(), play: jest.fn(), seekTo: jest.fn(async () => undefined) })),
  useAudioPlayerStatus: jest.fn(() => ({ playing: false, currentTime: 0, duration: 0, isLoaded: true })),
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    stop: jest.fn(async () => undefined),
    uri: "file:///coach.m4a"
  })),
  useAudioRecorderState: jest.fn(() => ({ canRecord: true, durationMillis: 0, isRecording: false, url: null }))
}));

jest.mock("expo-speech", () => ({
  speak: jest.fn((_text: string, options?: { onDone?: () => void }) => options?.onDone?.()),
  stop: jest.fn(async () => undefined)
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      ios: { bundleIdentifier: "ca.peacepad.family" },
      android: { package: "ca.peacepad.family" },
      extra: { eas: { projectId: "10000000-0000-4000-8000-000000000010" } }
    },
    easConfig: { projectId: "10000000-0000-4000-8000-000000000010" }
  }
}));

jest.mock("expo-notifications", () => ({
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  getExpoPushTokenAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: "undetermined" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "denied" })),
  scheduleNotificationAsync: jest.fn(async () => "task-reminder-1"),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn()
}));

jest.mock("expo-apple-authentication", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  const AppleAuthenticationButton = ({ accessibilityLabel, onPress }: { accessibilityLabel?: string; onPress?: () => void }) => (
    React.createElement(Pressable, { accessibilityLabel, accessibilityRole: "button", onPress }, React.createElement(Text, null, accessibilityLabel))
  );
  return {
    AppleAuthenticationButton,
    AppleAuthenticationButtonStyle: { BLACK: 0, WHITE: 1, WHITE_OUTLINE: 2 },
    AppleAuthenticationButtonType: { CONTINUE: 0, SIGN_IN: 1, SIGN_UP: 2 },
    AppleAuthenticationScope: { EMAIL: 0, FULL_NAME: 1 },
    isAvailableAsync: jest.fn(async () => true),
    signInAsync: jest.fn()
  };
});

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(async () => "hashed-nonce"),
  randomUUID: jest.fn(() => "10000000-0000-4000-8000-000000000099")
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ type: "cancelled", data: null })),
    signOut: jest.fn(async () => null)
  },
  isSuccessResponse: (response: { type?: string }) => response.type === "success"
}));
