const {
  AndroidConfig,
  WarningAggregator,
  createRunOncePlugin,
  withInfoPlist,
} = require("expo/config-plugins");

const pkg = require("../package.json");

const MICROPHONE_USAGE =
  "PeacePad uses the microphone only when you choose a private audio or video call, voice note, or Coach voice conversation.";
const CAMERA_USAGE =
  "PeacePad uses the camera only when you choose a private video call or take a photo for a message or record.";

function withPeacePadAudioWebRTC(config) {
  config = withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSMicrophoneUsageDescription = MICROPHONE_USAGE;
    nextConfig.modResults.NSCameraUsageDescription = CAMERA_USAGE;
    nextConfig.modResults.UIBackgroundModes = [
      ...new Set([...(nextConfig.modResults.UIBackgroundModes || []), "audio", "remote-notification"]),
    ];
    return nextConfig;
  });

  if (!config.ios) config.ios = {};
  if (config.ios.bitcode != null && config.ios.bitcode !== false) {
    WarningAggregator.addWarningIOS(
      "ios.bitcode",
      "PeacePad audio WebRTC requires bitcode to be disabled for physical iOS devices.",
    );
  }
  config.ios.bitcode = false;

  return AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.INTERNET",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.RECORD_AUDIO",
    "android.permission.WAKE_LOCK",
    "android.permission.BLUETOOTH",
    "android.permission.CAMERA",
  ]);
}

module.exports = createRunOncePlugin(
  withPeacePadAudioWebRTC,
  "peacepad-audio-webrtc",
  pkg.version,
);
