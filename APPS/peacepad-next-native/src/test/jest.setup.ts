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
  randomUUID: jest.fn(() => "test-nonce")
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
